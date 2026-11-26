(() => {
  const root = (window.YTSync = window.YTSync || {});

  function createWsClient(handlers) {
    const { CONFIG } = root;
    let ws = null;
    let roomCode = null;
    let currentClientId = null;
    let intentionalClose = false;
    let backgroundSuspended = false;
    let reconnectTimer = null;
    let heartbeatTimer = null;
    let probeTimer = null;
    let connectTimer = null;
    let pendingProbeCb = null;
    let reconnectAttempt = 0;
    let smoothedDelaySec = 0;
    let lastAckAt = 0;
    let connectStartedAt = 0;

    function clearTimers() {
      clearInterval(heartbeatTimer);
      clearTimeout(reconnectTimer);
      clearTimeout(probeTimer);
      clearTimeout(connectTimer);
      heartbeatTimer = null;
      reconnectTimer = null;
      probeTimer = null;
      connectTimer = null;
      pendingProbeCb = null;
    }

    function sendHeartbeat(socket) {
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;
      const snapshot = handlers.getHeartbeatPayload?.() || {};
      try {
        socket.send(
          JSON.stringify({
            type: "HEARTBEAT",
            t: Date.now(),
            delay: smoothedDelaySec,
            ...snapshot,
          })
        );
        return true;
      } catch {
        return false;
      }
    }

    function connect(code, clientId) {
      intentionalClose = false;
      backgroundSuspended = false;
      connectStartedAt = Date.now();
      roomCode = code;
      if (clientId) currentClientId = clientId;
      clearTimers();
      if (ws) {
        const old = ws;
        ws = null;
        try {
          old.close();
        } catch {
          // Ignore close errors.
        }
      }

      const qs = currentClientId ? `?clientId=${encodeURIComponent(currentClientId)}` : "";
      const url = `${CONFIG.SERVER_WS}/room/${encodeURIComponent(roomCode)}/ws${qs}`;
      const socket = new WebSocket(url);
      ws = socket;

      connectTimer = setTimeout(() => {
        if (ws !== socket || socket.readyState !== WebSocket.CONNECTING) return;
        connectTimer = null;
        clearTimers();
        ws = null;
        handlers.onSocketEvent?.({ ev: "connect_timeout" });
        try {
          socket.close();
        } catch {
          // Ignore close errors.
        }
        if (!intentionalClose && !backgroundSuspended && roomCode) {
          const backoff = Math.min(8000, 1000 * Math.pow(2, reconnectAttempt));
          reconnectAttempt++;
          handlers.onReconnecting?.();
          reconnectTimer = setTimeout(() => {
            if (!intentionalClose && !backgroundSuspended && roomCode) {
              connect(roomCode, currentClientId);
            }
          }, backoff);
        }
      }, CONFIG.CONNECT_TIMEOUT_MS || 8000);

      socket.addEventListener("open", () => {
        if (ws !== socket) return;
        clearTimeout(connectTimer);
        connectTimer = null;
        reconnectAttempt = 0;
        lastAckAt = Date.now();
        handlers.onSocketEvent?.({ ev: "open" });
        handlers.onOpen?.();

        const intervalMs = CONFIG.HEARTBEAT_INTERVAL_MS || CONFIG.PING_INTERVAL_MS || 5000;
        heartbeatTimer = setInterval(() => {
          if (ws !== socket || socket.readyState !== WebSocket.OPEN) return;
          if (
            document.visibilityState === "visible" &&
            !backgroundSuspended &&
            lastAckAt > 0 &&
            Date.now() - lastAckAt > (CONFIG.PONG_WATCHDOG_MS || 12000)
          ) {
            // Half-open TCP watchdog: force close so reconnect kicks in.
            handlers.onSocketEvent?.({ ev: "watchdog_timeout" });
            try {
              socket.close(4000, "WATCHDOG_TIMEOUT");
            } catch {
              // Ignore close errors.
            }
            return;
          }
          sendHeartbeat(socket);
        }, intervalMs);
      });

      socket.addEventListener("message", (ev) => {
        if (ws !== socket) return;
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }

        lastAckAt = Date.now();

        if ((msg.type === "HEARTBEAT_ACK" || msg.type === "PONG") && typeof msg.t === "number") {
          const rttMs = Math.max(0, Date.now() - msg.t);
          const sampleSec = rttMs / 2000;
          smoothedDelaySec =
            smoothedDelaySec > 0
              ? smoothedDelaySec * 0.7 + sampleSec * 0.3
              : sampleSec;
          handlers.onLatency?.(Math.round(rttMs));

          if (probeTimer) {
            clearTimeout(probeTimer);
            probeTimer = null;
            const cb = pendingProbeCb;
            pendingProbeCb = null;
            cb?.();
            handlers.onProbeAlive?.();
          }

          handlers.onHeartbeatAck?.(msg);
          return;
        }

        handlers.onMessage?.(msg);
      });

      socket.addEventListener("close", (ev) => {
        if (ws !== socket) return;
        clearTimers();
        ws = null;
        handlers.onSocketEvent?.({ ev: "close", code: ev.code, reason: ev.reason });

        if (ev.code === 4001 || ev.reason === "ROOM_FULL") {
          intentionalClose = true;
          handlers.onRoomFull?.();
          return;
        }

        if (ev.code === 4002 || ev.reason === "EVICTED") {
          intentionalClose = true;
          handlers.onEvicted?.();
          return;
        }

        if (intentionalClose) {
          handlers.onClose?.();
          return;
        }

        if (backgroundSuspended) {
          // Wait quietly until returning to foreground before reconnecting.
          return;
        }

        const backoff = Math.min(8000, 1000 * Math.pow(2, reconnectAttempt));
        reconnectAttempt++;
        handlers.onReconnecting?.();
        reconnectTimer = setTimeout(() => {
          if (!intentionalClose && !backgroundSuspended && roomCode) {
            connect(roomCode, currentClientId);
          }
        }, backoff);
      });

      socket.addEventListener("error", () => {
        // Let close listener trigger reconnect cleanly.
      });
    }

    function send(payload) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        return true;
      }
      return false;
    }

    function suspendForPageCache() {
      backgroundSuspended = true;
      clearTimers();
      if (ws) {
        const current = ws;
        ws = null;
        try {
          current.close(3002, "Page cache suspend");
        } catch {
          // Ignore close errors.
        }
      }
    }

    function disconnect() {
      intentionalClose = true;
      backgroundSuspended = false;
      clearTimers();
      if (ws) {
        const current = ws;
        ws = null;
        if (current.readyState === WebSocket.OPEN) {
          try {
            current.send(JSON.stringify({ type: "LEAVE" }));
          } catch {
            // Ignore send error.
          }
        }
        try {
          current.close(1000, "Client disconnect");
        } catch {
          // Ignore errors.
        }
      }
      handlers.onClose?.();
    }

    function isConnected() {
      return Boolean(ws && ws.readyState === WebSocket.OPEN);
    }

    function isConnectingOrConnected() {
      return Boolean(
        ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
      );
    }

    function setBackgroundSuspended(val) {
      backgroundSuspended = Boolean(val);
      if (backgroundSuspended) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function probeOrReconnect({ onAlive, forceReconnect = false } = {}) {
      if (intentionalClose || !roomCode) return "idle";
      clearTimeout(probeTimer);
      probeTimer = null;
      pendingProbeCb = null;

      if (
        !forceReconnect &&
        ws &&
        ws.readyState === WebSocket.CONNECTING &&
        Date.now() - connectStartedAt < 6000
      ) {
        return "connecting";
      }

      if (forceReconnect || !ws || ws.readyState !== WebSocket.OPEN) {
        clearTimers();
        reconnectAttempt = 0;
        connect(roomCode, currentClientId);
        return "reconnecting";
      }

      if (!onAlive && lastAckAt > 0 && Date.now() - lastAckAt < 1500) {
        return "alive";
      }

      pendingProbeCb = onAlive || null;
      if (!sendHeartbeat(ws)) {
        pendingProbeCb = null;
        clearTimers();
        reconnectAttempt = 0;
        connect(roomCode, currentClientId);
        return "reconnecting";
      }
      probeTimer = setTimeout(() => {
        probeTimer = null;
        pendingProbeCb = null;
        clearTimers();
        reconnectAttempt = 0;
        connect(roomCode, currentClientId);
      }, CONFIG.PROBE_TIMEOUT_MS || 600);
      return "probing";
    }

    function reconnectNow() {
      if (intentionalClose || !roomCode) return false;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return false;
      }
      clearTimers();
      reconnectAttempt = 0;
      connect(roomCode, currentClientId);
      return true;
    }

    return {
      connect,
      send,
      disconnect,
      suspendForPageCache,
      reconnectNow,
      probeOrReconnect,
      setBackgroundSuspended,
      isConnected,
      isConnectingOrConnected,
    };
  }

  root.createWsClient = createWsClient;
})();
