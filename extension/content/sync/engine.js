(() => {
  const root = (window.YTSync = window.YTSync || {});

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
  }

  function createSyncEngine({ adapter, overlay, send, onBackgroundPause }) {
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

    let lastRemoteRateSetAt = 0;
    let expectedRemoteRate = 1;
    let lastConflictToastAt = 0;

    let boundVideo = null;
    let videoPollTimer = null;
    let adTimer = null;
    let seekDebounceTimer = null;
    let initVerifyTimer = null;

    // Consume-to-release Echo Guard locks with 400ms TTL safety fallback.
    const locks = { play: 0, pause: 0, seek: 0, rate: 0 };

    function armLock(type) {
      locks[type] = Date.now() + CONFIG.ECHO_TTL_MS;
    }

    function consumeLock(type) {
      if (locks[type] > Date.now()) {
        locks[type] = 0;
        return true;
      }
      locks[type] = 0;
      return false;
    }

    function safePlay(video) {
      if (!video || !video.paused) return;
      armLock("play");
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch((err) => {
          if (err?.name === "NotAllowedError") {
            overlay.showUnlock(() => {
              const v = adapter.getVideoElement();
              if (!v) return;
              armLock("play");
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
        armLock("pause");
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

    function applyRemoteState(msg, { forceSeek = false, showToast = false } = {}) {
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

      baseRate = rate;
      catchupActive = false;

      if (Math.abs(video.playbackRate - rate) > 0.01) {
        lastRemoteRateSetAt = Date.now();
        expectedRemoteRate = rate;
        armLock("rate");
        video.playbackRate = rate;
      }

      if (forceSeek || Math.abs(video.currentTime - targetTime) > 0.4) {
        armLock("seek");
        video.currentTime = targetTime;
      }

      if (playing && video.paused) {
        safePlay(video);
      } else if (!playing && !video.paused) {
        armLock("pause");
        video.pause();
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
      initGuardUntil = Date.now() + 1500;
      applyRemoteState(msg, { forceSeek: true, showToast: false });

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
            { forceSeek: timeMismatch, showToast: false }
          );
        }
      }, 900);
    }

    function seekAndSyncTo(targetTime, { playing = true } = {}) {
      const video = adapter.getVideoElement();
      const videoId = adapter.getVideoId();
      if (!video || !videoId) return;

      const clamped = Math.max(0, Number(targetTime) || 0);
      armLock("seek");
      video.currentTime = clamped;

      if (playing && video.paused) {
        safePlay(video);
      } else if (!playing && !video.paused) {
        armLock("pause");
        video.pause();
      }

      send({
        type: "CONTROL",
        action: "seek",
        videoId,
        videoTitle: adapter.getVideoTitle(),
        currentTime: Number(clamped.toFixed(3)),
        playbackRate: baseRate,
        playing: Boolean(playing),
      });
    }

    function handleDriftCheck(msg) {
      if (!active || !synced || inAd || soloMode || awayMode || decisionLocked) return;
      const localVid = adapter.getVideoId();
      if (!localVid || msg.videoId !== localVid) return;

      const video = adapter.getVideoElement();
      if (!video || !msg.playing || video.paused) {
        if (catchupActive && video) {
          armLock("rate");
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

      if (absDiff < 0.4) {
        if (catchupActive) {
          armLock("rate");
          video.playbackRate = baseRate;
          catchupActive = false;
        }
        return;
      }

      if (absDiff <= 2.0) {
        const nudge = diff > 0 ? baseRate * 1.05 : baseRate * 0.95;
        const rounded = Number(nudge.toFixed(3));
        if (Math.abs(video.playbackRate - rounded) > 0.005) {
          lastRemoteRateSetAt = Date.now();
          expectedRemoteRate = rounded;
          armLock("rate");
          video.playbackRate = rounded;
        }
        catchupActive = true;
        return;
      }

      if (catchupActive) {
        armLock("rate");
        video.playbackRate = baseRate;
        catchupActive = false;
      }
      armLock("seek");
      video.currentTime = targetTime;
    }

    function isEventSuppressed(type) {
      if (consumeLock(type)) return true;
      if (awayMode || decisionLocked || soloMode || Date.now() < initGuardUntil) return true;
      return !active || !synced || inAd;
    }

    function onPlay() {
      if (isEventSuppressed("play")) return;
      emitControl("play");
    }

    function onPause() {
      if (isEventSuppressed("pause")) return;
      if (document.visibilityState === "hidden") {
        const video = boundVideo || adapter.getVideoElement();
        onBackgroundPause?.({
          videoId: adapter.getVideoId(),
          currentTime: video ? video.currentTime : null,
        });
        return;
      }
      emitControl("pause");
    }

    function onSeeked() {
      if (isEventSuppressed("seek")) return;
      clearTimeout(seekDebounceTimer);
      seekDebounceTimer = setTimeout(() => {
        if (!awayMode && !decisionLocked && !soloMode && Date.now() >= initGuardUntil) {
          emitControl("seek");
        }
      }, CONFIG.SEEK_DEBOUNCE_MS);
    }

    function onRateChange() {
      if (isEventSuppressed("rate")) return;
      const video = boundVideo || adapter.getVideoElement();
      if (!video) return;

      if (
        lastRemoteRateSetAt > 0 &&
        Date.now() - lastRemoteRateSetAt < 600 &&
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
      armLock("rate");
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
      boundVideo.removeEventListener("ratechange", onRateChange);
      boundVideo = null;
    }

    function bindVideoIfNeeded() {
      const video = adapter.getVideoElement();
      if (!video || video === boundVideo) return;
      unbindVideo();
      boundVideo = video;
      baseRate = video.playbackRate || 1;
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("seeked", onSeeked);
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
      lastRemoteRateSetAt = 0;
      lastConflictToastAt = 0;
      window.removeEventListener("keydown", onKeyDown, true);
      clearTimeout(seekDebounceTimer);
      clearTimeout(initVerifyTimer);
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
        if (!synced) lastAppliedVersion = 0;
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
