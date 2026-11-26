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
  let startingCode = null;
  let currentUiState = "idle";
  let currentLatencyMs = null;
  let currentActiveCount = 1;
  let expectedRemoteVideoId = null;
  let lastVideoChangeVersion = 0;
  let lastRemoteNavVideoId = null;
  let lastRemoteNavAt = 0;
  let remoteNavRetryCount = 0;
  let suppressPagehideLeaveUntil = 0;
  let pendingNavFollow = false;
  let navSeq = 0;
  let navVerifyTimer = null;
  let lastDumpCollectAt = 0;
  let pendingExportResolve = null;
  let isAway = false;
  let awayTime = null;
  let awayVideoId = null;
  let awayStartedAt = 0;
  let resumeCardOpen = false;
  let resumeCardAwayTime = null;
  let resumeCardVideoId = null;
  let returnLinkConfirmed = false;
  let pendingResumeAction = null;
  let suppressInitUntil = 0;
  let suppressRevivedUntil = 0;
  let hiddenAt = 0;
  let lastReturnAt = 0;
  let returnCheckStartedAt = 0;
  let lastPeerState = null;
  let pendingReturnChoice = false;
  let waitingSinceAt = 0;
  let returnFallbackTimer = null;
  let awaySafetyTimer = null;
  let alignPillTimer = null;
  let recentClosePillTimer = null;
  let returnFallbackSent = false;
  let lastAlignToastAt = 0;
  let stopNavWatch = null;
  let wsClient = null;
  let engine = null;

  const noopRecorder = {
    log() {},
    flushNow() {
      return Promise.resolve();
    },
    clear() {
      return Promise.resolve();
    },
    newTraceId() {
      return Math.random().toString(36).slice(2, 8);
    },
    getCompactDump() {
      return { clientNow: Date.now(), platform: "unknown", snapshot: null, events: [] };
    },
    buildExportPayload({ code = "", serverDump = null, peerDump = null, peerStatus = null, serverStatus = null } = {}) {
      return {
        schema: "yt-sync-debug-v1",
        exportedAt: new Date().toISOString(),
        roomCode: String(code || "").length > 4 ? `${String(code).slice(0, 2)}**${String(code).slice(-2)}` : "****",
        clockHint: {
          peerANow: Date.now(),
          serverNow: serverDump?.serverNow || null,
          peerBNow: peerDump?.clientNow || null,
        },
        peerA: { platform: "unknown", snapshot: buildDebugSnapshot(), events: [] },
        peerB: peerDump ? { status: "ok", ...peerDump } : { status: peerStatus || "offline" },
        server: serverDump ? { status: "ok", stats: serverDump.stats || {}, logs: serverDump.logs || [] } : { status: serverStatus || "offline" },
      };
    },
    maskVideoId: (v) => v,
  };

  function buildDebugSnapshot() {
    const video = adapter.getVideoElement();
    const mask = (v) => (recorder ? recorder.maskVideoId(v) : v);
    return {
      uiState: currentUiState,
      activeCount: currentActiveCount,
      rttMs: currentLatencyMs,
      videoId: mask(adapter.getVideoId()),
      expectedRemoteVideoId: mask(expectedRemoteVideoId),
      isAway,
      pendingReturnChoice,
      resumeCardOpen,
      soloMode: Boolean(engine?.isSoloMode?.()),
      decisionLocked: Boolean(engine?.isDecisionLocked?.()),
      visibility: document.visibilityState,
      video: video
        ? {
            t: Number((video.currentTime || 0).toFixed(2)),
            dur: Number.isFinite(video.duration) ? Number(video.duration.toFixed(1)) : null,
            paused: Boolean(video.paused),
            ended: Boolean(video.ended),
            readyState: video.readyState,
            rate: video.playbackRate || 1,
          }
        : null,
    };
  }

  const recorder = root.createDebugRecorder
    ? root.createDebugRecorder({
        getSnapshot: buildDebugSnapshot,
        getPlatform: () =>
          location.hostname.startsWith("m.") ? "mobile" : location.hostname.includes("bilibili") ? "bili" : "desktop",
      })
    : noopRecorder;

  function clearAwayState({ persist = true, hideCard = true } = {}) {
    clearTimeout(returnFallbackTimer);
    clearTimeout(awaySafetyTimer);
    clearTimeout(alignPillTimer);
    alignPillTimer = null;
    isAway = false;
    awayTime = null;
    awayVideoId = null;
    awayStartedAt = 0;
    resumeCardOpen = false;
    resumeCardAwayTime = null;
    resumeCardVideoId = null;
    returnFallbackSent = false;
    returnCheckStartedAt = 0;
    pendingReturnChoice = false;
    engine?.setAwayMode(false);
    engine?.setDecisionLocked(false);
    if (hideCard) {
      overlay.hideResumeCard();
    }
    if (persist) {
      saveTabSession({
        code: currentCode,
        awayTime: null,
        awayVideoId: null,
        awayStartedAt: 0,
      });
    }
  }

  function scheduleAwaySafetyCheck(delayMs = 10000) {
    clearTimeout(awaySafetyTimer);
    if (!returnCheckStartedAt) {
      returnCheckStartedAt = Date.now();
    }
    awaySafetyTimer = setTimeout(() => {
      if (resumeCardOpen || pendingResumeAction) return;
      if (!pendingReturnChoice && !(isAway && !engine.isDecisionLocked())) return;
      if (!wsClient.isConnected() && Date.now() - returnCheckStartedAt < 15000) {
        scheduleAwaySafetyCheck(2500);
        return;
      }
      clearAwayState({ persist: true });
    }, delayMs);
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

  function saveHeardProgress(videoId, currentTime, { allowZero = false, readyState = 1 } = {}) {
    if (!videoId || typeof currentTime !== "number" || !Number.isFinite(currentTime)) return;
    if (!allowZero && (readyState < 1 || currentTime <= 0.5)) return;
    saveTabSession({
      code: currentCode,
      lastHeardVideoId: videoId,
      lastHeardTime: Number(currentTime.toFixed(2)),
      lastHeardAt: Date.now(),
    });
  }

  function resolveReliableAwayTime(videoId, rawTime) {
    const video = adapter.getVideoElement();
    if (
      (!video || video.readyState >= 1) &&
      typeof rawTime === "number" &&
      Number.isFinite(rawTime) &&
      rawTime > 0.5
    ) {
      return Number(rawTime.toFixed(2));
    }
    const tabSess = readTabSessionRaw();
    if (
      tabSess?.lastHeardVideoId === videoId &&
      typeof tabSess.lastHeardTime === "number" &&
      Number.isFinite(tabSess.lastHeardTime) &&
      tabSess.lastHeardTime > 0.5
    ) {
      return Number(tabSess.lastHeardTime.toFixed(2));
    }
    if (
      tabSess?.awayVideoId === videoId &&
      typeof tabSess.awayTime === "number" &&
      Number.isFinite(tabSess.awayTime) &&
      tabSess.awayTime > 0.5
    ) {
      return Number(tabSess.awayTime.toFixed(2));
    }
    return null;
  }

  function recordPeerState(msg) {
    if (
      !msg ||
      !msg.videoId ||
      msg.action === "video_change" ||
      typeof msg.currentTime !== "number" ||
      !Number.isFinite(msg.currentTime)
    ) {
      return;
    }
    lastPeerState = {
      videoId: msg.videoId,
      currentTime: Number(msg.currentTime) || 0,
      playbackRate: Number(msg.playbackRate) || 1,
      playing: Boolean(msg.playing),
      receivedAt: Date.now(),
    };
  }

  function estimatePeerNow(videoId) {
    if (!lastPeerState || !videoId || lastPeerState.videoId !== videoId) return null;
    const elapsedSec = Math.max(0, (Date.now() - lastPeerState.receivedAt) / 1000);
    if (elapsedSec > 600) return null;
    return {
      time:
        lastPeerState.currentTime +
        (lastPeerState.playing ? elapsedSec * lastPeerState.playbackRate : 0),
      playing: lastPeerState.playing,
      playbackRate: lastPeerState.playbackRate,
    };
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
    chrome.runtime
      .sendMessage({
        type: "BG_UPDATE_STATE",
        videoId: patch.videoId !== undefined ? patch.videoId : adapter.getVideoId(),
        ...patch,
      })
      .catch(() => {});
  }

  function followRemoteVideo(videoId, { toastText = "", version = null, traceId = null } = {}) {
    if (!videoId) return false;
    if (typeof version === "number") {
      if (version < lastVideoChangeVersion) {
        recorder.log("nav", "follow_ignored_old_v", { videoId, v: version, lastV: lastVideoChangeVersion, traceId });
        return false;
      }
      lastVideoChangeVersion = version;
    }
    pendingResumeAction = null;
    clearAwayState({ persist: true, hideCard: true });
    overlay.hideDisconnectCard();
    overlay.setPill("");
    lastPeerState = null;

    if (adapter.getVideoId() === videoId) {
      expectedRemoteVideoId = null;
      adapter.cancelPendingNavigate?.();
      clearTimeout(navVerifyTimer);
      navVerifyTimer = null;
      return false;
    }

    expectedRemoteVideoId = videoId;
    lastRemoteNavVideoId = videoId;
    lastRemoteNavAt = Date.now();
    remoteNavRetryCount = 0;
    suppressPagehideLeaveUntil = Date.now() + 5000;
    engine.notifyVideoChanged();
    engine.resetVersion();
    recorder.log("nav", "follow", { expected: videoId, actual: adapter.getVideoId(), v: version, traceId });
    clearTimeout(navVerifyTimer);
    navVerifyTimer = setTimeout(() => {
      navVerifyTimer = null;
      if (wsClient.isConnected() && currentUiState !== "idle" && adapter.getVideoId() !== videoId) {
        recorder.log("nav", "nav_miss", {
          expected: videoId,
          actual: adapter.getVideoId(),
          traceId,
        });
      }
    }, 3000);
    saveTabSession({
      code: currentCode,
      awayTime: null,
      awayVideoId: null,
      awayStartedAt: 0,
      lastHeardVideoId: null,
      lastHeardTime: null,
      lastHeardAt: 0,
      navFollowUntil: Date.now() + 15000,
      navTargetVideoId: videoId,
    });
    if (toastText) {
      overlay.showToast(toastText, 2000, "info");
    }
    adapter.navigateTo(videoId);
    return true;
  }

  async function notifyReadyForCurrentVideo() {
    const vid = adapter.getVideoId();
    if (!vid) return;
    const seq = ++navSeq;
    engine.forcePauseLocal();
    await adapter.waitVideoReady(1500);
    if (!wsClient.isConnected() || seq !== navSeq || adapter.getVideoId() !== vid) return;
    wsClient.send({
      type: "SYNC_PULL",
      videoId: vid,
      videoTitle: adapter.getVideoTitle(),
      keepAway: false,
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
    } else if (msg.status === "back" && currentUiState === "waiting" && currentActiveCount >= 2) {
      waitingSinceAt = Date.now();
      wsClient.send({
        type: "HELLO",
        videoId: adapter.getVideoId(),
        videoTitle: adapter.getVideoTitle(),
        mode: pendingReturnChoice || resumeCardOpen ? "resume" : "initial",
        keepAway: false,
      });
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
      if (
        isAway ||
        pendingReturnChoice ||
        resumeCardOpen ||
        pendingResumeAction ||
        engine?.isDecisionLocked()
      ) {
        return {};
      }
      return engine.readSnapshot();
    },

    onOpen() {
      overlay.setPill("");
      returnLinkConfirmed = true;
      returnFallbackSent = false;
      if (pendingResumeAction) {
        flushPendingResumeAction("open");
        return;
      }
      if (pendingReturnChoice) {
        scheduleAwaySafetyCheck(10000);
        clearTimeout(returnFallbackTimer);
        returnFallbackTimer = setTimeout(() => {
          if (pendingReturnChoice && wsClient.isConnected()) {
            const vid = adapter.getVideoId();
            if (vid) {
              returnFallbackSent = true;
              wsClient.send({
                type: "SYNC_PULL",
                videoId: vid,
                videoTitle: adapter.getVideoTitle(),
                keepAway: false,
                fallbackOnly: true,
              });
            }
          }
        }, 600);
      }
      const helloMode = pendingReturnChoice || resumeCardOpen || pendingNavFollow ? "resume" : "initial";
      pendingNavFollow = false;
      wsClient.send({
        type: "HELLO",
        videoId: adapter.getVideoId(),
        videoTitle: adapter.getVideoTitle(),
        mode: helloMode,
        keepAway: false,
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
        !pendingResumeAction &&
        !resumeCardOpen &&
        Date.now() >= suppressInitUntil &&
        Date.now() >= suppressRevivedUntil &&
        !engine.isSoloMode() &&
        !engine.isDecisionLocked() &&
        adapter.getVideoId()
      ) {
        recorder.log("rx", "HEARTBEAT_ACK_REVIVED", { activeCount: nextCount });
        const video = adapter.getVideoElement();
        const revVid = adapter.getVideoId();
        awayVideoId = revVid;
        awayTime = resolveReliableAwayTime(revVid, video ? video.currentTime : null);
        awayStartedAt = Date.now() - 20000;
        isAway = true;
        engine.setAwayMode(true);
        saveTabSession({ code: currentCode, awayTime, awayVideoId, awayStartedAt });
        triggerReturnFromAway();
        return;
      }

      if (ack.drift) {
        recordPeerState(ack.drift);
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
        (currentUiState === "waiting" || currentUiState === "idle") &&
        nextCount >= 2 &&
        waitingSinceAt > 0 &&
        Date.now() - waitingSinceAt > 3000
      ) {
        waitingSinceAt = Date.now();
        wsClient.send({
          type: "HELLO",
          videoId: adapter.getVideoId(),
          videoTitle: adapter.getVideoTitle(),
          mode: pendingReturnChoice || resumeCardOpen ? "resume" : "initial",
          keepAway: false,
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
      returnLinkConfirmed = false;
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

    onSocketEvent(ev) {
      recorder.log("ws", ev?.ev || "event", {
        code: ev?.code,
        reason: ev?.reason,
      });
    },

    onClose() {
      // Handled by explicit stopSync or onRoomFull.
    },

    async onMessage(msg) {
      if (msg?.type) {
        recorder.log("rx", msg.type, {
          action: msg.action,
          vid: msg.videoId || msg.peerVideoId,
          t: msg.currentTime,
          playing: msg.playing,
          rate: msg.playbackRate,
          v: msg.version,
          active: msg.activeCount,
          traceId: msg.traceId,
        });
      }
      switch (msg.type) {
        case "WAITING": {
          if (
            pendingReturnChoice &&
            returnFallbackSent &&
            !resumeCardOpen &&
            !pendingResumeAction &&
            typeof msg.activeCount === "number" &&
            msg.activeCount >= 2
          ) {
            returnFallbackSent = false;
            engine.armInitGuard(1500);
            clearAwayState({ persist: true, hideCard: true });
            overlay.setPill("");
            engine.setSynced(true);
            reportBgState({
              uiState: "synced",
              activeCount: msg.activeCount,
              latencyMs: currentLatencyMs,
              conflict: null,
              closePopup: true,
            });
            break;
          }
          if (
            (pendingReturnChoice || resumeCardOpen || pendingResumeAction) &&
            typeof msg.activeCount === "number" &&
            msg.activeCount >= 2
          ) {
            break;
          }
          if (pendingReturnChoice || isAway || resumeCardOpen || pendingResumeAction) {
            pendingResumeAction = null;
            clearAwayState({ persist: true, hideCard: true });
            overlay.setPill("");
          } else {
            clearTimeout(returnFallbackTimer);
            clearTimeout(awaySafetyTimer);
          }
          engine.setSynced(false);
          overlay.hideDisconnectCard();
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
          if (msg.videoId) {
            const title = msg.videoTitle ? `《${msg.videoTitle}》` : "新视频";
            const navigated = followRemoteVideo(msg.videoId, {
              toastText: msg.autoFollow ? `对方已切换至${title}，正在跟随` : "",
              traceId: msg.traceId || null,
            });
            if (!navigated) {
              await notifyReadyForCurrentVideo();
            }
          }
          break;
        }

        case "ASK_STATE": {
          if (
            (isAway && document.visibilityState === "hidden") ||
            resumeCardOpen ||
            pendingResumeAction
          ) {
            break;
          }
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
          if (count >= 2 && ["waiting", "reconnecting", "idle"].includes(currentUiState)) {
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
          clearTimeout(alignPillTimer);
          alignPillTimer = null;
          if (Date.now() < suppressInitUntil || pendingResumeAction?.type === "pull_back") {
            const count =
              typeof msg.activeCount === "number"
                ? msg.activeCount
                : Math.max(2, currentActiveCount);
            currentActiveCount = count;
            engine.setSynced(true);
            overlay.setPill("");
            reportBgState({
              uiState: "synced",
              activeCount: count,
              latencyMs: currentLatencyMs,
              conflict: null,
              closePopup: true,
            });
            break;
          }
          recordPeerState(msg);
          if (msg.videoId && adapter.getVideoId() !== msg.videoId) {
            followRemoteVideo(msg.videoId, { traceId: msg.traceId || null });
            break;
          }

          const count =
            typeof msg.activeCount === "number"
              ? msg.activeCount
              : Math.max(2, currentActiveCount);
          currentActiveCount = count;

          if (pendingReturnChoice || resumeCardOpen) {
            pendingReturnChoice = false;
            const rate = Number(msg.playbackRate) || 1;
            const peerNow = Math.max(
              0,
              (Number(msg.currentTime) || 0) +
                (msg.playing ? (Number(msg.totalDelay) || 0) * rate : 0)
            );
            const savedAwayTime = resumeCardOpen ? resumeCardAwayTime : awayTime;
            const savedAwayVid = resumeCardOpen ? resumeCardVideoId : awayVideoId;
            const hasComparableAway =
              savedAwayVid &&
              msg.videoId === savedAwayVid &&
              typeof savedAwayTime === "number" &&
              savedAwayTime > 0.5;
            const lagSec = hasComparableAway ? peerNow - savedAwayTime : 0;

            if (hasComparableAway && lagSec > 3.0) {
              awayTime = null;
              awayVideoId = null;
              awayStartedAt = 0;
              openOrUpdateResumeCard({
                savedAwayVid,
                savedAwayTime,
                peerNow,
                peerPlaying: Boolean(msg.playing),
                peerRate: rate,
                count,
              });
              break;
            }

            if (hasComparableAway && savedAwayTime - peerNow > 3.0) {
              engine.armInitGuard(1500);
              clearAwayState({ persist: true, hideCard: true });
              overlay.setPill("");
              engine.setSynced(true);
              reportBgState({
                uiState: "synced",
                activeCount: count,
                latencyMs: currentLatencyMs,
                conflict: null,
                closePopup: true,
              });
              break;
            }

            engine.armInitGuard(2500);
            clearAwayState({ persist: true, hideCard: true });
            const localVideo = adapter.getVideoElement();
            const localPlaying = Boolean(localVideo && !localVideo.paused);
            if (localVideo && localPlaying === Boolean(msg.playing)) {
              overlay.setPill("");
              engine.setSynced(true);
              reportBgState({
                uiState: "synced",
                activeCount: count,
                latencyMs: currentLatencyMs,
                conflict: null,
                closePopup: true,
              });
              if (Boolean(msg.playing)) {
                engine.handleDriftCheck(msg, { seekThresholdSec: 1.0 });
              }
              break;
            }
          }

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
          await adapter.waitVideoReady(1500);
          if (!wsClient.isConnected()) break;
          if (msg.videoId && adapter.getVideoId() !== msg.videoId) break;
          if (expectedRemoteVideoId && expectedRemoteVideoId !== adapter.getVideoId()) break;
          engine.applyInitialState(msg);
          overlay.showToast("已对齐进度，开始同步", 1800, "success");
          break;
        }

        case "CONTROL": {
          if (engine.isSoloMode()) return;
          if (msg.action !== "video_change") {
            recordPeerState(msg);
          }
          if (msg.action === "video_change" && msg.videoId) {
            const title = msg.videoTitle ? `《${msg.videoTitle}》` : "新视频";
            followRemoteVideo(msg.videoId, {
              toastText: adapter.getVideoId() !== msg.videoId ? `已跟随切换至${title}` : "",
              version: typeof msg.version === "number" ? msg.version : null,
              traceId: msg.traceId || null,
            });
            return;
          }
          if (engine.isDecisionLocked() || pendingReturnChoice) return;
          overlay.setPill("");
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
          pendingResumeAction = null;
          returnLinkConfirmed = false;
          suppressInitUntil = 0;
          suppressRevivedUntil = 0;
          clearAwayState({ persist: true, hideCard: true });
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

        case "DEBUG_DUMP_COLLECT": {
          const nowTs = Date.now();
          if (nowTs - lastDumpCollectAt < 3000) break;
          lastDumpCollectAt = nowTs;
          wsClient.send({
            type: "DEBUG_DUMP_DATA",
            reqId: msg.reqId,
            dump: recorder.getCompactDump(200),
          });
          break;
        }

        case "DEBUG_DUMP_RES": {
          if (pendingExportResolve && (!msg.reqId || pendingExportResolve.reqId === msg.reqId)) {
            const cb = pendingExportResolve.resolve;
            pendingExportResolve = null;
            cb(msg);
          }
          break;
        }

        default:
          break;
      }
    },
  });

  const TRACED_TX_TYPES = new Set([
    "CONTROL",
    "HELLO",
    "SYNC_PULL",
    "READY",
    "REPORT_STATE",
    "AWAY",
    "BACK",
    "CONFLICT_DECISION",
  ]);
  const rawWsSend = wsClient.send;
  wsClient.send = (payload) => {
    if (payload && TRACED_TX_TYPES.has(payload.type)) {
      const traceId = payload.traceId || recorder.newTraceId();
      const withTrace = { ...payload, traceId };
      recorder.log("tx", payload.type, {
        action: payload.action,
        vid: payload.videoId,
        t: payload.currentTime,
        playing: payload.playing,
        rate: payload.playbackRate,
        mode: payload.mode,
        traceId,
      });
      return rawWsSend(withTrace);
    }
    return rawWsSend(payload);
  };

  function shieldLaggingAction(
    videoId,
    currentTime,
    { hadUserGesture = false, checkRecentReturn = false, isSeek = false } = {}
  ) {
    if (!videoId || typeof currentTime !== "number" || !Number.isFinite(currentTime)) {
      return true;
    }
    const peer = estimatePeerNow(videoId);
    if (isSeek && document.visibilityState === "hidden") {
      const video = adapter.getVideoElement();
      if (video && !video.paused && !isAway && wsClient.isConnected()) {
        return true;
      }
    }
    const isLagging = Boolean(peer && peer.time - currentTime > 3.0);
    const recentlyReturned =
      checkRecentReturn && lastReturnAt > 0 && Date.now() - lastReturnAt < 15000;
    if (isLagging && (!hadUserGesture || document.visibilityState === "hidden" || recentlyReturned)) {
      const reliableTime = resolveReliableAwayTime(videoId, currentTime);
      awayVideoId = videoId;
      awayTime = reliableTime;
      awayStartedAt = awayStartedAt || Date.now();
      isAway = true;
      engine.setAwayMode(true);
      engine.forcePauseLocal();
      saveTabSession({ code: currentCode, awayTime, awayVideoId, awayStartedAt });
      if (document.visibilityState === "visible") {
        triggerReturnFromAway();
      }
      return false;
    }
    return true;
  }

  engine = root.createSyncEngine({
    adapter,
    overlay,
    send(payload) {
      if (payload?.type === "CONTROL" && payload.action !== "video_change") {
        recordPeerState(payload);
      }
      return wsClient.send(payload);
    },
    onProgressTick({ videoId, currentTime, readyState }) {
      saveHeardProgress(videoId, currentTime, { allowZero: false, readyState });
    },
    onSlowSeekFinished() {
      if (wsClient.isConnected() && !isAway && !engine.isSoloMode() && !engine.isDecisionLocked()) {
        wsClient.probeOrReconnect({ onAlive() {} });
      }
    },
    beforeEmitPlay({ videoId, currentTime, hadUserGesture }) {
      return shieldLaggingAction(videoId, currentTime, {
        hadUserGesture,
        checkRecentReturn: true,
        isSeek: false,
      });
    },
    beforeEmitSeek({ videoId, currentTime, hadUserGesture }) {
      return shieldLaggingAction(videoId, currentTime, {
        hadUserGesture,
        checkRecentReturn: false,
        isSeek: true,
      });
    },
    onBlockedAction() {
      if (pendingReturnChoice && !resumeCardOpen) {
        clearTimeout(alignPillTimer);
        alignPillTimer = null;
        overlay.setPill("正在对齐进度…", { tone: "amber", spinner: true });
        const now = Date.now();
        if (now - lastAlignToastAt > 1200) {
          lastAlignToastAt = now;
          overlay.showToast("正在对齐对方进度，请稍候…", 1400, "info");
        }
      }
    },
    onBackgroundPause({ videoId, currentTime }) {
      if (
        currentUiState !== "idle" &&
        currentUiState !== "full" &&
        !engine.isSoloMode() &&
        !isAway &&
        !document.pictureInPictureElement
      ) {
        awayVideoId = videoId;
        awayTime = resolveReliableAwayTime(videoId, currentTime);
        awayStartedAt = Date.now();
        isAway = true;
        engine.setAwayMode(true);
        wsClient.setBackgroundSuspended(true);
        saveTabSession({ code: currentCode, awayTime, awayVideoId, awayStartedAt });
      }
    },
    onDebugEvent(ev, data) {
      recorder.log("eng", ev, data);
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

  async function flushPendingResumeAction(via) {
    if (!pendingResumeAction) return;
    const action = pendingResumeAction;
    pendingResumeAction = null;
    suppressRevivedUntil = Date.now() + 2000;

    if (action.type === "pull_back") {
      clearAwayState({ persist: true, hideCard: true });
      suppressInitUntil = Date.now() + 4000;
      const vid = adapter.getVideoId();
      if (via === "open" && vid) {
        wsClient.send({
          type: "HELLO",
          videoId: vid,
          videoTitle: adapter.getVideoTitle(),
          mode: "resume",
          keepAway: false,
        });
      }
      overlay.setPill("");
      await adapter.waitVideoReady(1500);
      if (!wsClient.isConnected()) return;
      if (action.videoId && adapter.getVideoId() !== action.videoId) return;
      engine.setSynced(true);
      reportBgState({
        uiState: "synced",
        activeCount: Math.max(2, currentActiveCount),
        latencyMs: currentLatencyMs,
        conflict: null,
        closePopup: true,
      });
      engine.seekAndSyncTo(action.targetTime, { playing: true });
      overlay.showToast(
        `已将大家拉回 ${engine.formatTime(action.targetTime)}`,
        1800,
        "success"
      );
      return;
    }

    if (action.type === "follow") {
      clearAwayState({ persist: true, hideCard: true });
      const vid = adapter.getVideoId();
      if (via === "open") {
        wsClient.send({
          type: "HELLO",
          videoId: vid,
          videoTitle: adapter.getVideoTitle(),
          mode: "resume",
          keepAway: false,
        });
      } else if (vid) {
        wsClient.send({
          type: "SYNC_PULL",
          videoId: vid,
          videoTitle: adapter.getVideoTitle(),
          keepAway: false,
        });
      }
      overlay.showToast("正在跟进对方最新进度", 1600, "info");
    }
  }

  function openOrUpdateResumeCard({
    savedAwayVid,
    savedAwayTime,
    peerNow,
    peerPlaying,
    peerRate,
    count,
  }) {
    resumeCardOpen = true;
    resumeCardAwayTime = savedAwayTime;
    resumeCardVideoId = savedAwayVid;
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
      peerPlaying: Boolean(peerPlaying),
      peerRate: Number(peerRate) || 1,
      formatTime: engine.formatTime,
      onFollowCurrent() {
        const vid = adapter.getVideoId();
        if (returnLinkConfirmed && wsClient.isConnected()) {
          clearAwayState({ persist: true, hideCard: true });
          if (vid) {
            wsClient.send({
              type: "SYNC_PULL",
              videoId: vid,
              videoTitle: adapter.getVideoTitle(),
              keepAway: false,
            });
          }
          overlay.showToast("正在跟进对方最新进度", 1600, "info");
          return;
        }
        pendingResumeAction = {
          type: "follow",
          videoId: vid || savedAwayVid,
        };
        pendingReturnChoice = false;
        resumeCardOpen = false;
        overlay.hideResumeCard();
        overlay.showToast("正在重连并跟进对方最新进度…", 2000, "info");
        wsClient.probeOrReconnect({
          forceReconnect: false,
          onAlive() {
            returnLinkConfirmed = true;
            flushPendingResumeAction("alive");
          },
        });
      },
      async onPullBack() {
        const vid = adapter.getVideoId();
        if (returnLinkConfirmed && wsClient.isConnected()) {
          clearAwayState({ persist: true, hideCard: true });
          suppressInitUntil = Date.now() + 2500;
          await adapter.waitVideoReady(1500);
          if (!wsClient.isConnected()) return;
          if (savedAwayVid && adapter.getVideoId() !== savedAwayVid) return;
          engine.setSynced(true);
          engine.seekAndSyncTo(savedAwayTime, { playing: true });
          overlay.showToast(
            `已将大家拉回 ${engine.formatTime(savedAwayTime)}`,
            1800,
            "success"
          );
          return;
        }
        pendingResumeAction = {
          type: "pull_back",
          targetTime: savedAwayTime,
          videoId: vid || savedAwayVid,
        };
        pendingReturnChoice = false;
        resumeCardOpen = false;
        overlay.hideResumeCard();
        overlay.showToast(
          `正在重连并拉回 ${engine.formatTime(savedAwayTime)}…`,
          2000,
          "info"
        );
        wsClient.probeOrReconnect({
          forceReconnect: false,
          onAlive() {
            returnLinkConfirmed = true;
            flushPendingResumeAction("alive");
          },
        });
      },
    });
  }

  function triggerReturnFromAway() {
    if (!isAway) return;
    if (pendingResumeAction) {
      wsClient.probeOrReconnect({
        forceReconnect: false,
        onAlive() {
          returnLinkConfirmed = true;
          flushPendingResumeAction("alive");
        },
      });
      return;
    }

    const fallbackVid = resumeCardVideoId || awayVideoId || adapter.getVideoId();
    awayVideoId = fallbackVid;
    awayTime =
      (resumeCardOpen && typeof resumeCardAwayTime === "number" && resumeCardAwayTime > 0.5
        ? resumeCardAwayTime
        : null) ?? resolveReliableAwayTime(fallbackVid, awayTime);

    pendingReturnChoice = true;
    returnLinkConfirmed = false;
    returnFallbackSent = false;
    clearTimeout(returnFallbackTimer);
    clearTimeout(alignPillTimer);
    alignPillTimer = null;
    scheduleAwaySafetyCheck(10000);

    const estPeer = estimatePeerNow(awayVideoId);
    if (
      awayVideoId &&
      awayVideoId === adapter.getVideoId() &&
      typeof awayTime === "number" &&
      awayTime > 0.5 &&
      estPeer &&
      estPeer.time - awayTime > 3.0
    ) {
      openOrUpdateResumeCard({
        savedAwayVid: awayVideoId,
        savedAwayTime: awayTime,
        peerNow: estPeer.time,
        peerPlaying: estPeer.playing,
        peerRate: estPeer.playbackRate || 1,
        count: Math.max(2, currentActiveCount),
      });
    } else if (!resumeCardOpen) {
      alignPillTimer = setTimeout(() => {
        if (pendingReturnChoice && !resumeCardOpen) {
          overlay.setPill("正在对齐进度…", { tone: "amber", spinner: true });
        }
      }, 150);
    }

    const pullCurrent = (fallbackOnly = false) => {
      const vid = adapter.getVideoId();
      if (vid) {
        wsClient.send({
          type: "SYNC_PULL",
          videoId: vid,
          videoTitle: adapter.getVideoTitle(),
          keepAway: false,
          fallbackOnly,
        });
      }
    };

    wsClient.probeOrReconnect({
      forceReconnect: false,
      onAlive() {
        returnLinkConfirmed = true;
        if (pendingResumeAction) {
          flushPendingResumeAction("alive");
          return;
        }
        pullCurrent(false);
        clearTimeout(returnFallbackTimer);
        returnFallbackTimer = setTimeout(() => {
          if (pendingReturnChoice && wsClient.isConnected()) {
            returnFallbackSent = true;
            pullCurrent(true);
          }
        }, 600);
      },
    });
  }

  async function startSync(code, { userInitiated = false } = {}) {
    clearTimeout(recentClosePillTimer);
    recentClosePillTimer = null;
    if (currentUiState === "idle") {
      overlay.setPill("");
    }
    const nextCode = code || root.CONFIG.DEFAULT_CODE;
    if (root.CONFIG.SERVER_WS.includes("your-subdomain")) {
      reportBgState({
        uiState: "full",
        conflict: null,
        errorText: "未配置后端域名，请使用个人包",
      });
      overlay.showToast("未配置后端域名，请使用个人扩展包", 3000, "danger");
      return;
    }
    if ((wsClient.isConnectingOrConnected() || startingCode === nextCode) && currentCode === nextCode) {
      return;
    }
    if (userInitiated) {
      clearAwayState({ persist: false });
    }
    startingCode = nextCode;
    currentCode = nextCode;
    currentUiState = "waiting";
    waitingSinceAt = Date.now();
    saveTabSession({ code: currentCode });
    const clientId = await getOrCreateClientId();
    if (startingCode !== nextCode) return;
    startingCode = null;
    if (wsClient.isConnectingOrConnected() && currentCode === nextCode) {
      return;
    }
    wsClient.setBackgroundSuspended(false);
    engine.start();
    wsClient.connect(currentCode, clientId);

    if (!stopNavWatch) {
      stopNavWatch = adapter.watchNavigation(async ({ videoId, prevVideoId, videoTitle }) => {
        navSeq++;
        if (!wsClient.isConnected() || engine.isSoloMode()) return;
        if (videoId && videoId === prevVideoId) return;

        if (!videoId) {
          expectedRemoteVideoId = null;
          remoteNavRetryCount = 0;
          adapter.cancelPendingNavigate?.();
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
          remoteNavRetryCount = 0;
          clearTimeout(navVerifyTimer);
          navVerifyTimer = null;
          recorder.log("nav", "follow_ok", { videoId });
          engine.notifyVideoChanged();
          await notifyReadyForCurrentVideo();
          return;
        }

        if (
          expectedRemoteVideoId &&
          videoId !== expectedRemoteVideoId &&
          Date.now() - lastRemoteNavAt < 2500 &&
          !engine.hasRecentUserGesture(2000)
        ) {
          if (remoteNavRetryCount < 1) {
            remoteNavRetryCount++;
            adapter.navigateTo(expectedRemoteVideoId);
          }
          return;
        }

        expectedRemoteVideoId = null;
        remoteNavRetryCount = 0;
        adapter.cancelPendingNavigate?.();
        lastPeerState = null;
        clearAwayState({ persist: true, hideCard: true });
        saveTabSession({
          code: currentCode,
          awayTime: null,
          awayVideoId: null,
          awayStartedAt: 0,
          lastHeardVideoId: null,
          lastHeardTime: null,
          lastHeardAt: 0,
          navFollowUntil: 0,
          navTargetVideoId: null,
        });
        engine.notifyVideoChanged();
        engine.resetVersion();

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
        }
      });
    }
  }

  function stopSync({ notifyBg = true } = {}) {
    if (stopNavWatch) {
      stopNavWatch();
      stopNavWatch = null;
    }
    clearTimeout(recentClosePillTimer);
    recentClosePillTimer = null;
    clearTimeout(navVerifyTimer);
    navVerifyTimer = null;
    expectedRemoteVideoId = null;
    lastVideoChangeVersion = 0;
    lastRemoteNavVideoId = null;
    lastRemoteNavAt = 0;
    remoteNavRetryCount = 0;
    suppressPagehideLeaveUntil = 0;
    pendingNavFollow = false;
    navSeq++;
    adapter.cancelPendingNavigate?.();
    pendingResumeAction = null;
    returnLinkConfirmed = false;
    suppressInitUntil = 0;
    suppressRevivedUntil = 0;
    clearAwayState({ persist: false, hideCard: true });
    clearTabSession();
    hiddenAt = 0;
    lastReturnAt = 0;
    lastPeerState = null;
    startingCode = null;
    currentUiState = "idle";
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

  function handleForegroundResume({ elapsedMs = 0, fromPageShow = false } = {}) {
    lastReturnAt = Date.now();
    wsClient.setBackgroundSuspended(false);
    if (
      currentUiState !== "idle" &&
      currentUiState !== "full" &&
      !engine.isSoloMode() &&
      !document.pictureInPictureElement
    ) {
      if (isAway) {
        awayTime = resolveReliableAwayTime(awayVideoId || adapter.getVideoId(), awayTime);
        engine.setAwayMode(true);
        triggerReturnFromAway();
      } else {
        const vid = adapter.getVideoId();
        const video = adapter.getVideoElement();
        if (vid && !engine.isDecisionLocked()) {
          awayVideoId = vid;
          awayTime = resolveReliableAwayTime(vid, video ? video.currentTime : null);
          awayStartedAt = Date.now() - Math.max(elapsedMs, 0);
          isAway = true;
          engine.setAwayMode(true);
          triggerReturnFromAway();
        } else {
          wsClient.probeOrReconnect();
        }
      }
    } else if (!isAway && currentUiState !== "idle") {
      wsClient.probeOrReconnect();
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      const vid = adapter.getVideoId();
      const video = adapter.getVideoElement();
      if (vid && video && !engine.isSoloMode() && currentUiState !== "idle") {
        saveHeardProgress(vid, video.currentTime, {
          allowZero: false,
          readyState: video.readyState,
        });
        if (
          video.paused &&
          currentUiState !== "full" &&
          !isAway &&
          !document.pictureInPictureElement
        ) {
          awayVideoId = vid;
          awayTime = resolveReliableAwayTime(vid, video.currentTime);
          awayStartedAt = Date.now();
          isAway = true;
          engine.setAwayMode(true);
          wsClient.setBackgroundSuspended(true);
          saveTabSession({ code: currentCode, awayTime, awayVideoId, awayStartedAt });
        }
      }
      return;
    }

    if (document.visibilityState === "visible") {
      const hiddenElapsed = hiddenAt > 0 ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      handleForegroundResume({ elapsedMs: hiddenElapsed, fromPageShow: false });
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
        const vid = adapter.getVideoId();
        awayVideoId = vid;
        awayTime = resolveReliableAwayTime(vid, video ? video.currentTime : null);
        awayStartedAt = Date.now();
        isAway = true;
        engine.setAwayMode(true);
        saveTabSession({ code: currentCode, awayTime, awayVideoId, awayStartedAt });
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
    recorder.flushNow();
    if (e.persisted || Date.now() < suppressPagehideLeaveUntil) {
      wsClient.suspendForPageCache();
    } else if (wsClient.isConnected()) {
      wsClient.disconnect();
    }
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted && currentUiState !== "idle") {
      const hiddenElapsed = hiddenAt > 0 ? Date.now() - hiddenAt : 2000;
      hiddenAt = 0;
      handleForegroundResume({ elapsedMs: hiddenElapsed, fromPageShow: true });
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "CS_CONNECT") {
      startSync(msg.code, { userInitiated: msg.source !== "auto" });
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
    if (msg?.type === "CS_CLEAR_DEBUG") {
      recorder.clear().then(() => sendResponse({ ok: true }));
      return true;
    }
    if (msg?.type === "CS_EXPORT_DEBUG") {
      (async () => {
        await recorder.ready?.catch?.(() => {});
        await recorder.flushNow();
        let resMsg = null;
        let serverStatus = "offline";
        if (wsClient.isConnected()) {
          const reqId = `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
          resMsg = await new Promise((resolve) => {
            const timer = setTimeout(() => {
              if (pendingExportResolve?.reqId === reqId) {
                pendingExportResolve = null;
                resolve(null);
              }
            }, 1800);
            pendingExportResolve = {
              reqId,
              resolve(data) {
                clearTimeout(timer);
                resolve(data);
              },
            };
            wsClient.send({ type: "DEBUG_DUMP_REQ", reqId, clientNow: Date.now() });
          });
          if (!resMsg) serverStatus = "timeout";
        }
        const payload = recorder.buildExportPayload({
          code: currentCode,
          serverDump: resMsg?.serverDump || null,
          peerDump: resMsg?.peerDump || null,
          peerStatus: resMsg?.peerStatus || (wsClient.isConnected() ? "timeout" : "offline"),
          serverStatus,
        });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        sendResponse({
          ok: true,
          filename: `yt-sync-debug-${stamp}.json`,
          json: JSON.stringify(payload, null, 2),
        });
      })();
      return true;
    }
    return false;
  });

  // Auto-resume sync if this tab owns the active session or retains a valid tab session.
  chrome.runtime
    .sendMessage({ type: "BG_GET_TAB_SYNC" })
    .then(async (res) => {
      const tabSess = readTabSessionRaw();
      const targetCode = res?.shouldSync && res.code ? res.code : tabSess?.code;
      if (!targetCode) {
        const reopenVid = adapter.getVideoId();
        if (reopenVid && currentUiState === "idle" && !startingCode) {
          const recent = await chrome.runtime
            .sendMessage({ type: "BG_CHECK_RECENT_CLOSE", videoId: reopenVid })
            .catch(() => null);
          if (
            recent?.canReconnect &&
            recent.code &&
            currentUiState === "idle" &&
            !startingCode &&
            !wsClient.isConnectingOrConnected()
          ) {
            overlay.setActionPill({
              text: "检测到刚断开的同步房间",
              actionLabel: "一键重连",
              async onAction() {
                clearTimeout(recentClosePillTimer);
                recentClosePillTimer = null;
                await chrome.runtime
                  .sendMessage({ type: "BG_RECLAIM_TAB", code: recent.code })
                  .catch(() => {});
                await chrome.runtime
                  .sendMessage({ type: "BG_CLEAR_RECENT_CLOSE" })
                  .catch(() => {});
                startSync(recent.code, { userInitiated: true });
              },
            });
            clearTimeout(recentClosePillTimer);
            recentClosePillTimer = setTimeout(() => {
              recentClosePillTimer = null;
              if (currentUiState === "idle") {
                overlay.setPill("");
              }
            }, 15000);
          }
        }
        return;
      }

      if (!res?.shouldSync) {
        await chrome.runtime
          .sendMessage({ type: "BG_RECLAIM_TAB", code: targetCode })
          .catch(() => {});
      }

      const currentVid = adapter.getVideoId();
      const isNavFollowBoot = Boolean(
        tabSess?.navFollowUntil && Date.now() < tabSess.navFollowUntil
      );
      if (isNavFollowBoot) {
        pendingNavFollow = true;
        saveTabSession({
          code: targetCode,
          navFollowUntil: 0,
          navTargetVideoId: null,
        });
      } else if (
        tabSess?.awayVideoId &&
        tabSess.awayVideoId === currentVid &&
        typeof tabSess.awayTime === "number" &&
        tabSess.awayTime > 0.5
      ) {
        isAway = true;
        awayTime = tabSess.awayTime;
        awayVideoId = tabSess.awayVideoId;
        awayStartedAt = tabSess.awayStartedAt || Date.now();
        pendingReturnChoice = true;
        engine.setAwayMode(true);
      } else if (
        tabSess?.lastHeardVideoId &&
        tabSess.lastHeardVideoId === currentVid &&
        typeof tabSess.lastHeardTime === "number" &&
        tabSess.lastHeardTime > 0.5 &&
        Date.now() - (tabSess.lastHeardAt || 0) >= 3000
      ) {
        isAway = true;
        awayTime = tabSess.lastHeardTime;
        awayVideoId = tabSess.lastHeardVideoId;
        awayStartedAt = tabSess.lastHeardAt || Date.now();
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
