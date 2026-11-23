import { DurableObject } from "cloudflare:workers";

const MAX_CONNECTIONS = 16;
const ACTIVE_TIMEOUT_MS = 20000;
const GC_TIMEOUT_MS = 10 * 60 * 1000;
const ROOM_STATE_FRESH_MS = 12000;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function safeSend(ws, payload) {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // Ignore send failures on closing sockets.
  }
}

function getMeta(ws) {
  try {
    return ws.deserializeAttachment() || null;
  } catch {
    return null;
  }
}

function setMeta(ws, patch) {
  const prev = getMeta(ws) || {};
  const next = { ...prev, ...patch };
  ws.serializeAttachment(next);
  return next;
}

function roundDelay(sec) {
  return Math.round(Math.max(0, Number(sec) || 0) * 1000) / 1000;
}

function isAllowedSearchUrl(url) {
  return /^https:\/\/((www|m)\.youtube\.com|(www|m|search)\.bilibili\.com)\//i.test(
    String(url || "")
  );
}

export class SyncRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.liveRoomState = null;
  }

  async getRoomState() {
    if (!this.liveRoomState) {
      this.liveRoomState = (await this.ctx.storage.get("roomState")) || null;
    }
    return this.liveRoomState;
  }

  async updateRoomState(patch, { persist = false } = {}) {
    const prev = (await this.getRoomState()) || {};
    this.liveRoomState = {
      ...prev,
      ...patch,
      serverAt: Date.now(),
    };
    if (persist) {
      await this.ctx.storage.put("roomState", this.liveRoomState);
    }
    return this.liveRoomState;
  }

  extrapolateRoomState(state, targetDelay, now = Date.now()) {
    if (!state || !state.videoId) return null;
    const rate = Number(state.playbackRate) || 1;
    const playing = Boolean(state.playing);
    const elapsedSec = Math.max(0, (now - (state.serverAt || now)) / 1000);
    const totalDelay = roundDelay((state.sourceDelay || 0) + (targetDelay || 0));
    const baseTime = Number(state.currentTime) || 0;
    const currentTime = Math.max(
      0,
      Number((baseTime + (playing ? elapsedSec * rate : 0)).toFixed(3))
    );
    return {
      videoId: state.videoId,
      videoTitle: state.videoTitle || "",
      currentTime,
      playbackRate: rate,
      playing,
      totalDelay,
    };
  }

  gcAndGetSockets(now = Date.now()) {
    const live = [];
    for (const ws of this.ctx.getWebSockets()) {
      const meta = getMeta(ws);
      if (!meta || meta.rejected || ws.readyState >= 2) continue;
      const lastActivity = meta.lastSeen || meta.joinedAt || 0;
      if (now - lastActivity > GC_TIMEOUT_MS) {
        ws.serializeAttachment({ ...meta, rejected: true });
        try {
          ws.close(4000, "GC_TIMEOUT");
        } catch {
          // Already closed.
        }
      } else {
        live.push(ws);
      }
    }
    return live;
  }

  isSocketActive(ws, now = Date.now()) {
    const m = getMeta(ws);
    return Boolean(
      m &&
        !m.rejected &&
        !m.away &&
        !m.solo &&
        now - (m.lastSeen || m.joinedAt || 0) <= ACTIVE_TIMEOUT_MS
    );
  }

  getActiveSockets(now = Date.now()) {
    return this.gcAndGetSockets(now).filter((ws) => this.isSocketActive(ws, now));
  }

  getReferenceSocket(activeSockets, refPeerId) {
    if (!activeSockets || activeSockets.length === 0) return null;
    if (refPeerId) {
      const withVideo = activeSockets.find((s) => {
        const m = getMeta(s);
        return m?.peerId === refPeerId && Boolean(m?.videoId);
      });
      if (withVideo) return withVideo;
      const matched = activeSockets.find((s) => getMeta(s)?.peerId === refPeerId);
      if (matched) return matched;
    }
    const sorted = [...activeSockets].sort(
      (a, b) => (getMeta(a)?.joinedAt || 0) - (getMeta(b)?.joinedAt || 0)
    );
    return sorted.find((s) => Boolean(getMeta(s)?.videoId)) || sorted[0] || null;
  }

  async nextVersion() {
    const current = (await this.ctx.storage.get("version")) || 0;
    const next = current + 1;
    await this.ctx.storage.put("version", next);
    return next;
  }

  async setNavigatingPeers(peerIds, durationMs = 8000) {
    if (!peerIds || peerIds.length === 0) return;
    await this.ctx.storage.put("navigatingPeer", {
      peerIds,
      until: Date.now() + durationMs,
    });
  }

  async clearNavigatingPeer(peerId) {
    if (!peerId) return;
    const nav = await this.ctx.storage.get("navigatingPeer");
    if (!nav) return;
    if (
      nav.peerId === peerId ||
      (Array.isArray(nav.peerIds) && nav.peerIds.includes(peerId))
    ) {
      const remaining = Array.isArray(nav.peerIds)
        ? nav.peerIds.filter((id) => id !== peerId)
        : [];
      if (remaining.length === 0) {
        await this.ctx.storage.delete("navigatingPeer");
      } else {
        await this.ctx.storage.put("navigatingPeer", { ...nav, peerIds: remaining });
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true });
    }

    if (url.pathname.endsWith("/peek")) {
      const reqClientId = url.searchParams.get("clientId") || null;
      const now = Date.now();
      const live = this.gcAndGetSockets(now);
      const active = live.filter((ws) => this.isSocketActive(ws, now));
      const othersLive = live.filter(
        (ws) => !(reqClientId && getMeta(ws)?.clientId === reqClientId)
      );
      const othersActive = active.filter(
        (ws) => !(reqClientId && getMeta(ws)?.clientId === reqClientId)
      );
      const sorted = othersActive
        .map((ws) => getMeta(ws))
        .filter(Boolean)
        .sort((a, b) => (b.lastSeen || b.joinedAt || 0) - (a.lastSeen || a.joinedAt || 0));
      const withVideo = sorted.find((m) => Boolean(m.videoId)) || sorted[0] || null;
      let videoId = withVideo?.videoId || null;
      let videoTitle = withVideo?.videoTitle || null;
      if (!videoId && othersActive.length > 0) {
        const state = await this.getRoomState();
        if (state?.videoId && now - (state.serverAt || 0) <= GC_TIMEOUT_MS) {
          videoId = state.videoId;
          videoTitle = state.videoTitle || null;
        }
      }
      return jsonResponse({
        full: othersLive.length >= MAX_CONNECTIONS,
        peerCount: othersActive.length,
        activeCount: active.length,
        videoId,
        videoTitle,
      });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const liveRaw = this.gcAndGetSockets();
    const reqClientId = url.searchParams.get("clientId") || null;
    const remainingLive = [];

    // Same-device reconnect (matching clientId): replace own old socket seamlessly.
    for (const sock of liveRaw) {
      const m = getMeta(sock);
      if (reqClientId && m?.clientId === reqClientId) {
        setMeta(sock, { rejected: true });
        if (m?.peerId) {
          const refPeerId = await this.ctx.storage.get("refPeerId");
          if (refPeerId === m.peerId) {
            await this.ctx.storage.delete("refPeerId");
          }
        }
        safeSend(sock, { type: "KICKED", message: "同设备新连接已接入，旧连接已断开" });
        try {
          sock.close(4002, "EVICTED");
        } catch {
          // Ignore close errors.
        }
      } else {
        remainingLive.push(sock);
      }
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    if (remainingLive.length >= MAX_CONNECTIONS) {
      server.accept();
      safeSend(server, {
        type: "ROOM_FULL",
        message: "房间连接数已达上限",
      });
      setTimeout(() => {
        try {
          server.close(4001, "ROOM_FULL");
        } catch {
          // Ignore close errors.
        }
      }, 50);
      return new Response(null, { status: 101, webSocket: client });
    }

    this.ctx.acceptWebSocket(server);

    const now = Date.now();
    server.serializeAttachment({
      rejected: false,
      peerId: crypto.randomUUID(),
      clientId: reqClientId,
      joinedAt: now,
      lastSeen: now,
      videoId: null,
      videoTitle: null,
      delay: 0,
      hasHello: false,
      away: false,
      solo: false,
      soloExitedAt: 0,
      explicitLeave: false,
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    const prevMeta = getMeta(ws);
    if (!prevMeta || prevMeta.rejected) {
      try {
        ws.close(4000, "STALE_SOCKET");
      } catch {
        // Already closed.
      }
      return;
    }

    const now = Date.now();
    const prevLastSeen = prevMeta.lastSeen || prevMeta.joinedAt || 0;
    const wasTimedOut =
      !prevMeta.away && !prevMeta.solo && now - prevLastSeen > ACTIVE_TIMEOUT_MS;
    const myMeta = setMeta(ws, { lastSeen: now });

    let msg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : "");
    } catch {
      safeSend(ws, { type: "ERROR", message: "Invalid JSON" });
      return;
    }

    switch (msg?.type) {
      case "PING":
      case "HEARTBEAT": {
        const patch = {};
        if (
          typeof msg.delay === "number" &&
          Number.isFinite(msg.delay) &&
          msg.delay >= 0 &&
          msg.delay < 10
        ) {
          const nextDelay =
            myMeta.delay > 0 ? myMeta.delay * 0.7 + msg.delay * 0.3 : msg.delay;
          patch.delay = roundDelay(nextDelay);
        }
        if (msg.videoId !== undefined) patch.videoId = msg.videoId || null;
        if (msg.videoTitle !== undefined) patch.videoTitle = msg.videoTitle || null;
        const updated = Object.keys(patch).length > 0 ? setMeta(ws, patch) : myMeta;

        const active = this.getActiveSockets(now);
        const storedRefPeerId = await this.ctx.storage.get("refPeerId");
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);
        const refIsActive = Boolean(
          storedRefPeerId && active.some((s) => getMeta(s)?.peerId === storedRefPeerId)
        );

        let refWs = null;
        if (wasTimedOut && otherActives.length > 0) {
          const preferredId = storedRefPeerId === updated.peerId ? null : storedRefPeerId;
          refWs = this.getReferenceSocket(otherActives, preferredId);
          const nextRefId = getMeta(refWs)?.peerId;
          if (nextRefId && nextRefId !== storedRefPeerId) {
            await this.ctx.storage.put("refPeerId", nextRefId);
          }
        } else if ((!storedRefPeerId || !refIsActive) && active.length > 0) {
          refWs = this.getReferenceSocket(active, null);
          const nextRefId = getMeta(refWs)?.peerId;
          if (nextRefId && nextRefId !== storedRefPeerId) {
            await this.ctx.storage.put("refPeerId", nextRefId);
          }
        } else {
          refWs = this.getReferenceSocket(active, storedRefPeerId);
        }

        const isMyActive = this.isSocketActive(ws, now);
        const revived = Boolean(wasTimedOut && refWs && refWs !== ws);

        if (
          refWs === ws &&
          !wasTimedOut &&
          isMyActive &&
          msg.videoId &&
          typeof msg.currentTime === "number"
        ) {
          await this.updateRoomState(
            {
              videoId: msg.videoId,
              videoTitle: msg.videoTitle || updated.videoTitle || "",
              currentTime: Number(msg.currentTime) || 0,
              playbackRate: Number(msg.playbackRate) || 1,
              playing: Boolean(msg.playing),
              sourcePeerId: updated.peerId,
              sourceDelay: updated.delay || 0,
            },
            { persist: false }
          );
        }

        let drift = null;
        if (isMyActive && !revived && refWs && refWs !== ws) {
          const state = await this.getRoomState();
          const refMeta = getMeta(refWs);
          if (
            state &&
            state.videoId &&
            now - (state.serverAt || 0) <= ROOM_STATE_FRESH_MS &&
            (!msg.videoId || state.videoId === msg.videoId) &&
            (!refMeta?.videoId || refMeta.videoId === state.videoId)
          ) {
            drift = this.extrapolateRoomState(state, updated.delay || 0, now);
          }
        }

        if (msg.type === "PING") {
          safeSend(ws, {
            type: "PONG",
            t: msg.t,
            peerCount: active.length,
            activeCount: active.length,
            revived,
          });
        } else {
          safeSend(ws, {
            type: "HEARTBEAT_ACK",
            t: msg.t,
            activeCount: active.length,
            isRef: refWs === ws,
            revived,
            drift,
          });
        }
        break;
      }

      case "HELLO": {
        const updated = setMeta(ws, {
          videoId: msg.videoId || null,
          videoTitle: msg.videoTitle || null,
          hasHello: true,
          away: Boolean(msg.keepAway),
        });
        await this.clearNavigatingPeer(updated.peerId);

        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);

        for (const peer of otherActives) {
          safeSend(peer, { type: "ROOM_STATUS", activeCount: active.length });
        }

        if (otherActives.length === 0) {
          if (updated.videoId && !updated.away) {
            await this.ctx.storage.put("refPeerId", updated.peerId);
          }
          safeSend(ws, { type: "WAITING", activeCount: active.length });
          return;
        }

        const refPeerId = await this.ctx.storage.get("refPeerId");
        const refWs = this.getReferenceSocket(otherActives, refPeerId);
        const refMeta = getMeta(refWs);

        if (refMeta?.videoId && updated.videoId && refMeta.videoId !== updated.videoId) {
          safeSend(ws, {
            type: "CONFLICT",
            peerVideoId: refMeta.videoId,
            peerVideoTitle: refMeta.videoTitle || "",
            activeCount: active.length,
          });
          return;
        }

        if (refMeta?.videoId && !updated.videoId) {
          await this.ctx.storage.put("refPeerId", refMeta.peerId);
          await this.setNavigatingPeers([updated.peerId]);
          safeSend(ws, {
            type: "NAVIGATE",
            videoId: refMeta.videoId,
            videoTitle: refMeta.videoTitle || "",
          });
          return;
        }

        if (!refMeta?.videoId && updated.videoId) {
          await this.ctx.storage.put("refPeerId", updated.peerId);
          const peerIds = otherActives.map((s) => getMeta(s)?.peerId).filter(Boolean);
          await this.setNavigatingPeers(peerIds);
          for (const peer of otherActives) {
            safeSend(peer, {
              type: "NAVIGATE",
              videoId: updated.videoId,
              videoTitle: updated.videoTitle || "",
            });
          }
          safeSend(ws, { type: "SYNC_READY", activeCount: active.length });
          return;
        }

        if (refMeta?.videoId && updated.videoId && refMeta.videoId === updated.videoId) {
          await this.ctx.storage.put("refPeerId", refMeta.peerId);
          safeSend(refWs, { type: "ASK_STATE", requesterPeerId: updated.peerId });
          return;
        }

        safeSend(ws, { type: "SYNC_READY", activeCount: active.length, idle: true });
        break;
      }

      case "CONFLICT_DECISION": {
        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);
        if (otherActives.length === 0) {
          safeSend(ws, { type: "WAITING", activeCount: active.length });
          return;
        }
        const refPeerId = await this.ctx.storage.get("refPeerId");
        const refWs = this.getReferenceSocket(otherActives, refPeerId);
        const refMeta = getMeta(refWs);

        if (msg.decision === "FOLLOW_PEER") {
          await this.setNavigatingPeers([myMeta.peerId]);
          safeSend(ws, {
            type: "NAVIGATE",
            videoId: refMeta?.videoId || null,
            videoTitle: refMeta?.videoTitle || "",
          });
        } else {
          await this.ctx.storage.put("refPeerId", myMeta.peerId);
          const peerIds = otherActives.map((s) => getMeta(s)?.peerId).filter(Boolean);
          await this.setNavigatingPeers(peerIds);
          for (const peer of otherActives) {
            safeSend(peer, {
              type: "NAVIGATE",
              videoId: myMeta.videoId,
              videoTitle: myMeta.videoTitle || "",
            });
          }
          safeSend(ws, { type: "SYNC_READY", activeCount: active.length });
        }
        break;
      }

      case "READY":
      case "SYNC_PULL": {
        const patch = { hasHello: true };
        if (msg.videoId) patch.videoId = msg.videoId;
        if (msg.videoTitle !== undefined) patch.videoTitle = msg.videoTitle;
        patch.away = msg.keepAway !== undefined ? Boolean(msg.keepAway) : false;
        const updated = setMeta(ws, patch);
        await this.clearNavigatingPeer(updated.peerId);

        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);
        const refPeerId = await this.ctx.storage.get("refPeerId");

        if (!msg.fallbackOnly && otherActives.length > 0) {
          const refWs = this.getReferenceSocket(otherActives, refPeerId);
          if (!msg.keepAway) {
            for (const peer of otherActives) {
              safeSend(peer, { type: "ROOM_STATUS", activeCount: active.length });
            }
          }
          safeSend(refWs, { type: "ASK_STATE", requesterPeerId: updated.peerId });
          return;
        }

        const state = await this.getRoomState();
        const targetVid = updated.videoId || msg.videoId;
        if (
          state &&
          state.videoId &&
          now - (state.serverAt || 0) <= ROOM_STATE_FRESH_MS &&
          (!targetVid || state.videoId === targetVid)
        ) {
          const snap = this.extrapolateRoomState(state, updated.delay || 0, now);
          const version = (await this.ctx.storage.get("version")) || 1;
          safeSend(ws, {
            type: "INIT_STATE",
            ...snap,
            version,
            activeCount: active.length,
          });
          return;
        }

        safeSend(ws, { type: "WAITING", activeCount: active.length });
        break;
      }

      case "REPORT_STATE": {
        const updated = setMeta(ws, {
          videoId: msg.videoId || myMeta.videoId,
          videoTitle: msg.videoTitle || myMeta.videoTitle,
        });
        const version = await this.nextVersion();
        await this.ctx.storage.put("refPeerId", updated.peerId);
        if (msg.videoId || updated.videoId) {
          await this.updateRoomState(
            {
              videoId: msg.videoId || updated.videoId,
              videoTitle: msg.videoTitle || updated.videoTitle || "",
              currentTime: Number(msg.currentTime) || 0,
              playbackRate: Number(msg.playbackRate) || 1,
              playing: Boolean(msg.playing),
              sourcePeerId: updated.peerId,
              sourceDelay: updated.delay || 0,
            },
            { persist: true }
          );
        }

        const active = this.getActiveSockets(now);
        const live = this.gcAndGetSockets(now);
        let targetWs = null;
        if (msg.requesterPeerId) {
          targetWs = live.find((s) => getMeta(s)?.peerId === msg.requesterPeerId) || null;
        }
        if (!targetWs) {
          targetWs = live.find((s) => s !== ws && getMeta(s)?.hasHello) || null;
        }

        if (targetWs) {
          const targetMeta = getMeta(targetWs);
          const totalDelay = roundDelay((updated.delay || 0) + (targetMeta?.delay || 0));
          safeSend(targetWs, {
            type: "INIT_STATE",
            videoId: msg.videoId || updated.videoId,
            videoTitle: msg.videoTitle || updated.videoTitle || "",
            currentTime: Number(msg.currentTime) || 0,
            playbackRate: Number(msg.playbackRate) || 1,
            playing: Boolean(msg.playing),
            totalDelay,
            version,
            activeCount: active.length,
          });
        }

        safeSend(ws, {
          type: "ROOM_STATUS",
          activeCount: active.length,
        });
        break;
      }

      case "CONTROL": {
        if (myMeta.solo || myMeta.away) return;
        const updated = setMeta(ws, {
          videoId: msg.videoId !== undefined ? msg.videoId : myMeta.videoId,
          videoTitle: msg.videoTitle !== undefined ? msg.videoTitle : myMeta.videoTitle,
        });
        const version = await this.nextVersion();
        await this.ctx.storage.put("refPeerId", updated.peerId);

        if (msg.action !== "video_change" && (msg.videoId || updated.videoId)) {
          await this.updateRoomState(
            {
              videoId: msg.videoId || updated.videoId,
              videoTitle: msg.videoTitle || updated.videoTitle || "",
              currentTime: Number(msg.currentTime) || 0,
              playbackRate: Number(msg.playbackRate) || 1,
              playing: Boolean(msg.playing),
              sourcePeerId: updated.peerId,
              sourceDelay: updated.delay || 0,
            },
            { persist: true }
          );
        }

        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws);

        if (msg.action === "video_change" && otherActives.length > 0) {
          const peerIds = otherActives.map((s) => getMeta(s)?.peerId).filter(Boolean);
          await this.setNavigatingPeers(peerIds, 6000);
        }

        for (const peer of otherActives) {
          const peerMeta = getMeta(peer);
          const totalDelay = roundDelay((updated.delay || 0) + (peerMeta?.delay || 0));
          safeSend(peer, {
            type: "CONTROL",
            action: msg.action,
            videoId: msg.videoId || null,
            videoTitle: msg.videoTitle || "",
            currentTime: Number(msg.currentTime) || 0,
            playbackRate: Number(msg.playbackRate) || 1,
            playing: Boolean(msg.playing),
            totalDelay,
            version,
          });
        }
        break;
      }

      case "AWAY": {
        setMeta(ws, { away: true });
        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);
        const storedRefPeerId = await this.ctx.storage.get("refPeerId");
        if (storedRefPeerId === myMeta.peerId && otherActives.length > 0) {
          const nextRefWs = this.getReferenceSocket(otherActives, null);
          const nextRefId = getMeta(nextRefWs)?.peerId;
          if (nextRefId) {
            await this.ctx.storage.put("refPeerId", nextRefId);
          }
        }
        for (const peer of otherActives) {
          safeSend(peer, {
            type: "PEER_STATUS",
            status: "away",
            activeCount: active.length,
          });
        }
        break;
      }

      case "SEARCHING": {
        if (myMeta.solo || myMeta.away) return;
        if (!isAllowedSearchUrl(msg.searchUrl)) return;
        const query = String(msg.query || "").trim().slice(0, 60);
        if (!query) return;
        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);
        for (const peer of otherActives) {
          safeSend(peer, {
            type: "PEER_SEARCHING",
            query,
            searchUrl: msg.searchUrl,
          });
        }
        break;
      }

      case "BACK": {
        setMeta(ws, { away: false });
        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);
        for (const peer of otherActives) {
          safeSend(peer, {
            type: "PEER_STATUS",
            status: "back",
            activeCount: active.length,
          });
        }
        break;
      }

      case "SOLO_ENTER": {
        setMeta(ws, { solo: true });
        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);
        for (const peer of otherActives) {
          safeSend(peer, { type: "ROOM_STATUS", activeCount: active.length });
        }
        break;
      }

      case "SOLO_EXIT": {
        const updated = setMeta(ws, { solo: false, soloExitedAt: now });
        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);
        if (otherActives.length > 0) {
          const refPeerId = await this.ctx.storage.get("refPeerId");
          const refWs = this.getReferenceSocket(otherActives, refPeerId);
          for (const peer of otherActives) {
            safeSend(peer, { type: "ROOM_STATUS", activeCount: active.length });
          }
          safeSend(refWs, { type: "ASK_STATE", requesterPeerId: updated.peerId });
          return;
        }
        const live = this.gcAndGetSockets(now);
        const hasSoloPeer = live.some((s) => s !== ws && getMeta(s)?.solo);
        if (hasSoloPeer) {
          safeSend(ws, { type: "SOLO_WAITING_PEER" });
        } else {
          safeSend(ws, { type: "WAITING", activeCount: active.length });
        }
        break;
      }

      case "LEAVE": {
        setMeta(ws, { explicitLeave: true });
        await this.handleDisconnect(ws, 1000);
        break;
      }

      case "STATUS": {
        const active = this.getActiveSockets(now);
        const otherActives = active.filter((s) => s !== ws && getMeta(s)?.hasHello);
        for (const peer of otherActives) {
          safeSend(peer, {
            type: "STATUS",
            status: msg.status,
          });
        }
        break;
      }

      default:
        break;
    }
  }

  async handleDisconnect(ws, code = 1006) {
    const meta = getMeta(ws);
    try {
      ws.close(1000, "Normal closure");
    } catch {
      // Already closed.
    }

    if (!meta || meta.rejected) return;
    setMeta(ws, { rejected: true });

    const now = Date.now();
    const live = this.gcAndGetSockets(now).filter((s) => s !== ws);
    const active = live.filter((s) => this.isSocketActive(s, now));

    if (live.length === 0) {
      this.liveRoomState = null;
      await this.ctx.storage.delete("refPeerId");
      await this.ctx.storage.delete("navigatingPeer");
      await this.ctx.storage.delete("roomState");
      return;
    }

    const storedRefPeerId = await this.ctx.storage.get("refPeerId");
    if (active.length === 0) {
      await this.ctx.storage.delete("refPeerId");
    } else if (storedRefPeerId === meta.peerId) {
      const nextRefWs = this.getReferenceSocket(active, null);
      const nextRefId = getMeta(nextRefWs)?.peerId;
      if (nextRefId) {
        await this.ctx.storage.put("refPeerId", nextRefId);
      }
    }

    const nav = await this.ctx.storage.get("navigatingPeer");
    if (
      nav &&
      nav.until > now &&
      (nav.peerId === meta.peerId ||
        (Array.isArray(nav.peerIds) && nav.peerIds.includes(meta.peerId)))
    ) {
      return;
    }

    const isExplicit = Boolean(meta.explicitLeave || code === 1000);
    if (isExplicit) {
      if (active.length === 1) {
        safeSend(active[0], { type: "PEER_LEFT", activeCount: 1, explicit: true });
      } else if (active.length >= 2) {
        for (const peer of active) {
          safeSend(peer, {
            type: "PEER_STATUS",
            status: "left",
            activeCount: active.length,
          });
        }
      }
    } else {
      for (const peer of active) {
        safeSend(peer, {
          type: "PEER_STATUS",
          status: "offline",
          activeCount: active.length,
        });
      }
    }
  }

  async webSocketClose(ws, code) {
    await this.handleDisconnect(ws, code);
  }

  async webSocketError(ws) {
    await this.handleDisconnect(ws, 1006);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true });
    }

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "yt-sync" });
    }

    const match = url.pathname.match(/^\/room\/([A-Za-z0-9_-]{1,24})\/(peek|ws)$/);
    if (match) {
      const code = match[1].toUpperCase();
      const id = env.SYNC_ROOM.idFromName(code);
      const stub = env.SYNC_ROOM.get(id);
      return stub.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
