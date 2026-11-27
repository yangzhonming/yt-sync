(() => {
  const root = (window.YTSync = window.YTSync || {});
  const touch = (root.touch = root.touch || {});

  function bindTouchGestures(ctx) {
    const {
      LONG_PRESS_MS = 350,
      SINGLE_TAP_DELAY_MS = 240,
      DOUBLE_TAP_MS = 250,
      DOUBLE_TAP_DIST_PX = 36,
      BOOST_LOCK_SLIDE_PX = 48,
      DRAG_THRESHOLD_PX = 10,
      TAP_MOVE_LIMIT_PX = 10,
      LOCK_AWAKE_MS = 1400,
      BOOST_LOCKED_FADE_MS = 600,
      HUD_BAR_HIDE_MS = 2000,
      MINI_TOAST_MS = 900,
      SCRUB_HUD_HIDE_MS = 260,
      VOL_HUD_HIDE_MS = 320,
      formatTime,
      formatOptionText,
      els,
      getEnabled,
      isNativeBarMode,
      isPassthrough,
      isScreenLocked,
      isHudVisible,
      isLockAwake,
      hasOpenDrawers,
      closeOpenDrawers,
      wakeHud,
      hideHud,
      scheduleHudHide,
      wakeLockBtn,
      hideLockBtn,
      pulseLockBtn,
      showMiniToast,
      getVideo,
      getEngine,
      getDisplayRate,
      updateBaseRate,
      syncRateUi,
      syncPlaybackUi,
      syncVolumeUi,
      setUserMuted,
      togglePlayWithPulse,
      onScrubStart,
      renderScrubPreview,
      hideScrubPreview,
      showVolumeHud,
      hideGestureHud,
      getVolSplitRatio,
      clearHudTimer,
    } = ctx;

    let draggingSeek = false;
    let seekPreviewTime = 0;
    let activeScrubPointerId = null;
    let activeScrubWrap = null;
    let activeScrubStartSec = 0;

    let activePointerId = null;
    let gestureMode = "idle";
    let gestureStartX = 0;
    let gestureStartY = 0;
    let gestureStartAt = 0;
    let gestureMaxDist = 0;
    let gestureStartTimeSec = 0;
    let gestureStartVol = 1;
    let gestureVolOriginY = 0;
    let gesturePendingSeekSec = 0;
    let preBoostRate = 1;
    let boostLockArmed = false;
    let speedLockedByBoost = false;
    let speedLockRestoreRate = 1;
    let lastTapAt = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    let longPressTimer = null;
    let singleTapTimer = null;
    let boostLockedFadeTimer = null;
    let boostGlobalBound = false;
    let scrubWindowBound = false;

    function clearLockedBoostSpeed({ restore = false } = {}) {
      clearTimeout(boostLockedFadeTimer);
      boostLockedFadeTimer = null;
      const wasLockedSpeed = speedLockedByBoost;
      speedLockedByBoost = false;
      els.boostChip?.classList.remove(
        "is-visible",
        "is-lock-armed",
        "is-locked-speed",
        "is-locked-compact",
        "is-locked-hidden"
      );
      if (els.boostText) els.boostText.textContent = "2.0x 倍速播放中";
      if (els.boostHint) els.boostHint.textContent = "上滑锁定";
      if (restore && wasLockedSpeed) {
        const nextRate = Number.isFinite(speedLockRestoreRate) ? speedLockRestoreRate : 1;
        updateBaseRate(nextRate);
        getEngine()?.setPlaybackRate?.(nextRate, { showToast: true });
        syncRateUi();
        showMiniToast(`已恢复 ${formatOptionText(nextRate)}`, MINI_TOAST_MS);
      }
    }

    function onBoostDocVisChange() {
      if (document.hidden) releaseBoost({ cancelLock: true });
    }

    function bindBoostGlobalRelease() {
      if (boostGlobalBound) return;
      boostGlobalBound = true;
      window.addEventListener("pointerup", releaseBoost, true);
      window.addEventListener("pointercancel", releaseBoost, true);
      window.addEventListener("touchend", releaseBoost, true);
      window.addEventListener("touchcancel", releaseBoost, true);
      window.addEventListener("blur", releaseBoost);
      document.addEventListener("visibilitychange", onBoostDocVisChange);
    }

    function unbindBoostGlobalRelease() {
      if (!boostGlobalBound) return;
      boostGlobalBound = false;
      window.removeEventListener("pointerup", releaseBoost, true);
      window.removeEventListener("pointercancel", releaseBoost, true);
      window.removeEventListener("touchend", releaseBoost, true);
      window.removeEventListener("touchcancel", releaseBoost, true);
      window.removeEventListener("blur", releaseBoost);
      document.removeEventListener("visibilitychange", onBoostDocVisChange);
    }

    function releaseBoost(opts) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      unbindBoostGlobalRelease();
      const wasBoost = gestureMode === "boost";
      const armed = boostLockArmed;
      boostLockArmed = false;
      gestureMode = "idle";
      activePointerId = null;
      els.boostChip?.classList.remove("is-lock-armed");
      if (wasBoost) {
        const cancelLock =
          Boolean(opts?.cancelLock) ||
          opts?.type === "blur" ||
          opts?.type === "pointercancel" ||
          opts?.type === "touchcancel" ||
          opts?.type === "visibilitychange";
        if (armed && !cancelLock) {
          speedLockRestoreRate = Number.isFinite(preBoostRate) ? preBoostRate : 1;
          speedLockedByBoost = true;
          updateBaseRate(2.0);
          getEngine()?.setPlaybackRate?.(2.0, { showToast: true });
          syncRateUi();
          clearTimeout(boostLockedFadeTimer);
          els.boostChip?.classList.remove("is-locked-compact", "is-locked-hidden");
          els.boostChip?.classList.add("is-visible", "is-locked-speed");
          if (els.boostText) els.boostText.textContent = "2.0x 已锁定";
          if (els.boostHint) els.boostHint.textContent = "点此恢复";
          boostLockedFadeTimer = setTimeout(() => {
            boostLockedFadeTimer = null;
            if (!getEnabled() || !speedLockedByBoost) return;
            els.boostChip?.classList.add("is-locked-hidden");
            if (els.boostText) els.boostText.textContent = "2.0x";
            if (els.boostHint) els.boostHint.textContent = "点此恢复";
          }, BOOST_LOCKED_FADE_MS);
        } else {
          speedLockedByBoost = false;
          els.boostChip?.classList.remove(
            "is-visible",
            "is-locked-speed",
            "is-locked-compact",
            "is-locked-hidden"
          );
          if (els.boostText) els.boostText.textContent = "2.0x 倍速播放中";
          if (els.boostHint) els.boostHint.textContent = "上滑锁定";
          const restore = Number.isFinite(preBoostRate) ? preBoostRate : 1;
          getEngine()?.setPlaybackRate?.(restore, { showToast: false });
          syncRateUi();
        }
      } else if (!speedLockedByBoost) {
        els.boostChip?.classList.remove(
          "is-visible",
          "is-locked-speed",
          "is-locked-compact",
          "is-locked-hidden"
        );
        if (els.boostText) els.boostText.textContent = "2.0x 倍速播放中";
        if (els.boostHint) els.boostHint.textContent = "上滑锁定";
      }
    }

    const updateSeekFromClientX = (clientX) => {
      const wrapEl = activeScrubWrap;
      const video = getVideo();
      if (!wrapEl || !video) return;
      const rect = wrapEl.getBoundingClientRect?.() || { left: 0, width: 320 };
      const width = Math.max(1, rect.width || 320);
      const ratio = Math.max(0, Math.min(1, ((clientX || 0) - (rect.left || 0)) / width));
      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      seekPreviewTime = dur * ratio;
      [els.progressFill, els.winProgressFill].forEach((el) => {
        if (el) el.style.width = `${ratio * 100}%`;
      });
      [els.progressThumb, els.winProgressThumb].forEach((el) => {
        if (el) el.style.left = `${ratio * 100}%`;
      });
      const labelStr = `${formatTime(seekPreviewTime)}/${formatTime(dur)}`;
      if (els.timeText) els.timeText.textContent = labelStr;
      if (els.winTime) els.winTime.textContent = labelStr;
      renderScrubPreview({
        mode: "track",
        previewSec: seekPreviewTime,
        durSec: dur,
        deltaSec: seekPreviewTime - activeScrubStartSec,
        ratio,
        wrapEl,
      });
    };

    const finishSeekDrag = (e) => {
      if (!draggingSeek) return;
      const pid = e?.pointerId;
      if (activeScrubPointerId !== null && pid !== undefined && pid !== activeScrubPointerId) return;
      e?.stopPropagation?.();
      if (typeof e?.clientX === "number" && e?.type !== "pointercancel" && e?.type !== "blur") {
        updateSeekFromClientX(e.clientX);
      }
      const wrapEl = activeScrubWrap;
      draggingSeek = false;
      activeScrubPointerId = null;
      activeScrubWrap = null;
      unbindScrubWindowEvents();
      if (wrapEl) wrapEl.classList.remove("is-dragging");
      hideScrubPreview(0);
      const video = getVideo();
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = seekPreviewTime;
      }
      syncPlaybackUi();
      scheduleHudHide(HUD_BAR_HIDE_MS);
    };

    const onScrubWindowMove = (e) => {
      if (!draggingSeek) return;
      const pid = e.pointerId ?? 0;
      if (activeScrubPointerId !== null && pid !== activeScrubPointerId) return;
      e.stopPropagation();
      updateSeekFromClientX(e.clientX);
    };

    const bindScrubWindowEvents = () => {
      if (scrubWindowBound) return;
      scrubWindowBound = true;
      window.addEventListener("pointermove", onScrubWindowMove, true);
      window.addEventListener("pointerup", finishSeekDrag, true);
      window.addEventListener("pointercancel", finishSeekDrag, true);
      window.addEventListener("blur", finishSeekDrag);
    };

    const unbindScrubWindowEvents = () => {
      if (!scrubWindowBound) return;
      scrubWindowBound = false;
      window.removeEventListener("pointermove", onScrubWindowMove, true);
      window.removeEventListener("pointerup", finishSeekDrag, true);
      window.removeEventListener("pointercancel", finishSeekDrag, true);
      window.removeEventListener("blur", finishSeekDrag);
    };

    const bindScrubTrack = (wrapEl) => {
      if (!wrapEl) return;
      wrapEl.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        { passive: false }
      );
      wrapEl.addEventListener(
        "touchmove",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        { passive: false }
      );

      wrapEl.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        closeOpenDrawers();
        onScrubStart?.();
        draggingSeek = true;
        activeScrubPointerId = e.pointerId ?? 0;
        activeScrubWrap = wrapEl;
        const video = getVideo();
        activeScrubStartSec = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
        wrapEl.classList.add("is-dragging");
        clearHudTimer();
        try {
          wrapEl.setPointerCapture?.(e.pointerId);
        } catch {}
        bindScrubWindowEvents();
        updateSeekFromClientX(e.clientX);
      });

      wrapEl.addEventListener("pointermove", (e) => {
        if (!draggingSeek) return;
        const pid = e.pointerId ?? 0;
        if (activeScrubPointerId !== null && pid !== activeScrubPointerId) return;
        e.stopPropagation();
        updateSeekFromClientX(e.clientX);
      });

      wrapEl.addEventListener("pointerup", finishSeekDrag);
      wrapEl.addEventListener("pointercancel", finishSeekDrag);
    };

    bindScrubTrack(els.progressWrap);
    bindScrubTrack(els.winProgressWrap);

    els.boostChip?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!getEnabled() || !speedLockedByBoost) return;
      if (isScreenLocked()) {
        wakeLockBtn(LOCK_AWAKE_MS);
        pulseLockBtn();
        showMiniToast("已锁屏，点击锁图标解锁", 1100);
        return;
      }
      clearLockedBoostSpeed({ restore: true });
    });

    const shield = els.shield;
    if (shield && typeof shield.addEventListener === "function") {
      shield.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      const handleSingleTap = () => {
        singleTapTimer = null;
        if (!getEnabled() || isNativeBarMode() || isPassthrough()) return;
        if (isScreenLocked()) {
          if (isLockAwake()) hideLockBtn();
          else wakeLockBtn(LOCK_AWAKE_MS);
          return;
        }
        if (hasOpenDrawers()) {
          hideHud();
        } else if (isHudVisible()) {
          hideHud();
        } else {
          wakeHud(HUD_BAR_HIDE_MS);
        }
      };

      shield.addEventListener("pointerdown", (e) => {
        if (!getEnabled() || isNativeBarMode() || isPassthrough()) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const pid = e.pointerId ?? 0;
        if (activePointerId !== null && pid !== activePointerId) return;
        e.stopPropagation();

        clearTimeout(longPressTimer);
        activePointerId = pid;
        gestureMode = "pending";
        gestureStartX = e.clientX;
        gestureStartY = e.clientY;
        gestureStartAt = Date.now();
        gestureMaxDist = 0;
        boostLockArmed = false;
        const video = getVideo();
        gestureStartTimeSec = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
        gestureStartVol = Number.isFinite(video?.volume) ? video.volume : 1;
        gesturePendingSeekSec = gestureStartTimeSec;

        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          if (!getEnabled() || isNativeBarMode() || isPassthrough() || gestureMode !== "pending") return;
          clearTimeout(singleTapTimer);
          singleTapTimer = null;
          lastTapAt = 0;
          if (isScreenLocked()) {
            gestureMode = "locked_block";
            wakeLockBtn(LOCK_AWAKE_MS);
            pulseLockBtn();
            showMiniToast("已锁屏，点击锁图标解锁", 1100);
            return;
          }
          if (speedLockedByBoost) {
            gestureMode = "boost_unlock";
            clearLockedBoostSpeed({ restore: true });
            return;
          }
          preBoostRate = getDisplayRate();
          gestureMode = "boost";
          boostLockArmed = false;
          shield.setPointerCapture?.(activePointerId);
          bindBoostGlobalRelease();
          getEngine()?.setPlaybackRate?.(2.0, { showToast: false });
          syncRateUi();
          if (els.boostText) els.boostText.textContent = "2.0x 倍速播放中";
          if (els.boostHint) els.boostHint.textContent = "上滑锁定";
          els.boostChip?.classList.remove("is-lock-armed", "is-locked-hidden");
          els.boostChip?.classList.add("is-visible");
        }, LONG_PRESS_MS);
      });

      shield.addEventListener("pointermove", (e) => {
        if (
          !getEnabled() ||
          isNativeBarMode() ||
          isPassthrough() ||
          gestureMode === "idle" ||
          gestureMode === "scroll_yield" ||
          gestureMode === "locked_block" ||
          gestureMode === "boost_unlock"
        ) {
          return;
        }
        const pid = e.pointerId ?? 0;
        if (activePointerId !== null && pid !== activePointerId) return;

        const dx = e.clientX - gestureStartX;
        const dy = e.clientY - gestureStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        gestureMaxDist = Math.max(gestureMaxDist, Math.hypot(dx, dy));

        if (gestureMode === "boost") {
          const armed = dy <= -BOOST_LOCK_SLIDE_PX;
          if (armed !== boostLockArmed) {
            boostLockArmed = armed;
            els.boostChip?.classList.toggle("is-lock-armed", armed);
            if (els.boostHint) {
              els.boostHint.textContent = armed ? "松手锁定 2.0x" : "上滑锁定";
            }
          }
          return;
        }

        if (gestureMode === "pending" && gestureMaxDist > TAP_MOVE_LIMIT_PX) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }

        if (gestureMode === "pending") {
          if (absX < DRAG_THRESHOLD_PX && absY < DRAG_THRESHOLD_PX) return;
          if (isScreenLocked()) {
            gestureMode = "locked_block";
            clearTimeout(singleTapTimer);
            singleTapTimer = null;
            lastTapAt = 0;
            wakeLockBtn(LOCK_AWAKE_MS);
            pulseLockBtn();
            showMiniToast("已锁屏，点击锁图标解锁", 1100);
            return;
          }
          if (absX > absY * 1.2) {
            gestureMode = "seek";
            onScrubStart?.();
            clearHudTimer();
            try {
              shield.setPointerCapture?.(e.pointerId);
            } catch {}
          } else {
            const rect = shield.getBoundingClientRect?.() || { left: 0, width: 360, height: 240 };
            const relX = e.clientX - (rect.left || 0);
            const splitRatio = typeof getVolSplitRatio === "function" ? getVolSplitRatio() : 0.5;
            if (relX >= (rect.width || 360) * splitRatio) {
              gestureMode = "volume";
              gestureVolOriginY = gestureStartY + Math.sign(dy) * Math.min(absY, DRAG_THRESHOLD_PX);
              clearHudTimer();
              try {
                shield.setPointerCapture?.(e.pointerId);
              } catch {}
            } else {
              gestureMode = "scroll_yield";
              return;
            }
          }
        }

        const video = getVideo();
        if (!video) return;

        if (gestureMode === "seek") {
          const rect = shield.getBoundingClientRect?.() || { left: 0, width: 360, height: 240 };
          const width = Math.max(200, rect.width || 360);
          const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
          const spanSec = dur > 0 ? Math.min(90, Math.max(45, dur)) : 90;
          const deltaSec = (dx / width) * spanSec;
          const clampedTarget =
            dur > 0
              ? Math.max(0, Math.min(dur, gestureStartTimeSec + deltaSec))
              : Math.max(0, gestureStartTimeSec + deltaSec);
          gesturePendingSeekSec = clampedTarget;
          renderScrubPreview({
            mode: "swipe",
            previewSec: gesturePendingSeekSec,
            durSec: dur,
            deltaSec: gesturePendingSeekSec - gestureStartTimeSec,
            ratio: dur > 0 ? clampedTarget / dur : 0,
            wrapEl: null,
          });
        } else if (gestureMode === "volume") {
          const rect = shield.getBoundingClientRect?.() || { left: 0, width: 360, height: 240 };
          const height = Math.min(200, Math.max(110, (rect.height || 240) * 0.5));
          const volDy = e.clientY - gestureVolOriginY;
          const nextVol = Math.max(0, Math.min(1, gestureStartVol - volDy / height));
          if (nextVol <= 0.005) {
            video.volume = 0;
            video.muted = true;
            setUserMuted(true);
          } else {
            video.volume = nextVol;
            setUserMuted(false);
            if (video.muted) video.muted = false;
          }
          syncVolumeUi();
          showVolumeHud(nextVol * 100);
        }
      });

      shield.addEventListener(
        "touchmove",
        (e) => {
          if (gestureMode === "seek" || gestureMode === "volume" || gestureMode === "boost") {
            e.preventDefault();
          }
        },
        { passive: false }
      );

      const onGestureCancel = (e) => {
        const pid = e.pointerId ?? 0;
        if (activePointerId !== null && pid !== activePointerId) return;
        clearTimeout(longPressTimer);
        longPressTimer = null;
        if (gestureMode === "boost") {
          releaseBoost({ cancelLock: true, type: e?.type });
          return;
        }
        gestureMode = "idle";
        activePointerId = null;
        hideScrubPreview(0);
        hideGestureHud(0);
      };

      const onGestureUp = (e) => {
        const pid = e.pointerId ?? 0;
        if (activePointerId !== null && pid !== activePointerId) return;
        clearTimeout(longPressTimer);
        longPressTimer = null;

        if (gestureMode === "boost") {
          releaseBoost({ cancelLock: false, type: e?.type });
          return;
        }

        const finishedMode = gestureMode;
        const heldMs = Date.now() - gestureStartAt;
        gestureMode = "idle";
        activePointerId = null;

        if (finishedMode === "seek") {
          const video = getVideo();
          if (video && Number.isFinite(gesturePendingSeekSec)) {
            video.currentTime = gesturePendingSeekSec;
            syncPlaybackUi();
          }
          hideScrubPreview(SCRUB_HUD_HIDE_MS);
          if (isHudVisible()) scheduleHudHide(HUD_BAR_HIDE_MS);
        } else if (finishedMode === "volume") {
          hideGestureHud(VOL_HUD_HIDE_MS);
        } else if (
          finishedMode === "pending" &&
          gestureMaxDist <= TAP_MOVE_LIMIT_PX &&
          heldMs < LONG_PRESS_MS
        ) {
          if (!isScreenLocked() && hasOpenDrawers()) {
            clearTimeout(singleTapTimer);
            singleTapTimer = null;
            lastTapAt = 0;
            hideHud();
            return;
          }
          const now = Date.now();
          const isDoubleTap =
            lastTapAt > 0 &&
            now - lastTapAt <= DOUBLE_TAP_MS &&
            Math.hypot((e.clientX || 0) - lastTapX, (e.clientY || 0) - lastTapY) <= DOUBLE_TAP_DIST_PX;
          if (isDoubleTap) {
            clearTimeout(singleTapTimer);
            singleTapTimer = null;
            lastTapAt = 0;
            if (isScreenLocked()) {
              wakeLockBtn(LOCK_AWAKE_MS);
              pulseLockBtn();
              showMiniToast("已锁屏，点击锁图标解锁", 1100);
            } else {
              if (hasOpenDrawers()) closeOpenDrawers();
              togglePlayWithPulse();
            }
          } else {
            lastTapAt = now;
            lastTapX = e.clientX || 0;
            lastTapY = e.clientY || 0;
            clearTimeout(singleTapTimer);
            singleTapTimer = setTimeout(handleSingleTap, SINGLE_TAP_DELAY_MS);
          }
        }
      };

      shield.addEventListener("pointerup", onGestureUp);
      shield.addEventListener("pointercancel", onGestureCancel);
    }

    return {
      releaseBoost,
      clearLockedBoostSpeed,
      isDraggingSeek: () => draggingSeek,
      getSeekPreviewTime: () => seekPreviewTime,
      getGestureMode: () => gestureMode,
      isSpeedLockedByBoost: () => speedLockedByBoost,
      clearTimers() {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        clearTimeout(singleTapTimer);
        singleTapTimer = null;
        clearTimeout(boostLockedFadeTimer);
        boostLockedFadeTimer = null;
        lastTapAt = 0;
      },
      resetState() {
        draggingSeek = false;
        activeScrubPointerId = null;
        activeScrubWrap = null;
        activePointerId = null;
        gestureMode = "idle";
        boostLockArmed = false;
        unbindScrubWindowEvents();
        unbindBoostGlobalRelease();
      },
    };
  }

  touch.bindTouchGestures = bindTouchGestures;
})();
