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
  let lastAlignToastAt = 0;
  let stopNavWatch = null;
  let wsClient = null;
  let engine = null;

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
    chrome.runtime.sendMessage({ type: "BG_UPDATE_STATE", ...patch }).catch(() => {});
  }

  async function notifyReadyForCurrentVideo() {
    const vid = adapter.getVideoId();
    if (!vid) return;
    engine.forcePauseLocal();
    await adapter.waitVideoReady(1500);
    if (!wsClient.isConnected()) return;
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
              wsClient.send({
                type: "SYNC_PULL",
                videoId: vid,
                videoTitle: adapter.getVideoTitle(),
                keepAway: false,
                fallbackOnly: true,
              });
            }
          }
        }, 1000);
      }
      wsClient.send({
        type: "HELLO",
        videoId: adapter.getVideoId(),
        videoTitle: adapter.getVideoTitle(),
        mode: pendingReturnChoice || resumeCardOpen ? "resume" : "initial",
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

    onClose() {
      // Handled by explicit stopSync or onRoomFull.
    },

    async onMessage(msg) {
      switch (msg.type) {
        case "WAITING": {
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
          if (msg.autoFollow) {
            pendingResumeAction = null;
            clearAwayState({ persist: true, hideCard: true });
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
          if (isAway || resumeCardOpen || pendingResumeAction) {
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
            expectedRemoteVideoId = msg.videoId;
            adapter.navigateTo(msg.videoId);
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
          engine.applyInitialState(msg);
          overlay.showToast("已对齐进度，开始同步", 1800, "success");
          break;
        }

        case "CONTROL": {
          if (engine.isSoloMode()) return;
          if (msg.action !== "video_change") {
            recordPeerState(msg);
          }
          if (engine.isDecisionLocked() || pendingReturnChoice) return;
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

        default:
          break;
      }
    },
  });

  function shieldLaggingAction(
    videoId,
    currentTime,
    { hadUserGesture = false, checkRecentReturn = false } = {}
  ) {
    if (!videoId || typeof currentTime !== "number" || !Number.isFinite(currentTime)) {
      return true;
    }
    const peer = estimatePeerNow(videoId);
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
      });
    },
    beforeEmitSeek({ videoId, currentTime, hadUserGesture }) {
      return shieldLaggingAction(videoId, currentTime, {
        hadUserGesture,
        checkRecentReturn: false,
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
            pullCurrent(true);
          }
        }, 1000);
      },
    });
  }

  async function startSync(code, { userInitiated = false } = {}) {
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
    if (e.persisted) {
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

      const currentVid = adapter.getVideoId();
      if (
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
