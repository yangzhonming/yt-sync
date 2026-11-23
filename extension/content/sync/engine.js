(() => {
  const root = (window.YTSync = window.YTSync || {});

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
  }

  function createSyncEngine({
    adapter,
    overlay,
    send,
    onBackgroundPause,
    onProgressTick,
    onSlowSeekFinished,
    beforeEmitPlay,
    beforeEmitSeek,
    onBlockedAction,
  }) {
    const { CONFIG } = root;

    let active = false;
    let synced = false;
    let inAd = false;
    let awayMode = false;
    let soloMode = false;
    let decisionLocked = false;
    let catchupActive = false;
    let baseRate = 1;
    let lastAppliedVersion = 0;
    let initGuardUntil = 0;
    let lastUserGestureAt = 0;

    function markUserGesture() {
      lastUserGestureAt = Date.now();
    }

    function hasRecentUserGesture(windowMs = 2000) {
      return lastUserGestureAt > 0 && Date.now() - lastUserGestureAt < windowMs;
    }

    function notifyBlockedIfAligning() {
      if (awayMode && !decisionLocked && !soloMode && active && hasRecentUserGesture(1500)) {
        onBlockedAction?.();
      }
    }

    let lastRemoteRateSetAt = 0;
    let expectedRemoteRate = 1;
    let lastConflictToastAt = 0;

    let boundVideo = null;
    let videoPollTimer = null;
    let adTimer = null;
    let seekDebounceTimer = null;
    let initVerifyTimer = null;
    let pendingMetaCleanup = null;

    function clearPendingMeta() {
      if (pendingMetaCleanup) {
        pendingMetaCleanup();
        pendingMetaCleanup = null;
      }
    }

    // Idempotent state-based play/pause deduplication, target-based seek ledger,
    // and target-matched ratechange lock.
    const locks = { rate: 0, rateTarget: null };
    let syncedPlaying = null;
    let remoteToggleGuardUntil = 0;
    let pendingRemoteSeekTarget = null;
    let pendingRemoteSeekAt = 0;
    let pendingRemoteSeekIsAutoRealign = false;
    let lastProgressTickAt = 0;

    function armRateLock(targetRate = null) {
      locks.rate = Date.now() + CONFIG.ECHO_TTL_MS;
      locks.rateTarget = typeof targetRate === "number" ? targetRate : null;
    }

    function consumeRateLock(actualRate) {
      if (locks.rate > Date.now()) {
        const target = locks.rateTarget;
        locks.rate = 0;
        locks.rateTarget = null;
        if (
          target === null ||
          typeof actualRate !== "number" ||
          Math.abs(actualRate - target) <= 0.02
        ) {
          return true;
        }
        return false;
      }
      locks.rate = 0;
      locks.rateTarget = null;
      return false;
    }

    function setRemotePlayingTarget(playing) {
      syncedPlaying = Boolean(playing);
      remoteToggleGuardUntil = Date.now() + 600;
    }

    function setRemoteSeekTarget(targetTime, { isAutoRealign = false } = {}) {
      pendingRemoteSeekTarget = targetTime;
      pendingRemoteSeekAt = Date.now();
      pendingRemoteSeekIsAutoRealign = Boolean(isAutoRealign);
    }

    function clearRemoteSeekTarget() {
      pendingRemoteSeekTarget = null;
      pendingRemoteSeekAt = 0;
      pendingRemoteSeekIsAutoRealign = false;
    }

    function safePlay(video) {
      if (!video || !video.paused) return;
      setRemotePlayingTarget(true);
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch((err) => {
          if (err?.name === "NotAllowedError") {
            syncedPlaying = false;
            overlay.showUnlock(() => {
              const v = adapter.getVideoElement();
              if (!v) return;
              setRemotePlayingTarget(true);
              v.play().catch(() => {});
              // Re-query latest state after unlocking on mobile.
              const vid = adapter.getVideoId();
              if (vid) {
                send({
                  type: "READY",
                  videoId: vid,
                  videoTitle: adapter.getVideoTitle(),
                });
              }
            });
          }
        });
      }
    }

    function forcePauseLocal() {
      const video = adapter.getVideoElement();
      if (video && !video.paused) {
        setRemotePlayingTarget(false);
        video.pause();
      }
    }

    function readSnapshot() {
      const video = adapter.getVideoElement();
      if (video && !catchupActive) {
        baseRate = video.playbackRate || 1;
      }
      return {
        videoId: adapter.getVideoId(),
        videoTitle: adapter.getVideoTitle(),
        currentTime: video ? Number(video.currentTime.toFixed(3)) : 0,
        playbackRate: baseRate || 1,
        playing: video ? !video.paused : false,
      };
    }

    function emitControl(action) {
      if (!active || !synced || inAd || soloMode || awayMode || decisionLocked) return;
      const videoId = adapter.getVideoId();
      if (!videoId) return;
      const video = adapter.getVideoElement();
      send({
        type: "CONTROL",
        action,
        videoId,
        videoTitle: adapter.getVideoTitle(),
        currentTime: video ? Number(video.currentTime.toFixed(3)) : 0,
        playbackRate: baseRate,
        playing: video ? !video.paused : false,
      });
    }

    function applyRemoteState(
      msg,
      { forceSeek = false, showToast = false, isInitial = false, isAutoRealign = false } = {}
    ) {
      if (inAd || soloMode || awayMode || decisionLocked) return;
      const localVid = adapter.getVideoId();
      if (msg.videoId && localVid && msg.videoId !== localVid) return;

      if (typeof msg.version === "number") {
        if (msg.version < lastAppliedVersion) return;
        lastAppliedVersion = msg.version;
      }

      const video = adapter.getVideoElement();
      if (!video) return;

      const rate = Number(msg.playbackRate) || 1;
      const playing = Boolean(msg.playing);
      const delay = Number(msg.totalDelay) || 0;
      const targetTime = Math.max(
        0,
        (Number(msg.currentTime) || 0) + (playing ? delay * rate : 0)
      );

      const isSeekOnly = !isInitial && msg.action === "seek";
      const isPauseAction = !isInitial && msg.action === "pause";
      const seekThreshold = isPauseAction ? 1.5 : 0.4;

      baseRate = rate;
      catchupActive = false;

      if (Math.abs(video.playbackRate - rate) > 0.01) {
        lastRemoteRateSetAt = Date.now();
        expectedRemoteRate = rate;
        armRateLock(rate);
        video.playbackRate = rate;
      }

      if (forceSeek || Math.abs(video.currentTime - targetTime) > seekThreshold) {
        setRemoteSeekTarget(targetTime, { isAutoRealign });
        video.currentTime = targetTime;
      }

      if (!isSeekOnly) {
        if (playing) {
          setRemotePlayingTarget(true);
          if (video.paused) {
            safePlay(video);
          }
        } else {
          setRemotePlayingTarget(false);
          if (!video.paused) {
            video.pause();
          }
        }
      }

      if (showToast && msg.action) {
        const labels = {
          play: "对方开始播放",
          pause: "对方暂停了",
          seek: `对方跳转至 ${formatTime(targetTime)}`,
          rate: `对方调至 ${rate}x 倍速`,
        };
        if (labels[msg.action]) {
          overlay.showToast(labels[msg.action], 1600, "info");
        }
      }
    }

    function applyInitialState(msg) {
      clearTimeout(initVerifyTimer);
      clearPendingMeta();
      const receivedAt = Date.now();
      initGuardUntil = receivedAt + 1500;
      applyRemoteState(msg, { forceSeek: true, showToast: false, isInitial: true });

      const initialVideo = adapter.getVideoElement();
      if (initialVideo && initialVideo.readyState < 1) {
        const rate = Number(msg.playbackRate) || 1;
        const playing = Boolean(msg.playing);
        const delay = Number(msg.totalDelay) || 0;
        let metaTimer = null;
        const onMeta = () => {
          clearPendingMeta();
          if (!active || !synced || inAd || soloMode || awayMode || decisionLocked) return;
          const localVid = adapter.getVideoId();
          if (msg.videoId && localVid && msg.videoId !== localVid) return;
          const elapsedSec = Math.max(0, (Date.now() - receivedAt) / 1000);
          const expectedTime = Math.max(
            0,
            (Number(msg.currentTime) || 0) + (playing ? (delay + elapsedSec) * rate : 0)
          );
          initGuardUntil = Date.now() + 1500;
          applyRemoteState(
            { ...msg, currentTime: expectedTime, totalDelay: 0 },
            { forceSeek: true, showToast: false, isInitial: true }
          );
        };
        initialVideo.addEventListener("loadedmetadata", onMeta);
        metaTimer = setTimeout(clearPendingMeta, 10000);
        pendingMetaCleanup = () => {
          clearTimeout(metaTimer);
          initialVideo.removeEventListener("loadedmetadata", onMeta);
        };
      }

      initVerifyTimer = setTimeout(() => {
        if (!active || !synced || inAd) return;
        const localVid = adapter.getVideoId();
        if (msg.videoId && localVid && msg.videoId !== localVid) return;
        const video = adapter.getVideoElement();
        if (!video) return;

        const rate = Number(msg.playbackRate) || 1;
        const playing = Boolean(msg.playing);
        const delay = Number(msg.totalDelay) || 0;
        const expectedTime = Math.max(
          0,
          (Number(msg.currentTime) || 0) + (playing ? (delay + 0.9) * rate : 0)
        );

        const rateMismatch = Math.abs(video.playbackRate - rate) > 0.01;
        const timeMismatch = Math.abs(video.currentTime - expectedTime) > 0.6;
        const stateMismatch = playing ? video.paused : !video.paused;

        if (rateMismatch || timeMismatch || stateMismatch) {
          applyRemoteState(
            { ...msg, currentTime: expectedTime, totalDelay: 0 },
            { forceSeek: timeMismatch, showToast: false, isInitial: true }
          );
        }
      }, 900);
    }

    function seekAndSyncTo(targetTime, { playing = true } = {}) {
      const video = adapter.getVideoElement();
      const videoId = adapter.getVideoId();
      if (!video || !videoId) return;

      const clamped = Math.max(0, Number(targetTime) || 0);
      setRemoteSeekTarget(clamped);
      video.currentTime = clamped;

      if (playing) {
        setRemotePlayingTarget(true);
        if (video.paused) {
          safePlay(video);
        }
      } else {
        setRemotePlayingTarget(false);
        if (!video.paused) {
          video.pause();
        }
      }

      const payloadBase = {
        type: "CONTROL",
        videoId,
        videoTitle: adapter.getVideoTitle(),
        currentTime: Number(clamped.toFixed(3)),
        playbackRate: baseRate,
        playing: Boolean(playing),
      };
      send({ ...payloadBase, action: "seek" });
      send({ ...payloadBase, action: playing ? "play" : "pause" });
    }

    function handleDriftCheck(msg, { seekThresholdSec = 1.5 } = {}) {
      if (!active || !synced || inAd || soloMode || awayMode || decisionLocked) return;
      const localVid = adapter.getVideoId();
      if (!localVid || msg.videoId !== localVid) return;

      const video = adapter.getVideoElement();
      if (!video || !msg.playing || video.paused) {
        if (catchupActive && video) {
          armRateLock(baseRate);
          video.playbackRate = baseRate;
          catchupActive = false;
        }
        return;
      }

      const rate = Number(msg.playbackRate) || baseRate || 1;
      const delay = Number(msg.totalDelay) || 0;
      const targetTime = Math.max(0, (Number(msg.currentTime) || 0) + delay * rate);
      const diff = targetTime - video.currentTime;
      const absDiff = Math.abs(diff);

      if (absDiff < 0.35) {
        if (catchupActive) {
          armRateLock(baseRate);
          video.playbackRate = baseRate;
          catchupActive = false;
        }
        return;
      }

      if (absDiff <= seekThresholdSec) {
        const nudge = diff > 0 ? baseRate * 1.08 : baseRate * 0.92;
        const rounded = Number(nudge.toFixed(3));
        if (Math.abs(video.playbackRate - rounded) > 0.005) {
          lastRemoteRateSetAt = Date.now();
          expectedRemoteRate = rounded;
          armRateLock(rounded);
          video.playbackRate = rounded;
        }
        catchupActive = true;
        return;
      }

      if (catchupActive) {
        armRateLock(baseRate);
        video.playbackRate = baseRate;
        catchupActive = false;
      }
      setRemoteSeekTarget(targetTime, { isAutoRealign: true });
      video.currentTime = targetTime;
    }

    function onPlay() {
      if (awayMode || decisionLocked || soloMode) {
        notifyBlockedIfAligning();
        return;
      }
      if (Date.now() < initGuardUntil && !hasRecentUserGesture(1500)) return;
      if (!active || !synced || inAd) return;
      if (syncedPlaying === true) return;
      if (Date.now() < remoteToggleGuardUntil && syncedPlaying === false) return;
      const video = boundVideo || adapter.getVideoElement();
      const vid = adapter.getVideoId();
      if (
        beforeEmitPlay &&
        beforeEmitPlay({
          videoId: vid,
          currentTime: video ? video.currentTime : null,
          hadUserGesture: hasRecentUserGesture(2000),
        }) === false
      ) {
        return;
      }
      syncedPlaying = true;
      emitControl("play");
    }

    function onPause() {
      if (document.visibilityState === "hidden") {
        if (!active || soloMode || awayMode || decisionLocked || inAd) return;
        const video = boundVideo || adapter.getVideoElement();
        onBackgroundPause?.({
          videoId: adapter.getVideoId(),
          currentTime: video ? video.currentTime : null,
        });
        return;
      }
      if (awayMode || decisionLocked || soloMode) {
        notifyBlockedIfAligning();
        return;
      }
      if (Date.now() < initGuardUntil && !hasRecentUserGesture(1500)) return;
      if (!active || !synced || inAd) return;
      if (syncedPlaying === false) return;
      if (Date.now() < remoteToggleGuardUntil && syncedPlaying === true) return;
      syncedPlaying = false;
      emitControl("pause");
    }

    function onSeeked() {
      const video = boundVideo || adapter.getVideoElement();
      if (!video) return;

      if (pendingRemoteSeekTarget !== null) {
        const elapsedMs = Date.now() - pendingRemoteSeekAt;
        const isExpired = elapsedMs > 15000;
        const isEcho =
          !isExpired && Math.abs(video.currentTime - pendingRemoteSeekTarget) <= 0.8;
        const wasAutoRealign = pendingRemoteSeekIsAutoRealign;
        clearRemoteSeekTarget();
        if (isEcho) {
          if (
            !wasAutoRealign &&
            elapsedMs >= 1500 &&
            !video.paused &&
            active &&
            synced &&
            !awayMode &&
            !decisionLocked &&
            !soloMode &&
            !inAd
          ) {
            onSlowSeekFinished?.({ videoId: adapter.getVideoId(), elapsedMs });
          }
          return;
        }
      }

      if (awayMode || decisionLocked || soloMode) {
        notifyBlockedIfAligning();
        return;
      }
      if (Date.now() < initGuardUntil && !hasRecentUserGesture(1500)) return;
      if (!active || !synced || inAd) return;
      clearTimeout(seekDebounceTimer);
      seekDebounceTimer = setTimeout(() => {
        if (
          active &&
          synced &&
          !inAd &&
          !awayMode &&
          !decisionLocked &&
          !soloMode &&
          (Date.now() >= initGuardUntil || hasRecentUserGesture(1500))
        ) {
          const curVideo = boundVideo || adapter.getVideoElement();
          if (
            beforeEmitSeek &&
            curVideo &&
            beforeEmitSeek({
              videoId: adapter.getVideoId(),
              currentTime: curVideo.currentTime,
              hadUserGesture: hasRecentUserGesture(2000),
            }) === false
          ) {
            return;
          }
          emitControl("seek");
        }
      }, CONFIG.SEEK_DEBOUNCE_MS);
    }

    function onTimeUpdate() {
      const video = boundVideo || adapter.getVideoElement();
      if (!video) return;

      if (
        pendingRemoteSeekTarget !== null &&
        !video.seeking &&
        (Date.now() - pendingRemoteSeekAt > 15000 ||
          Math.abs(video.currentTime - pendingRemoteSeekTarget) > 2.0)
      ) {
        clearRemoteSeekTarget();
      }

      if (active && !inAd && !video.seeking && !video.paused && !awayMode && !decisionLocked) {
        const now = Date.now();
        if (now - lastProgressTickAt >= 1000) {
          lastProgressTickAt = now;
          onProgressTick?.({
            videoId: adapter.getVideoId(),
            currentTime: video.currentTime,
            readyState: video.readyState,
          });
        }
      }
    }

    function onRateChange() {
      const video = boundVideo || adapter.getVideoElement();
      if (!video) return;
      if (consumeRateLock(video.playbackRate)) return;
      if (awayMode || decisionLocked || soloMode) return;
      if (Date.now() < initGuardUntil && !hasRecentUserGesture(1500)) return;
      if (!active || !synced || inAd) return;

      if (
        lastRemoteRateSetAt > 0 &&
        Date.now() - lastRemoteRateSetAt < 600 &&
        !hasRecentUserGesture(1500) &&
        Math.abs(video.playbackRate - expectedRemoteRate) > 0.02
      ) {
        if (Date.now() - lastConflictToastAt > 15000) {
          lastConflictToastAt = Date.now();
          overlay.showToast("检测到倍速被强制改回，建议关闭 Global Speed", 3000, "warn");
        }
        return;
      }

      baseRate = video.playbackRate;
      catchupActive = false;
      emitControl("rate");
    }

    function onKeyDown(e) {
      if (!active || inAd) return;
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest?.('[contenteditable="true"]'))
      ) {
        return;
      }

      const key = typeof e.key === "string" ? e.key.toLowerCase() : "";
      if (key !== "a" && key !== "d" && key !== "s") return;

      const video = adapter.getVideoElement();
      if (!video) return;

      if (awayMode && !decisionLocked && !soloMode && active) {
        onBlockedAction?.();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const cur = catchupActive ? baseRate : video.playbackRate || baseRate || 1;
      let nextRate = cur;
      if (key === "d") {
        nextRate = Math.min(4.0, Math.round((cur + 0.1) * 10) / 10);
      } else if (key === "a") {
        nextRate = Math.max(0.2, Math.round((cur - 0.1) * 10) / 10);
      } else if (key === "s") {
        nextRate = 1.0;
      }

      baseRate = nextRate;
      catchupActive = false;
      lastRemoteRateSetAt = 0;
      armRateLock(nextRate);
      video.playbackRate = nextRate;
      overlay.showToast(
        `${soloMode ? "先看倍速" : "倍速"} ${nextRate.toFixed(1)}x`,
        1200,
        "info"
      );

      if (!soloMode && synced) {
        emitControl("rate");
      }
    }

    function unbindVideo() {
      if (!boundVideo) return;
      boundVideo.removeEventListener("play", onPlay);
      boundVideo.removeEventListener("pause", onPause);
      boundVideo.removeEventListener("seeked", onSeeked);
      boundVideo.removeEventListener("timeupdate", onTimeUpdate);
      boundVideo.removeEventListener("ratechange", onRateChange);
      boundVideo = null;
      syncedPlaying = null;
      remoteToggleGuardUntil = 0;
      clearRemoteSeekTarget();
    }

    function bindVideoIfNeeded() {
      const video = adapter.getVideoElement();
      if (!video || video === boundVideo) return;
      unbindVideo();
      boundVideo = video;
      baseRate = video.playbackRate || 1;
      if (syncedPlaying === null) {
        syncedPlaying = !video.paused;
      }
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("ratechange", onRateChange);
    }

    function checkAdTransition() {
      if (!active) return;
      const nowAd = adapter.isAdPlaying();
      if (nowAd === inAd) return;
      inAd = nowAd;

      if (inAd) {
        send({ type: "STATUS", status: "ad_start" });
      } else {
        send({ type: "STATUS", status: "ad_end" });
        const vid = adapter.getVideoId();
        if (synced && vid) {
          send({
            type: "READY",
            videoId: vid,
            videoTitle: adapter.getVideoTitle(),
          });
        }
      }
    }

    function start() {
      if (active) return;
      active = true;
      lastAppliedVersion = 0;
      inAd = adapter.isAdPlaying();
      bindVideoIfNeeded();
      window.addEventListener("pointerdown", markUserGesture, true);
      window.addEventListener("pointerup", markUserGesture, true);
      window.addEventListener("touchstart", markUserGesture, true);
      window.addEventListener("touchend", markUserGesture, true);
      window.addEventListener("keydown", markUserGesture, true);
      window.addEventListener("keydown", onKeyDown, true);

      videoPollTimer = setInterval(bindVideoIfNeeded, 800);
      adTimer = setInterval(checkAdTransition, 500);
    }

    function stop() {
      active = false;
      synced = false;
      inAd = false;
      awayMode = false;
      soloMode = false;
      decisionLocked = false;
      catchupActive = false;
      initGuardUntil = 0;
      lastUserGestureAt = 0;
      lastRemoteRateSetAt = 0;
      lastConflictToastAt = 0;
      syncedPlaying = null;
      remoteToggleGuardUntil = 0;
      lastProgressTickAt = 0;
      clearRemoteSeekTarget();
      window.removeEventListener("pointerdown", markUserGesture, true);
      window.removeEventListener("pointerup", markUserGesture, true);
      window.removeEventListener("touchstart", markUserGesture, true);
      window.removeEventListener("touchend", markUserGesture, true);
      window.removeEventListener("keydown", markUserGesture, true);
      window.removeEventListener("keydown", onKeyDown, true);
      clearTimeout(seekDebounceTimer);
      clearTimeout(initVerifyTimer);
      clearPendingMeta();
      clearInterval(videoPollTimer);
      clearInterval(adTimer);
      videoPollTimer = null;
      adTimer = null;
      unbindVideo();
    }

    return {
      start,
      stop,
      formatTime,
      setSynced(val) {
        synced = Boolean(val);
        if (!synced) {
          lastAppliedVersion = 0;
          syncedPlaying = null;
          remoteToggleGuardUntil = 0;
          clearRemoteSeekTarget();
        } else if (syncedPlaying === null) {
          const v = boundVideo || adapter.getVideoElement();
          if (v) syncedPlaying = !v.paused;
        }
      },
      setAwayMode(val) {
        awayMode = Boolean(val);
      },
      setSoloMode(val) {
        soloMode = Boolean(val);
      },
      setDecisionLocked(val) {
        decisionLocked = Boolean(val);
      },
      armInitGuard(durationMs = 2500) {
        initGuardUntil = Math.max(initGuardUntil, Date.now() + durationMs);
      },
      isSoloMode: () => soloMode,
      isDecisionLocked: () => decisionLocked,
      isSynced: () => synced,
      readSnapshot,
      forcePauseLocal,
      applyRemoteState,
      applyInitialState,
      seekAndSyncTo,
      handleDriftCheck,
      resetVersion() {
        lastAppliedVersion = 0;
      },
    };
  }

  root.createSyncEngine = createSyncEngine;
})();
