(() => {
  if (window.__ytSyncMainInitialized) return;
  window.__ytSyncMainInitialized = true;

  const TAB_SYNC_KEY = "__ytSyncTabSession";
  const TAB_SESSION_TTL_MS = 6 * 60 * 60 * 1000;

  const root = (window.YTSync = window.YTSync || {});
  const overlay = root.createOverlay();
  const adapter = location.hostname.includes("bilibili.com")
    ? root.createBilibiliAdapter()
    : root.createYouTubeAdapter();

  let currentCode = root.CONFIG.DEFAULT_CODE;
  let currentUiState = "idle";
  let currentLatencyMs = null;
  let currentActiveCount = 1;
  let expectedRemoteVideoId = null;
  let isAway = false;
  let awayTime = null;
  let awayVideoId = null;
  let awayStartedAt = 0;
  let pendingReturnChoice = false;
  let waitingSinceAt = 0;
  let returnFallbackTimer = null;
  let awaySafetyTimer = null;
  let stopNavWatch = null;
  let wsClient = null;
  let engine = null;

  function clearAwayState({ persist = true } = {}) {
    clearTimeout(returnFallbackTimer);
    clearTimeout(awaySafetyTimer);
    isAway = false;
    awayTime = null;
    awayVideoId = null;
    awayStartedAt = 0;
    pendingReturnChoice = false;
    engine?.setAwayMode(false);
    engine?.setDecisionLocked(false);
    if (persist) {
      saveTabSession({
        code: currentCode,
        awayTime: null,
        awayVideoId: null,
        awayStartedAt: 0,
      });
    }
  }

  function readTabSessionRaw() {
    try {
      const raw = window.sessionStorage.getItem(TAB_SYNC_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed.code !== "string" ||
        !/^[A-Z0-9_-]{1,24}$/.test(parsed.code)
      ) {
        window.sessionStorage.removeItem(TAB_SYNC_KEY);
        return null;
      }
      if (!parsed.updatedAt || Date.now() - parsed.updatedAt > TAB_SESSION_TTL_MS) {
        window.sessionStorage.removeItem(TAB_SYNC_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function saveTabSession(patch) {
    try {
      const prev = readTabSessionRaw() || {};
      const next = { ...prev, ...patch, updatedAt: Date.now() };
      if (!next.code || !/^[A-Z0-9_-]{1,24}$/.test(next.code)) return;
      window.sessionStorage.setItem(TAB_SYNC_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage access errors in restricted contexts.
    }
  }

  function clearTabSession() {
    try {
      window.sessionStorage.removeItem(TAB_SYNC_KEY);
    } catch {
      // Ignore storage access errors in restricted contexts.
    }
  }

  function reportBgState(patch) {
    if (patch.uiState) {
      if (patch.uiState === "waiting" && currentUiState !== "waiting") {
        waitingSinceAt = Date.now();
      } else if (patch.uiState !== "waiting") {
        waitingSinceAt = 0;
      }
      currentUiState = patch.uiState;
    }
    if (patch.latencyMs !== undefined) currentLatencyMs = patch.latencyMs;
    if (patch.activeCount !== undefined) currentActiveCount = patch.activeCount;
    chrome.runtime.sendMessage({ type: "BG_UPDATE_STATE", ...patch }).catch(() => {});
  }

  async function notifyReadyForCurrentVideo() {
    const vid = adapter.getVideoId();
    if (!vid) return;
    engine.forcePauseLocal();
    await adapter.waitVideoReady();
    wsClient.send({
      type: "SYNC_PULL",
      videoId: vid,
      videoTitle: adapter.getVideoTitle(),
      keepAway: Boolean(pendingReturnChoice || isAway),
    });
  }

  function emitSearchIfOnSearchPage() {
    if (adapter.getVideoId()) return;
    const search = adapter.getSearchInfo?.();
    if (search) {
      wsClient.send({
        type: "SEARCHING",
        query: search.query,
        searchUrl: search.url,
      });
    }
  }

  function handlePeerStatusMessage(msg) {
    if (typeof msg.activeCount === "number") {
      currentActiveCount = msg.activeCount;
    }

    switch (msg.status) {
      case "away":
        overlay.setPill("对方暂离画面", { tone: "amber" });
        break;
      case "back":
        overlay.setPill("");
        overlay.showToast("对方已回到画面", 1600, "success");
        break;
      case "offline":
        overlay.setPill("等待对方重连…", { tone: "amber" });
        break;
      case "left":
        overlay.showToast("有一位成员已退出", 1800, "info");
        break;
      default:
        break;
    }

    if (currentUiState === "synced") {
      if (currentActiveCount <= 1) {
        engine.setSynced(false);
        reportBgState({
          uiState: "waiting",
          activeCount: currentActiveCount,
          conflict: null,
        });
      } else {
        reportBgState({
          uiState: "synced",
          activeCount: currentActiveCount,
          latencyMs: currentLatencyMs,
        });
      }
    }
  }

  function handleLegacyStatus(status) {
    if (status === "ad_start") {
      overlay.setPill("对方正在看广告…", { tone: "amber" });
    } else if (status === "ad_end") {
      overlay.setPill("");
    } else if (status === "browsing_home") {
      overlay.setPill("对方正在选片…", { tone: "amber" });
    }
  }

  wsClient = root.createWsClient({
    getHeartbeatPayload() {
      return engine.readSnapshot();
    },

    onOpen() {
      overlay.setPill("");
      wsClient.send({
        type: "HELLO",
        videoId: adapter.getVideoId(),
        videoTitle: adapter.getVideoTitle(),
        mode: pendingReturnChoice ? "resume" : "initial",
        keepAway: Boolean(pendingReturnChoice || isAway),
      });
    },

    onLatency(rttMs) {
      currentLatencyMs = rttMs;
      if (currentUiState === "synced") {
        reportBgState({
          uiState: "synced",
          latencyMs: rttMs,
          activeCount: currentActiveCount,
        });
      }
    },

    onHeartbeatAck(ack) {
      const nextCount =
        typeof ack.activeCount === "number" ? ack.activeCount : currentActiveCount;
      if (nextCount !== currentActiveCount) {
        currentActiveCount = nextCount;
        if (currentUiState === "synced") {
          reportBgState({
            uiState: "synced",
            activeCount: nextCount,
            latencyMs: currentLatencyMs,
          });
        }
      }

      if (
        ack.revived &&
        !isAway &&
        !engine.isSoloMode() &&
        !engine.isDecisionLocked() &&
        adapter.getVideoId()
      ) {
        const video = adapter.getVideoElement();
        awayVideoId = adapter.getVideoId();
        awayTime = video ? video.currentTime : null;
        awayStartedAt = Date.now() - 20000;
        isAway = true;
        engine.setAwayMode(true);
        saveTabSession({ code: currentCode, awayTime, awayVideoId, awayStartedAt });
        triggerReturnFromAway();
        return;
      }

      if (
        ack.drift &&
        currentUiState === "synced" &&
        !isAway &&
        !engine.isSoloMode() &&
        !engine.isDecisionLocked()
      ) {
        engine.handleDriftCheck(ack.drift);
      }

      if (
        currentUiState === "waiting" &&
        nextCount >= 2 &&
        waitingSinceAt > 0 &&
        Date.now() - waitingSinceAt > 3000
      ) {
        waitingSinceAt = Date.now();
        wsClient.send({
          type: "HELLO",
          videoId: adapter.getVideoId(),
          videoTitle: adapter.getVideoTitle(),
          mode: pendingReturnChoice ? "resume" : "initial",
          keepAway: Boolean(pendingReturnChoice || isAway),
        });
      } else if (currentUiState === "synced" && nextCount <= 1) {
        engine.setSynced(false);
        reportBgState({
          uiState: "waiting",
          activeCount: nextCount,
          conflict: null,
        });
        overlay.setPill("等待对方重连…", { tone: "amber" });
      }
    },

    onReconnecting() {
      engine.setSynced(false);
      overlay.setPill("断线重连中…", { tone: "orange" });
      reportBgState({ uiState: "reconnecting", conflict: null });
    },

    onRoomFull() {
      stopSync({ notifyBg: false });
      overlay.showToast("房间连接数已达上限", 2600, "danger");
      reportBgState({
        uiState: "full",
        conflict: null,
        errorText: "连接已达上限 · 换码重试",
      });
    },

    onEvicted() {
      stopSync({ notifyBg: true });
      overlay.showToast("同设备新连接已接入，当前页已断开", 2800, "warn");
    },

    onClose() {
      // Handled by explicit stopSync or onRoomFull.
    },

    async onMessage(msg) {
      switch (msg.type) {
        case "WAITING": {
          const wasSynced = currentUiState === "synced";
          if (pendingReturnChoice || isAway) {
            clearAwayState({ persist: true });
            wsClient.send({ type: "BACK" });
          } else {
            clearTimeout(returnFallbackTimer);
            clearTimeout(awaySafetyTimer);
          }
          engine.setSynced(false);
          overlay.hideDisconnectCard();
          if (!wasSynced && adapter.getVideoId()) {
            engine.forcePauseLocal();
          }
          reportBgState({
            uiState: "waiting",
            activeCount: typeof msg.activeCount === "number" ? msg.activeCount : 1,
            conflict: null,
          });
          break;
        }

        case "CONFLICT": {
          pendingReturnChoice = false;
          engine.setSynced(false);
          overlay.hideDisconnectCard();
          reportBgState({
            uiState: "conflict",
            activeCount:
              typeof msg.activeCount === "number" ? msg.activeCount : currentActiveCount,
            conflict: {
              peerVideoId: msg.peerVideoId,
              peerVideoTitle: msg.peerVideoTitle || "",
            },
          });
          overlay.showToast("发现不同视频，请在插件弹窗选择", 2500, "warn");
          break;
        }

        case "NAVIGATE": {
          overlay.hideDisconnectCard();
          overlay.setPill("");
          if (msg.autoFollow) {
            clearAwayState({ persist: true });
            wsClient.send({ type: "BACK" });
            const title = msg.videoTitle ? `《${msg.videoTitle}》` : "新视频";
            overlay.showToast(`对方已切换至${title}，正在跟随`, 2000, "info");
          }
          if (msg.videoId) {
            if (adapter.getVideoId() === msg.videoId) {
              expectedRemoteVideoId = null;
              await notifyReadyForCurrentVideo();
            } else {
              expectedRemoteVideoId = msg.videoId;
              adapter.navigateTo(msg.videoId);
            }
          }
          break;
        }

        case "ASK_STATE": {
          const snap = engine.readSnapshot();
          wsClient.send({
            type: "REPORT_STATE",
            requesterPeerId: msg.requesterPeerId,
            ...snap,
          });
          break;
        }

        case "ROOM_STATUS": {
          const count =
            typeof msg.activeCount === "number" ? msg.activeCount : currentActiveCount;
          currentActiveCount = count;
          if (count >= 2) {
            overlay.setPill("");
          }
          if (count >= 2 && currentUiState === "waiting") {
            engine.setSynced(true);
            overlay.hideDisconnectCard();
            reportBgState({
              uiState: "synced",
              activeCount: count,
              latencyMs: currentLatencyMs,
              conflict: null,
              closePopup: true,
            });
            overlay.showToast(`已同步（${count}人）`, 1800, "success");
            emitSearchIfOnSearchPage();
          } else if (currentUiState === "synced") {
            reportBgState({
              uiState: "synced",
              activeCount: count,
              latencyMs: currentLatencyMs,
            });
          }
          break;
        }

        case "SYNC_READY": {
          const count =
            typeof msg.activeCount === "number"
              ? msg.activeCount
              : Math.max(2, currentActiveCount);
          currentActiveCount = count;
          engine.setSynced(true);
          overlay.hideDisconnectCard();
          overlay.setPill("");
          reportBgState({
            uiState: "synced",
            activeCount: count,
            latencyMs: currentLatencyMs,
            conflict: null,
            closePopup: true,
          });
          overlay.showToast(
            msg.idle ? "已进入同步房间，打开视频即可同步" : `已同步（${count}人）`,
            1800,
            "success"
          );
          emitSearchIfOnSearchPage();
          break;
        }

        case "INIT_STATE": {
          clearTimeout(returnFallbackTimer);
          clearTimeout(awaySafetyTimer);
          if (msg.videoId && adapter.getVideoId() !== msg.videoId) {
            expectedRemoteVideoId = msg.videoId;
            adapter.navigateTo(msg.videoId);
            break;
          }

          const count =
            typeof msg.activeCount === "number"
              ? msg.activeCount
              : Math.max(2, currentActiveCount);
          currentActiveCount = count;

          if (pendingReturnChoice) {
            pendingReturnChoice = false;
            const rate = Number(msg.playbackRate) || 1;
            const peerNow = Math.max(
              0,
              (Number(msg.currentTime) || 0) +
                (msg.playing ? (Number(msg.totalDelay) || 0) * rate : 0)
            );
            const savedAwayTime = awayTime;
            const savedAwayVid = awayVideoId;

            if (
              savedAwayVid &&
              msg.videoId === savedAwayVid &&
              typeof savedAwayTime === "number" &&
              Math.abs(peerNow - savedAwayTime) > 3.0
            ) {
              awayTime = null;
              awayVideoId = null;
              awayStartedAt = 0;
              engine.setDecisionLocked(true);
              engine.setAwayMode(true);
              engine.setSynced(true);
              engine.forcePauseLocal();
              overlay.setPill("");
              reportBgState({
                uiState: "synced",
                activeCount: count,
                latencyMs: currentLatencyMs,
                conflict: null,
                closePopup: true,
              });
              overlay.showResumeCard({
                awayTimeSec: savedAwayTime,
                peerTimeSec: peerNow,
                peerPlaying: Boolean(msg.playing),
                peerRate: rate,
                formatTime: engine.formatTime,
                onFollowCurrent() {
                  clearAwayState({ persist: true });
                  const vid = adapter.getVideoId();
                  if (vid) {
                    wsClient.send({
                      type: "SYNC_PULL",
                      videoId: vid,
                      videoTitle: adapter.getVideoTitle(),
                      keepAway: false,
                    });
                  }
                  overlay.showToast("正在跟进对方最新进度", 1600, "info");
                },
                async onPullBack() {
                  clearAwayState({ persist: true });
                  wsClient.send({ type: "BACK" });
                  await adapter.waitVideoReady();
                  engine.seekAndSyncTo(savedAwayTime, { playing: true });
                  overlay.showToast(
                    `已将大家拉回 ${engine.formatTime(savedAwayTime)}`,
                    1800,
                    "success"
                  );
                },
              });
              break;
            }

            clearAwayState({ persist: true });
            wsClient.send({ type: "BACK" });
          }

          await adapter.waitVideoReady();
          overlay.setPill("");
          engine.resetVersion();
          engine.setSynced(true);
          reportBgState({
            uiState: "synced",
            activeCount: count,
            latencyMs: currentLatencyMs,
            conflict: null,
            closePopup: true,
          });
          engine.applyInitialState(msg);
          overlay.showToast("已对齐进度，开始同步", 1800, "success");
          break;
        }

        case "CONTROL": {
          if (engine.isSoloMode() || engine.isDecisionLocked()) return;
          overlay.setPill("");
          if (msg.action === "video_change" && msg.videoId) {
            if (adapter.getVideoId() !== msg.videoId) {
              const title = msg.videoTitle ? `《${msg.videoTitle}》` : "新视频";
              overlay.showToast(`已跟随切换至${title}`, 2000, "info");
              expectedRemoteVideoId = msg.videoId;
              adapter.navigateTo(msg.videoId);
            }
            return;
          }
          engine.applyRemoteState(msg, {
            forceSeek: msg.action === "seek",
            showToast: true,
          });
          break;
        }

        case "PEER_STATUS": {
          handlePeerStatusMessage(msg);
          break;
        }

        case "PEER_SEARCHING": {
          overlay.setActionPill({
            text: `对方正在搜「${msg.query || "视频"}」`,
            actionLabel: "一起挑片",
            onAction() {
              if (msg.searchUrl) {
                window.location.assign(msg.searchUrl);
              }
            },
          });
          break;
        }

        case "STATUS": {
          handleLegacyStatus(msg.status);
          break;
        }

        case "PEER_LEFT": {
          clearAwayState({ persist: true });
          currentActiveCount = 1;
          engine.setSoloMode(false);
          engine.setSynced(false);
          engine.forcePauseLocal();
          overlay.setPill("");
          reportBgState({ uiState: "waiting", activeCount: 1, conflict: null });
          overlay.showDisconnectCard({
            onKeepWaiting() {
              overlay.setPill("等待对方重连…", { tone: "amber" });
            },
            onQuit() {
              stopSync({ notifyBg: true });
            },
          });
          break;
        }

        case "SOLO_WAITING_PEER": {
          overlay.showToast("已退出先看，等待对方结束先看后自动同步", 2200, "info");
          break;
        }

        default:
          break;
      }
    },
  });

  engine = root.createSyncEngine({
    adapter,
    overlay,
    send: (payload) => wsClient.send(payload),
    onBackgroundPause({ videoId, currentTime }) {
      if (
        (currentUiState === "synced" || currentUiState === "waiting") &&
        !engine.isSoloMode() &&
        !isAway &&
        !document.pictureInPictureElement
      ) {
        awayVideoId = videoId;
        awayTime = typeof currentTime === "number" ? currentTime : null;
        awayStartedAt = Date.now();
        isAway = true;
        engine.setAwayMode(true);
        saveTabSession({ code: currentCode, awayTime, awayVideoId, awayStartedAt });
        wsClient.setBackgroundSuspended(true);
        wsClient.send({ type: "AWAY" });
      }
    },
  });

  async function getOrCreateClientId() {
    try {
      const saved = await chrome.storage.local.get("ytSyncClientId");
      if (saved?.ytSyncClientId) return saved.ytSyncClientId;
      const id = `dev_${crypto.randomUUID().slice(0, 12)}`;
      await chrome.storage.local.set({ ytSyncClientId: id });
      return id;
    } catch {
      return `dev_${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  function enterSoloMode() {
    if (currentUiState !== "synced" || engine.isSoloMode()) return;
    engine.setSoloMode(true);
    wsClient.send({ type: "SOLO_ENTER" });
    reportBgState({ uiState: "solo", conflict: null });
    overlay.showToast("已进入先看模式（点插件图标可随时切回）", 1500, "info");
  }

  function exitSoloMode() {
    if (!engine.isSoloMode()) return;
    engine.setSoloMode(false);
    reportBgState({ uiState: "synced", conflict: null });
    wsClient.send({ type: "SOLO_EXIT" });
  }

  function triggerReturnFromAway() {
    if (!isAway) return;
    pendingReturnChoice = true;
    clearTimeout(returnFallbackTimer);
    clearTimeout(awaySafetyTimer);

    awaySafetyTimer = setTimeout(() => {
      if (pendingReturnChoice || (isAway && !engine.isDecisionLocked())) {
        clearAwayState({ persist: true });
        wsClient.send({ type: "BACK" });
      }
    }, 3500);

    const pullCurrent = (fallbackOnly = false) => {
      const vid = adapter.getVideoId();
      if (vid) {
        wsClient.send({
          type: "SYNC_PULL",
          videoId: vid,
          videoTitle: adapter.getVideoTitle(),
          keepAway: true,
          fallbackOnly,
        });
      }
    };

    const awayElapsed = awayStartedAt > 0 ? Date.now() - awayStartedAt : 0;
    const forceReconnect =
      awayElapsed >= (root.CONFIG.DIRECT_RECONNECT_AWAY_MS || 8000);

    wsClient.probeOrReconnect({
      forceReconnect,
      onAlive() {
        pullCurrent(false);
      },
    });

    returnFallbackTimer = setTimeout(() => {
      if (pendingReturnChoice) {
        pullCurrent(true);
      }
    }, 1500);
  }

  async function startSync(code) {
    const nextCode = code || root.CONFIG.DEFAULT_CODE;
    if (wsClient.isConnectingOrConnected() && currentCode === nextCode) {
      return;
    }
    currentCode = nextCode;
    saveTabSession({ code: currentCode });
    const clientId = await getOrCreateClientId();
    engine.start();
    wsClient.connect(currentCode, clientId);

    if (!stopNavWatch) {
      stopNavWatch = adapter.watchNavigation(async ({ videoId, videoTitle }) => {
        if (!wsClient.isConnected() || engine.isSoloMode()) return;

        if (!videoId) {
          expectedRemoteVideoId = null;
          engine.setSynced(false);
          const search = adapter.getSearchInfo?.();
          if (search) {
            wsClient.send({
              type: "SEARCHING",
              query: search.query,
              searchUrl: search.url,
            });
          } else {
            wsClient.send({ type: "STATUS", status: "browsing_home" });
          }
          return;
        }

        if (expectedRemoteVideoId && videoId === expectedRemoteVideoId) {
          expectedRemoteVideoId = null;
          await notifyReadyForCurrentVideo();
          return;
        }

        if (currentUiState === "waiting" && !engine.isSynced()) {
          await notifyReadyForCurrentVideo();
          return;
        }

        if (currentUiState === "synced") {
          engine.setSynced(true);
          overlay.setPill("");
          wsClient.send({ type: "STATUS", status: "ad_end" });
          wsClient.send({
            type: "CONTROL",
            action: "video_change",
            videoId,
            videoTitle,
            currentTime: 0,
            playbackRate: 1,
            playing: false,
          });
          await adapter.waitVideoReady();
          const snap = engine.readSnapshot();
          wsClient.send({
            type: "CONTROL",
            action: snap.playing ? "play" : "seek",
            ...snap,
          });
        }
      });
    }
  }

  function stopSync({ notifyBg = true } = {}) {
    if (stopNavWatch) {
      stopNavWatch();
      stopNavWatch = null;
    }
    clearAwayState({ persist: false });
    clearTabSession();
    currentActiveCount = 1;
    waitingSinceAt = 0;
    engine.setSoloMode(false);
    engine.stop();
    wsClient.setBackgroundSuspended(false);
    wsClient.disconnect();
    overlay.clearAll();
    if (notifyBg) {
      reportBgState({
        uiState: "idle",
        latencyMs: null,
        activeCount: 1,
        conflict: null,
        errorText: "",
      });
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      return;
    }

    if (document.visibilityState === "visible") {
      wsClient.setBackgroundSuspended(false);
      if (isAway && !document.pictureInPictureElement) {
        engine.setAwayMode(true);
        triggerReturnFromAway();
      } else if (!isAway && currentUiState !== "idle") {
        wsClient.probeOrReconnect();
      }
    }
  });

  document.addEventListener(
    "enterpictureinpicture",
    () => {
      if (
        (currentUiState === "synced" || currentUiState === "waiting") &&
        !engine.isSoloMode() &&
        !isAway
      ) {
        const video = adapter.getVideoElement();
        awayVideoId = adapter.getVideoId();
        awayTime = video ? video.currentTime : null;
        awayStartedAt = Date.now();
        isAway = true;
        engine.setAwayMode(true);
        saveTabSession({ code: currentCode, awayTime, awayVideoId, awayStartedAt });
        wsClient.send({ type: "AWAY" });
      }
    },
    true
  );

  document.addEventListener(
    "leavepictureinpicture",
    () => {
      if (isAway && document.visibilityState === "visible") {
        triggerReturnFromAway();
      }
    },
    true
  );

  window.addEventListener("pagehide", (e) => {
    if (e.persisted) {
      wsClient.suspendForPageCache();
    } else if (wsClient.isConnected()) {
      wsClient.disconnect();
    }
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted && currentUiState !== "idle") {
      wsClient.setBackgroundSuspended(false);
      if (isAway && !document.pictureInPictureElement) {
        triggerReturnFromAway();
      } else {
        wsClient.probeOrReconnect();
      }
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "CS_CONNECT") {
      startSync(msg.code);
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === "CS_DISCONNECT") {
      stopSync({ notifyBg: true });
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === "CS_CONFLICT_DECISION") {
      wsClient.send({ type: "CONFLICT_DECISION", decision: msg.decision });
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === "CS_SET_SOLO") {
      if (msg.enabled) {
        enterSoloMode();
      } else {
        exitSoloMode();
      }
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });

  // Auto-resume sync if this tab owns the active session or retains a valid tab session.
  chrome.runtime
    .sendMessage({ type: "BG_GET_TAB_SYNC" })
    .then(async (res) => {
      const tabSess = readTabSessionRaw();
      const targetCode = res?.shouldSync && res.code ? res.code : tabSess?.code;
      if (!targetCode) return;

      if (!res?.shouldSync) {
        await chrome.runtime
          .sendMessage({ type: "BG_RECLAIM_TAB", code: targetCode })
          .catch(() => {});
      }

      if (
        tabSess?.awayVideoId &&
        tabSess.awayVideoId === adapter.getVideoId() &&
        typeof tabSess.awayTime === "number"
      ) {
        isAway = true;
        awayTime = tabSess.awayTime;
        awayVideoId = tabSess.awayVideoId;
        awayStartedAt = tabSess.awayStartedAt || Date.now();
        pendingReturnChoice = true;
        engine.setAwayMode(true);
      }

      startSync(targetCode);
    })
    .catch(() => {
      const tabSess = readTabSessionRaw();
      if (tabSess?.code) {
        startSync(tabSess.code);
      }
    });
})();
