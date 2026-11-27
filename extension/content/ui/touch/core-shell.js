(() => {
  const root = (window.YTSync = window.YTSync || {});
  const touch = (root.touch = root.touch || {});

  function createTouchPlayerShell(config) {
    const { ASSETS, UTILS, buildTouchCss, createFullscreenController, bindTouchGestures } = touch;
    const {
      RATE_OPTIONS,
      formatTime,
      formatRateText,
      formatOptionText,
    } = UTILS;

    const HUD_QUICK_HIDE_MS = 1000;
    const HUD_BAR_HIDE_MS = 2000;
    const RETURN_PILL_HIDE_MS = 2400;
    const LOCK_AWAKE_MS = 1400;
    const MINI_TOAST_MS = 900;
    const PLAY_FLASH_MS = 320;

    const {
      adapter,
      engine,
      hostId,
      styleId,
      activeHtmlClass,
      nativeHtmlClass,
      webMaxHtmlClass = "",
      allowedHosts = [],
      theme,
      hostZIndex = 2147483050,
      scrubThumbHtml,
      winTopExtraHtml = "",
      fsLeftExtraHtml = "",
      fsRightExtraHtml = "",
      extraDrawersHtml = "",
      includeBiliExtras = false,
      includeYtExtras = false,
      buildGlobalCss,
      findContainer,
      findShieldClassTarget,
      getVolSplitRatio,
      isEndingTarget,
      checkPassthrough,
      fullscreenConfig,
      onBindShadowControls,
      onHideDrawers,
      hasOpenExtraDrawers,
      onScrubStart,
      onRenderScrub,
      onHideScrub,
      onRefreshContext,
      onWakeHud,
      onFullscreenSync,
      onResize,
      onLoadedMetadata,
      onBindContainerExtra,
      onUnbindContainerExtra,
      onDisable,
      onToggleSync,
    } = config;

    let enabled = false;
    let nativeBarMode = false;
    let hudVisible = false;
    let speedDrawerOpen = false;
    let qualityDrawerOpen = false;
    let screenLocked = false;
    let lockAwake = false;
    let passthroughActive = false;
    let userMuted = false;
    let lastNonZeroVolume = 0.8;
    let activeCount = 1;
    let baseRate = 1;
    let syncUiState = null;
    let disconnectConfirmArmed = false;
    let syncActionBusy = false;
    let lastVideoPaused = null;

    let host = null;
    let shadow = null;
    let els = {};
    let currentContainer = null;
    let currentVideo = null;
    let gestures = null;

    let hudTimer = null;
    let returnPillTimer = null;
    let lockAwakeTimer = null;
    let gestureHudTimer = null;
    let scrubPreviewTimer = null;
    let qualitySyncTimer = null;
    let miniToastTimer = null;
    let playFlashTimer = null;
    let mountRetryTimer = null;
    let disconnectConfirmTimer = null;
    let syncActionBusyTimer = null;

    let allowNativeClickDepth = 0;
    let globalEventsBound = false;
    let containerShieldEl = null;
    let outerShieldEl = null;
    let resizeObserver = null;
    let classObserver = null;

    const fs = createFullscreenController({
      ...fullscreenConfig,
      onSyncChange: () => onFullscreenChange(),
    });

    function ensureGlobalStyle() {
      if (document.getElementById(styleId)) return;
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = buildGlobalCss({
        activeHtmlClass,
        nativeHtmlClass,
        webMaxHtmlClass,
      });
      (document.head || document.documentElement).appendChild(style);
    }

    function syncHtmlClass() {
      const rootEl = document.documentElement;
      if (!rootEl) return;
      if (enabled) ensureGlobalStyle();
      rootEl.classList.toggle(
        activeHtmlClass,
        Boolean(enabled && !nativeBarMode && !passthroughActive)
      );
      if (nativeHtmlClass) {
        rootEl.classList.toggle(nativeHtmlClass, Boolean(enabled && nativeBarMode));
      }
      if (webMaxHtmlClass && typeof fullscreenConfig?.isWebMax === "function") {
        rootEl.classList.toggle(
          webMaxHtmlClass,
          Boolean(enabled && fullscreenConfig.isWebMax())
        );
      }
    }

    function clearTimers() {
      clearTimeout(hudTimer);
      hudTimer = null;
      clearTimeout(returnPillTimer);
      returnPillTimer = null;
      clearTimeout(lockAwakeTimer);
      lockAwakeTimer = null;
      clearTimeout(gestureHudTimer);
      gestureHudTimer = null;
      clearTimeout(scrubPreviewTimer);
      scrubPreviewTimer = null;
      clearTimeout(qualitySyncTimer);
      qualitySyncTimer = null;
      clearTimeout(miniToastTimer);
      miniToastTimer = null;
      clearTimeout(playFlashTimer);
      playFlashTimer = null;
      clearTimeout(mountRetryTimer);
      mountRetryTimer = null;
      clearTimeout(disconnectConfirmTimer);
      disconnectConfirmTimer = null;
      disconnectConfirmArmed = false;
      clearTimeout(syncActionBusyTimer);
      syncActionBusyTimer = null;
      syncActionBusy = false;
      gestures?.clearTimers?.();
    }

    function runNativeClick(el) {
      if (!el || typeof el.click !== "function") return;
      allowNativeClickDepth++;
      try {
        el.click();
      } finally {
        allowNativeClickDepth--;
      }
    }

    function isHostEvent(e) {
      if (!host) return false;
      const path = typeof e.composedPath === "function" ? e.composedPath() : null;
      if (Array.isArray(path) && path.includes(host)) return true;
      return e.target === host || Boolean(host.contains?.(e.target));
    }

    function onShieldContextMenu(e) {
      if (!enabled || nativeBarMode || passthroughActive) return;
      if (isHostEvent(e)) return;
      if (typeof isEndingTarget === "function" && isEndingTarget(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation?.();
      e.stopPropagation();
    }

    function onShieldNativeClick(e) {
      if (!enabled || nativeBarMode || passthroughActive) return;
      if (allowNativeClickDepth > 0) return;
      if (isHostEvent(e)) return;
      if (typeof isEndingTarget === "function" && isEndingTarget(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation?.();
      e.stopPropagation();
    }

    function onNativeWakeTap(e) {
      if (!enabled || !nativeBarMode) return;
      if (isHostEvent(e)) return;
      wakeReturnPill(RETURN_PILL_HIDE_MS);
    }

    function onKeyDownEscape(e) {
      if (!enabled || !fs.isFullscreenNow()) return;
      if (e.key === "Escape") {
        e.preventDefault?.();
        fs.toggle();
      }
    }

    function onFullscreenChange() {
      if (!enabled) return;
      fs.handleFullscreenChange();
      syncHtmlClass();
      if (!fs.isFullscreenNow() && screenLocked) {
        setScreenLocked(false, { silent: true });
      }
      if (!host || !host.isConnected) ensureAlive();
      syncScale();
      syncTopBar();
      syncPlaybackUi();
      onFullscreenSync?.(api);
      if (speedDrawerOpen) positionSpeedPopover();
      if (qualityDrawerOpen) positionQualityPopover();
    }

    function onWindowResize() {
      if (!enabled) return;
      syncScale();
      onResize?.(api);
      if (speedDrawerOpen) positionSpeedPopover();
      if (qualityDrawerOpen) positionQualityPopover();
    }

    function bindGlobalEvents() {
      if (globalEventsBound) return;
      globalEventsBound = true;
      document.addEventListener("fullscreenchange", onFullscreenChange);
      document.addEventListener("webkitfullscreenchange", onFullscreenChange);
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("touchstart", onNativeWakeTap, { passive: true, capture: true });
      window.addEventListener("pointerdown", onNativeWakeTap, { passive: true, capture: true });
      window.addEventListener("keydown", onKeyDownEscape, true);
    }

    function unbindGlobalEvents() {
      if (!globalEventsBound) return;
      globalEventsBound = false;
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("touchstart", onNativeWakeTap, true);
      window.removeEventListener("pointerdown", onNativeWakeTap, true);
      window.removeEventListener("keydown", onKeyDownEscape, true);
    }

    function bindContainerObserver(container, classTarget) {
      unbindContainerObserver();
      if (container && typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(() => {
          if (enabled) syncScale();
        });
        resizeObserver.observe(container);
      }
      const clsNode = classTarget || container;
      if (clsNode && typeof MutationObserver === "function") {
        classObserver = new MutationObserver(() => {
          if (!enabled) return;
          syncPassthroughState();
          onFullscreenSync?.(api);
        });
        classObserver.observe(clsNode, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }
      onBindContainerExtra?.(container, api);
    }

    function unbindContainerObserver() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (classObserver) {
        classObserver.disconnect();
        classObserver = null;
      }
      onUnbindContainerExtra?.();
    }

    function bindContainerShield(container) {
      const outer =
        includeBiliExtras
          ? container?.closest?.(".bpx-player-container") ||
            document.querySelector(".bpx-player-container") ||
            null
          : null;
      const resolvedOuter = outer && outer !== container ? outer : null;
      if (containerShieldEl === container && outerShieldEl === resolvedOuter) return;
      unbindContainerShield();
      if (!container || typeof container.addEventListener !== "function") return;
      containerShieldEl = container;
      container.addEventListener("contextmenu", onShieldContextMenu, true);
      container.addEventListener("click", onShieldNativeClick, true);
      container.addEventListener("dblclick", onShieldNativeClick, true);
      if (resolvedOuter && typeof resolvedOuter.addEventListener === "function") {
        outerShieldEl = resolvedOuter;
        outerShieldEl.addEventListener("contextmenu", onShieldContextMenu, true);
      }
    }

    function unbindContainerShield() {
      if (containerShieldEl) {
        containerShieldEl.removeEventListener("contextmenu", onShieldContextMenu, true);
        containerShieldEl.removeEventListener("click", onShieldNativeClick, true);
        containerShieldEl.removeEventListener("dblclick", onShieldNativeClick, true);
        containerShieldEl = null;
      }
      if (outerShieldEl) {
        outerShieldEl.removeEventListener("contextmenu", onShieldContextMenu, true);
        outerShieldEl = null;
      }
    }

    function onVideoTimeUpdate() {
      if (!enabled) return;
      syncPassthroughState();
      syncPlaybackUi();
      syncVolumeUi();
    }

    function onVideoLoadedMetadata() {
      if (!enabled) return;
      syncPassthroughState();
      syncPlaybackUi();
      syncVolumeUi();
      onLoadedMetadata?.(api);
      refreshVideoContext();
    }

    function onVideoPlayStateChange() {
      if (!enabled) return;
      syncPassthroughState();
      syncPlaybackUi();
      syncVolumeUi();
      const video = currentVideo || adapter?.getVideoElement?.();
      const isPaused = Boolean(video?.paused);
      const transitionedToPlay = lastVideoPaused !== false && !isPaused;
      lastVideoPaused = isPaused;
      if (!hudVisible) return;
      if (isPaused) {
        clearTimeout(hudTimer);
        hudTimer = null;
      } else if (transitionedToPlay || hudTimer === null) {
        scheduleHudHide(HUD_QUICK_HIDE_MS);
      }
    }

    function onVideoVolumeChange() {
      if (!enabled) return;
      syncVolumeUi();
    }

    function onVideoRateChange() {
      if (!enabled) return;
      if (gestures?.getGestureMode?.() !== "boost") {
        baseRate = engine?.getBaseRate?.() || currentVideo?.playbackRate || 1;
      }
      syncRateUi();
    }

    function bindVideoEvents(video) {
      if (currentVideo === video) return;
      unbindVideoEvents();
      if (!video || typeof video.addEventListener !== "function") return;
      currentVideo = video;
      lastVideoPaused = Boolean(video.paused);
      video.addEventListener("loadedmetadata", onVideoLoadedMetadata);
      ["timeupdate", "durationchange", "seeking", "seeked"].forEach((ev) => {
        video.addEventListener(ev, onVideoTimeUpdate);
      });
      ["play", "playing", "pause", "ended"].forEach((ev) => {
        video.addEventListener(ev, onVideoPlayStateChange);
      });
      video.addEventListener("volumechange", onVideoVolumeChange);
      video.addEventListener("ratechange", onVideoRateChange);
    }

    function unbindVideoEvents() {
      if (!currentVideo) return;
      currentVideo.removeEventListener("loadedmetadata", onVideoLoadedMetadata);
      ["timeupdate", "durationchange", "seeking", "seeked"].forEach((ev) => {
        currentVideo.removeEventListener(ev, onVideoTimeUpdate);
      });
      ["play", "playing", "pause", "ended"].forEach((ev) => {
        currentVideo.removeEventListener(ev, onVideoPlayStateChange);
      });
      currentVideo.removeEventListener("volumechange", onVideoVolumeChange);
      currentVideo.removeEventListener("ratechange", onVideoRateChange);
      currentVideo = null;
      lastVideoPaused = null;
    }

    function getDisplayRate() {
      if (gestures?.getGestureMode?.() === "boost") return 2.0;
      const engRate = engine?.getBaseRate?.();
      if (typeof engRate === "number" && Number.isFinite(engRate)) return engRate;
      const vidRate = currentVideo?.playbackRate;
      if (typeof vidRate === "number" && Number.isFinite(vidRate)) return vidRate;
      return baseRate || 1;
    }

    function syncRateUi() {
      const rate = getDisplayRate();
      const txt = formatRateText(rate);
      const boosted = Math.abs(rate - 1.0) > 0.01;
      [els.speedBtn, els.winSpeedBtn].forEach((btn) => {
        if (!btn) return;
        btn.textContent = txt;
        btn.classList.toggle("is-active-rate", boosted);
      });
      if (els.speedDrawer) {
        const btns = els.speedDrawer.querySelectorAll(".ytb-speed-opt");
        btns.forEach((btn) => {
          const opt = Number(btn.dataset.rate);
          btn.classList.toggle("is-active", Math.abs(opt - rate) < 0.02);
        });
      }
    }

    function syncScale() {
      if (!host?.style?.setProperty) return 1.0;
      const rect = currentContainer?.getBoundingClientRect?.() || { width: 540, height: 300 };
      const scale =
        rect.width > 0 && rect.height > 0
          ? Math.max(1.0, Math.min(1.45, rect.width / 540, rect.height / 300))
          : 1.0;
      host.style.setProperty("--ytb-s", scale.toFixed(3));
      return scale;
    }

    function getEffectiveSyncState() {
      if (syncUiState !== null) {
        return syncUiState === "full" ? "idle" : syncUiState;
      }
      if (engine?.isSoloMode?.()) return "solo";
      if (engine?.isSynced?.()) return "synced";
      return "waiting";
    }

    function clearDisconnectConfirm() {
      clearTimeout(disconnectConfirmTimer);
      disconnectConfirmTimer = null;
      disconnectConfirmArmed = false;
    }

    function syncTopBar() {
      const inFull = fs.isFullscreenNow() && !nativeBarMode;
      els.root?.classList.toggle("is-fullscreen", inFull);
      if (els.fullBtn) {
        els.fullBtn.innerHTML = ASSETS.FULL_EXIT_SVG;
        els.fullBtn.setAttribute("aria-label", "退出全屏");
      }
      if (els.winFullBtn) {
        els.winFullBtn.innerHTML = ASSETS.FULL_ENTER_SVG;
        els.winFullBtn.setAttribute("aria-label", "全屏");
      }
      if (els.title) {
        els.title.textContent = adapter?.getVideoTitle?.() || "正在播放";
      }
      const st = getEffectiveSyncState();
      if (disconnectConfirmArmed && st !== "synced" && st !== "solo") {
        clearDisconnectConfirm();
      }
      let fsText = "同步";
      let winText = "同步";
      let dataState = st;
      if (disconnectConfirmArmed) {
        fsText = "再点断开";
        winText = "再点断开";
        dataState = "confirm";
      } else if (st === "idle") {
        fsText = "同步";
        winText = "同步";
        dataState = "idle";
      } else if (st === "waiting") {
        fsText = "等待中";
        winText = "等待";
        dataState = "waiting";
      } else if (st === "reconnecting") {
        fsText = "重连中";
        winText = "重连";
        dataState = "reconnecting";
      } else if (st === "conflict") {
        fsText = "选视频";
        winText = "选视频";
        dataState = "conflict";
      } else if (st === "solo") {
        fsText = "先看中";
        winText = "先看";
        dataState = "solo";
      } else {
        const cnt = Math.max(1, activeCount);
        fsText = `已同步 · ${cnt}人`;
        winText = `${cnt}人`;
        dataState = "synced";
      }
      if (els.syncBadge) {
        els.syncBadge.textContent = fsText;
        if (els.syncBadge.dataset) els.syncBadge.dataset.syncState = dataState;
        els.syncBadge.setAttribute?.("data-sync-state", dataState);
      }
      if (els.winSyncBtn) {
        els.winSyncBtn.textContent = winText;
        if (els.winSyncBtn.dataset) els.winSyncBtn.dataset.syncState = dataState;
        els.winSyncBtn.setAttribute?.("data-sync-state", dataState);
      }
    }

    function syncPlaybackUi() {
      const video = currentVideo || adapter?.getVideoElement?.();
      if (!video) return;
      const paused = Boolean(video.paused);
      const svg = paused ? ASSETS.PLAY_SVG : ASSETS.PAUSE_SVG;
      const stateStr = paused ? "paused" : "playing";
      const labelStr = paused ? "播放" : "暂停";
      [els.playBtn, els.winPlayBtn].forEach((btn) => {
        if (!btn) return;
        btn.innerHTML = svg;
        if (btn.dataset) btn.dataset.state = stateStr;
        btn.setAttribute("aria-label", labelStr);
      });

      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const dragging = Boolean(gestures?.isDraggingSeek?.());
      const cur = dragging
        ? gestures.getSeekPreviewTime()
        : Number.isFinite(video.currentTime)
          ? video.currentTime
          : 0;
      const pct = dur > 0 ? Math.max(0, Math.min(100, (cur / dur) * 100)) : 0;
      const timeStr = `${formatTime(cur)}/${formatTime(dur)}`;

      [els.timeText, els.winTime].forEach((el) => {
        if (el) el.textContent = timeStr;
      });
      [els.progressFill, els.winProgressFill].forEach((el) => {
        if (el) el.style.width = `${pct}%`;
      });
      [els.progressThumb, els.winProgressThumb].forEach((el) => {
        if (el) el.style.left = `${pct}%`;
      });
    }

    function syncPassthroughState() {
      const video = currentVideo || adapter?.getVideoElement?.();
      const rawNext =
        enabled && !nativeBarMode
          ? Boolean(checkPassthrough?.({ video, container: currentContainer, api }))
          : false;
      const changed = rawNext !== passthroughActive;
      passthroughActive = rawNext;
      els.root?.classList.toggle("is-ending-passthrough", passthroughActive);
      if (changed) {
        syncHtmlClass();
        if (passthroughActive) {
          hideHud();
          hideGestureHud(0);
        }
        syncVolumeUi();
      }
    }

    function syncVolumeUi() {
      const video = currentVideo || adapter?.getVideoElement?.();
      const rawVol = Number.isFinite(video?.volume) ? video.volume : 1;
      if (rawVol > 0.02) lastNonZeroVolume = rawVol;
      const muted = Boolean(video?.muted) || rawVol <= 0.001;
      if (els.unmutePill) {
        const showUnmute = Boolean(
          enabled && !nativeBarMode && !passthroughActive && !userMuted && video && muted
        );
        els.unmutePill.classList.toggle("is-visible", showUnmute);
      }
    }

    function unmuteVideo() {
      const video = currentVideo || adapter?.getVideoElement?.();
      userMuted = false;
      if (video) {
        video.muted = false;
        if (!Number.isFinite(video.volume) || video.volume < 0.05) {
          video.volume = lastNonZeroVolume >= 0.05 ? lastNonZeroVolume : 0.8;
        }
      }
      syncVolumeUi();
      showMiniToast("已恢复声音", MINI_TOAST_MS);
    }

    function togglePlayWithPulse() {
      const video = currentVideo || adapter?.getVideoElement?.();
      if (!video) return;
      let pausedAfter = false;
      if (video.paused) {
        pausedAfter = false;
        lastVideoPaused = false;
        video.play?.().catch?.(() => {});
      } else {
        pausedAfter = true;
        lastVideoPaused = true;
        video.pause?.();
      }
      syncPlaybackUi();
      flashCenterPlayState(pausedAfter);
      wakeHud(pausedAfter ? HUD_BAR_HIDE_MS : HUD_QUICK_HIDE_MS);
    }

    function flashCenterPlayState(nowPaused) {
      if (!els.playFlash) return;
      clearTimeout(playFlashTimer);
      els.playFlash.innerHTML = nowPaused ? ASSETS.PAUSE_SVG : ASSETS.PLAY_SVG;
      els.playFlash.classList.remove("is-visible");
      if (typeof els.playFlash.offsetWidth === "number") void els.playFlash.offsetWidth;
      els.playFlash.classList.add("is-visible");
      playFlashTimer = setTimeout(() => {
        playFlashTimer = null;
        els.playFlash?.classList.remove("is-visible");
      }, PLAY_FLASH_MS);
    }

    function renderScrubPreview(payload) {
      if (!els.scrubPreview) return;
      const { mode, previewSec, durSec, deltaSec } = payload;
      const isTrack = mode === "track";
      els.scrubPreview.classList.toggle("is-track-mode", isTrack);
      els.scrubPreview.classList.toggle("is-swipe-mode", !isTrack);
      els.scrubPreview.style.left = "";

      const handledThumb = typeof onRenderScrub === "function" ? Boolean(onRenderScrub(payload, api)) : false;
      if (!handledThumb) {
        els.scrubPreview.classList.remove("has-thumb");
      }

      if (els.scrubThumbTime) {
        els.scrubThumbTime.textContent = formatTime(previewSec);
      }
      if (els.scrubTime) {
        els.scrubTime.textContent = `${formatTime(previewSec)} / ${formatTime(durSec)}`;
      }
      if (els.scrubDelta) {
        const rounded = Math.round(deltaSec || 0);
        if (rounded === 0) {
          els.scrubDelta.textContent = "";
          els.scrubDelta.style.display = "none";
        } else {
          const sign = rounded > 0 ? "+" : "-";
          const abs = Math.abs(rounded);
          const dStr = abs >= 60 ? formatTime(abs) : `${abs}秒`;
          els.scrubDelta.textContent = `${sign}${dStr}`;
          els.scrubDelta.style.display = "inline";
        }
      }
      els.scrubPreview.classList.add("is-visible");
    }

    function hideScrubPreview(delayMs = 0) {
      clearTimeout(scrubPreviewTimer);
      const resetAndHide = () => {
        scrubPreviewTimer = null;
        onHideScrub?.();
        els.scrubPreview?.classList.remove("is-visible");
      };
      if (delayMs > 0) {
        scrubPreviewTimer = setTimeout(resetAndHide, delayMs);
      } else {
        resetAndHide();
      }
    }

    function showVolumeHud(pct) {
      if (!els.gestureHud) return;
      clearTimeout(gestureHudTimer);
      gestureHudTimer = null;
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      if (els.hudMain) els.hudMain.textContent = clamped === 0 ? "静音" : `音量 ${clamped}%`;
      if (els.hudSub) els.hudSub.style.display = "none";
      if (els.hudVolRow) els.hudVolRow.style.display = "flex";
      if (els.hudVolFill) els.hudVolFill.style.width = `${clamped}%`;
      els.gestureHud.classList.add("is-visible");
    }

    function hideGestureHud(delayMs = 0) {
      clearTimeout(gestureHudTimer);
      if (delayMs > 0) {
        gestureHudTimer = setTimeout(() => {
          gestureHudTimer = null;
          els.gestureHud?.classList.remove("is-visible");
        }, delayMs);
      } else {
        gestureHudTimer = null;
        els.gestureHud?.classList.remove("is-visible");
      }
    }

    function showMiniToast(text, durationMs = MINI_TOAST_MS) {
      clearTimeout(miniToastTimer);
      if (!els.miniToast) return;
      els.miniToast.textContent = text;
      els.miniToast.classList.add("is-visible");
      miniToastTimer = setTimeout(() => {
        miniToastTimer = null;
        els.miniToast?.classList.remove("is-visible");
      }, durationMs);
    }

    function hideLockBtn() {
      clearTimeout(lockAwakeTimer);
      lockAwakeTimer = null;
      lockAwake = false;
      els.root?.classList.remove("is-lock-awake");
    }

    function wakeLockBtn(ms = LOCK_AWAKE_MS) {
      if (!enabled || nativeBarMode || !fs.isFullscreenNow()) return;
      clearTimeout(lockAwakeTimer);
      lockAwake = true;
      els.root?.classList.add("is-lock-awake");
      lockAwakeTimer = setTimeout(() => {
        lockAwakeTimer = null;
        lockAwake = false;
        els.root?.classList.remove("is-lock-awake");
      }, ms);
    }

    function pulseLockBtn() {
      if (!els.lockBtn) return;
      els.lockBtn.classList.remove("is-pulse");
      if (typeof els.lockBtn.offsetWidth === "number") void els.lockBtn.offsetWidth;
      els.lockBtn.classList.add("is-pulse");
    }

    function positionPopover(drawerEl, anchorBtn, baseHalfW = 58) {
      if (!drawerEl) return;
      const rootRect = els.root?.getBoundingClientRect?.();
      const btnRect = anchorBtn?.getBoundingClientRect?.();
      const scale = Number(host?.style?.getPropertyValue?.("--ytb-s")) || 1;
      if (rootRect && rootRect.width > 0 && btnRect && btnRect.width > 0) {
        const centerX = btnRect.left - rootRect.left + btnRect.width / 2;
        const halfW = baseHalfW * scale;
        const clampedX = Math.max(halfW + 8, Math.min(rootRect.width - halfW - 8, centerX));
        drawerEl.style.left = `${clampedX}px`;
      } else {
        drawerEl.style.left = "";
      }
    }

    function positionSpeedPopover() {
      const btn = fs.isFullscreenNow() ? els.speedBtn : els.winSpeedBtn;
      positionPopover(els.speedDrawer, btn, 38);
    }

    function positionQualityPopover() {
      const btn = fs.isFullscreenNow() ? els.qualityBtn : els.winQualityBtn;
      positionPopover(els.qualityDrawer, btn, 60);
    }

    function closeAllDrawers() {
      speedDrawerOpen = false;
      qualityDrawerOpen = false;
      els.speedDrawer?.classList.remove("is-open");
      els.qualityDrawer?.classList.remove("is-open");
      onHideDrawers?.();
    }

    function setScreenLocked(nextLocked, { silent = false } = {}) {
      const target = Boolean(nextLocked) && enabled && !nativeBarMode && fs.isFullscreenNow();
      if (screenLocked === target) {
        if (target) wakeLockBtn(LOCK_AWAKE_MS);
        return;
      }
      screenLocked = target;
      if (screenLocked) {
        gestures?.clearTimers?.();
        closeAllDrawers();
        els.root?.classList.remove("is-hud-open");
        hudVisible = false;
        clearTimeout(hudTimer);
        hudTimer = null;
        els.root?.classList.add("is-locked");
        if (els.lockBtn) {
          els.lockBtn.innerHTML = ASSETS.LOCK_CLOSED_SVG;
          els.lockBtn.setAttribute("aria-label", "解锁");
        }
        wakeLockBtn(LOCK_AWAKE_MS);
        if (!silent) showMiniToast("已锁屏，点击锁图标解锁", 1400);
      } else {
        hideLockBtn();
        els.root?.classList.remove("is-locked", "is-lock-awake");
        if (els.lockBtn) {
          els.lockBtn.innerHTML = ASSETS.LOCK_OPEN_SVG;
          els.lockBtn.setAttribute("aria-label", "锁屏");
        }
        if (!silent && enabled && !nativeBarMode) {
          wakeHud(HUD_BAR_HIDE_MS);
          showMiniToast("已解除锁屏", 1100);
        }
      }
    }

    function setSpeedDrawerOpen(open) {
      speedDrawerOpen = Boolean(open);
      if (speedDrawerOpen) {
        qualityDrawerOpen = false;
        els.qualityDrawer?.classList.remove("is-open");
        onHideDrawers?.("speed");
        positionSpeedPopover();
      }
      els.speedDrawer?.classList.toggle("is-open", speedDrawerOpen);
      if (speedDrawerOpen) {
        clearTimeout(hudTimer);
        hudTimer = null;
      } else if (hudVisible) {
        scheduleHudHide(HUD_BAR_HIDE_MS);
      }
    }

    function setQualityDrawerOpen(open, renderQualityFn) {
      qualityDrawerOpen = Boolean(open);
      if (qualityDrawerOpen) {
        speedDrawerOpen = false;
        els.speedDrawer?.classList.remove("is-open");
        onHideDrawers?.("quality");
        renderQualityFn?.();
        positionQualityPopover();
      }
      els.qualityDrawer?.classList.toggle("is-open", qualityDrawerOpen);
      if (qualityDrawerOpen) {
        clearTimeout(hudTimer);
        hudTimer = null;
      } else if (hudVisible) {
        scheduleHudHide(HUD_BAR_HIDE_MS);
      }
    }

    function hideHud() {
      clearTimeout(hudTimer);
      hudTimer = null;
      hudVisible = false;
      speedDrawerOpen = false;
      qualityDrawerOpen = false;
      if (disconnectConfirmArmed) {
        clearDisconnectConfirm();
        syncTopBar();
      }
      els.speedDrawer?.classList.remove("is-open");
      els.qualityDrawer?.classList.remove("is-open");
      onHideDrawers?.();
      els.root?.classList.remove("is-hud-open");
    }

    function scheduleHudHide(ms = HUD_BAR_HIDE_MS) {
      clearTimeout(hudTimer);
      const video = currentVideo || adapter?.getVideoElement?.();
      if (
        Boolean(video?.paused) ||
        screenLocked ||
        speedDrawerOpen ||
        qualityDrawerOpen ||
        Boolean(hasOpenExtraDrawers?.()) ||
        Boolean(gestures?.isDraggingSeek?.()) ||
        gestures?.getGestureMode?.() === "seek" ||
        gestures?.getGestureMode?.() === "volume"
      ) {
        hudTimer = null;
        return;
      }
      hudTimer = setTimeout(() => {
        hudTimer = null;
        hideHud();
      }, ms);
    }

    function wakeHud(ms = HUD_BAR_HIDE_MS) {
      if (!enabled || nativeBarMode || passthroughActive) return;
      if (screenLocked) {
        wakeLockBtn(LOCK_AWAKE_MS);
        return;
      }
      hudVisible = true;
      els.root?.classList.add("is-hud-open");
      syncPlaybackUi();
      syncVolumeUi();
      onWakeHud?.(api);
      syncRateUi();
      syncTopBar();
      scheduleHudHide(ms);
    }

    function hideReturnPill() {
      clearTimeout(returnPillTimer);
      returnPillTimer = null;
      els.returnPill?.classList.remove("is-awake");
    }

    function wakeReturnPill(ms = RETURN_PILL_HIDE_MS) {
      if (!enabled || !nativeBarMode || !els.returnPill) return;
      els.returnPill.classList.add("is-awake");
      clearTimeout(returnPillTimer);
      returnPillTimer = setTimeout(() => {
        returnPillTimer = null;
        els.returnPill?.classList.remove("is-awake");
      }, ms);
    }

    function setNativeBarMode(nextNative) {
      nativeBarMode = Boolean(nextNative);
      if (screenLocked) {
        setScreenLocked(false, { silent: true });
      }
      if (nativeBarMode) {
        passthroughActive = false;
        els.root?.classList.remove("is-ending-passthrough");
        hideHud();
        hideGestureHud(0);
        els.root?.classList.add("is-native-mode");
        syncHtmlClass();
        syncVolumeUi();
        wakeReturnPill(RETURN_PILL_HIDE_MS);
      } else {
        hideReturnPill();
        els.root?.classList.remove("is-native-mode");
        syncHtmlClass();
        syncPassthroughState();
        wakeHud(HUD_QUICK_HIDE_MS);
      }
    }

    function renderSpeedDrawer() {
      if (!els.speedDrawer) return;
      els.speedDrawer.textContent = "";
      RATE_OPTIONS.forEach((rate) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ytb-speed-opt";
        btn.dataset.rate = String(rate);
        btn.textContent = formatOptionText(rate);
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          gestures?.clearLockedBoostSpeed?.({ restore: false });
          baseRate = rate;
          engine?.setPlaybackRate?.(rate, { showToast: true });
          syncRateUi();
          setSpeedDrawerOpen(false);
          scheduleHudHide(HUD_BAR_HIDE_MS);
          showMiniToast(`倍速 ${formatOptionText(rate)}`, MINI_TOAST_MS);
        });
        els.speedDrawer.appendChild(btn);
      });
    }

    function createUiDom() {
      if (host) return;
      host = document.createElement("div");
      host.id = hostId;
      host.style.cssText = `position:absolute;inset:0;z-index:${hostZIndex};pointer-events:none;overflow:hidden;`;
      shadow = host.attachShadow({ mode: "open" });
      const css = buildTouchCss(theme, {
        customThumbUri: ASSETS.CUSTOM_THUMB_DATA_URI,
        includeBiliExtras,
        includeYtExtras,
      });

      shadow.innerHTML = `
        <style>${css}</style>
        <div id="ytbRoot" class="ytb-root">
          <div id="ytbShield" class="ytb-shield">
            <div id="ytbVolZone" class="ytb-vol-zone"></div>
          </div>
          <div id="ytbBoostChip" class="ytb-boost-chip">
            <span class="ytb-boost-arrows">▶▶</span>
            <span id="ytbBoostText">2.0x 倍速播放中</span>
            <span id="ytbBoostHint" class="ytb-boost-hint">上滑锁定</span>
          </div>
          <button id="ytbUnmutePill" class="ytb-unmute-pill" type="button">🔇 点此开声</button>
          <button id="ytbReturnPill" class="ytb-return-pill" type="button">✨ 触屏栏</button>
          <button id="ytbLockBtn" class="ytb-lock-btn" type="button" aria-label="锁屏">${ASSETS.LOCK_OPEN_SVG}</button>
          <div id="ytbPlayFlash" class="ytb-play-flash"></div>
          <div id="ytbGestureHud" class="ytb-gesture-hud">
            <div id="ytbHudMain" class="ytb-hud-main"></div>
            <div id="ytbHudSub" class="ytb-hud-sub"></div>
            <div id="ytbHudVolRow" class="ytb-hud-vol-row">
              <div id="ytbHudVolFill" class="ytb-hud-vol-fill">
                <canvas id="ytbHudVolFillCanvas" class="ytb-fill-canvas" width="4" height="4" aria-hidden="true"></canvas>
              </div>
            </div>
          </div>
          <div id="ytbScrubPreview" class="ytb-scrub-preview">
            <div id="ytbScrubThumb" class="ytb-scrub-thumb">
              ${scrubThumbHtml}
              <span id="ytbScrubThumbTime" class="ytb-scrub-thumb-time">00:00</span>
            </div>
            <div id="ytbScrubMeta" class="ytb-scrub-meta">
              <span id="ytbScrubTime" class="ytb-scrub-time">00:00 / 00:00</span>
              <span id="ytbScrubDelta" class="ytb-scrub-delta"></span>
            </div>
          </div>
          <div id="ytbMiniToast" class="ytb-mini-toast"></div>

          <div id="ytbWinTop" class="ytb-win-top">
            <button id="ytbWinSyncBtn" class="ytb-sync-badge ytb-sync-badge-win" type="button" aria-label="快捷同步"></button>
            ${winTopExtraHtml}
            <button id="ytbWinNativeBtn" class="ytb-ghost-btn" type="button">原栏</button>
          </div>

          <div id="ytbTopBar" class="ytb-top-bar">
            <div class="ytb-top-left">
              <button id="ytbBackBtn" class="ytb-back-btn" type="button" aria-label="退出全屏">${ASSETS.BACK_SVG}</button>
              <div id="ytbTitle" class="ytb-title"></div>
            </div>
            <div class="ytb-top-right">
              <button id="ytbSyncBadge" class="ytb-sync-badge" type="button" aria-label="快捷同步"></button>
              <button id="ytbNativeBtn" class="ytb-ghost-btn" type="button">原栏</button>
            </div>
          </div>

          <div id="ytbSpeedDrawer" class="ytb-speed-drawer"></div>
          <div id="ytbQualityDrawer" class="ytb-quality-drawer"></div>
          ${extraDrawersHtml}

          <div id="ytbBottomBar" class="ytb-bottom-bar">
            <div class="ytb-bar-fs">
              <div class="ytb-fs-time-row">
                <span id="ytbTime" class="ytb-time">00:00/00:00</span>
              </div>
              <div id="ytbProgressWrap" class="ytb-progress-wrap">
                <div class="ytb-progress-track">
                  <div id="ytbProgressFill" class="ytb-progress-fill">
                    <canvas id="ytbProgressFillCanvas" class="ytb-fill-canvas" width="4" height="4" aria-hidden="true"></canvas>
                  </div>
                  <div id="ytbProgressThumb" class="ytb-progress-thumb"></div>
                </div>
              </div>
              <div class="ytb-tier-2">
                <div class="ytb-left-actions">
                  ${fsLeftExtraHtml}
                </div>
                <div class="ytb-right-actions">
                  ${fsRightExtraHtml}
                  <button id="ytbQualityBtn" class="ytb-icon-btn ytb-btn-quality is-hidden" type="button">画质</button>
                  <button id="ytbSpeedBtn" class="ytb-icon-btn ytb-btn-speed" type="button">倍速</button>
                  <button id="ytbFullBtn" class="ytb-icon-btn ytb-btn-full" type="button" aria-label="退出全屏">${ASSETS.FULL_EXIT_SVG}</button>
                </div>
              </div>
            </div>

            <div class="ytb-bar-win">
              <button id="ytbWinPlayBtn" class="ytb-icon-btn ytb-btn-play" type="button" aria-label="播放">${ASSETS.PLAY_SVG}</button>
              <div id="ytbWinProgressWrap" class="ytb-progress-wrap">
                <div class="ytb-progress-track">
                  <div id="ytbWinProgressFill" class="ytb-progress-fill">
                    <canvas id="ytbWinProgressFillCanvas" class="ytb-fill-canvas" width="4" height="4" aria-hidden="true"></canvas>
                  </div>
                  <div id="ytbWinProgressThumb" class="ytb-progress-thumb"></div>
                </div>
              </div>
              <span id="ytbWinTime" class="ytb-time">00:00/00:00</span>
              <button id="ytbWinQualityBtn" class="ytb-icon-btn ytb-btn-quality is-hidden" type="button">画质</button>
              <button id="ytbWinSpeedBtn" class="ytb-icon-btn ytb-btn-speed" type="button">倍速</button>
              <button id="ytbWinFullBtn" class="ytb-icon-btn ytb-btn-full" type="button" aria-label="全屏">${ASSETS.FULL_ENTER_SVG}</button>
            </div>
          </div>
        </div>
      `;

      const baseIds = {
        root: "ytbRoot",
        shield: "ytbShield",
        volZone: "ytbVolZone",
        boostChip: "ytbBoostChip",
        boostText: "ytbBoostText",
        boostHint: "ytbBoostHint",
        unmutePill: "ytbUnmutePill",
        returnPill: "ytbReturnPill",
        lockBtn: "ytbLockBtn",
        playFlash: "ytbPlayFlash",
        gestureHud: "ytbGestureHud",
        hudMain: "ytbHudMain",
        hudSub: "ytbHudSub",
        hudVolRow: "ytbHudVolRow",
        hudVolFill: "ytbHudVolFill",
        hudVolFillCanvas: "ytbHudVolFillCanvas",
        scrubPreview: "ytbScrubPreview",
        scrubThumb: "ytbScrubThumb",
        scrubCanvas: "ytbScrubCanvas",
        scrubThumbImg: "ytbScrubThumbImg",
        scrubThumbTime: "ytbScrubThumbTime",
        scrubMeta: "ytbScrubMeta",
        scrubTime: "ytbScrubTime",
        scrubDelta: "ytbScrubDelta",
        miniToast: "ytbMiniToast",
        winTop: "ytbWinTop",
        winSyncBtn: "ytbWinSyncBtn",
        winNativeBtn: "ytbWinNativeBtn",
        topBar: "ytbTopBar",
        backBtn: "ytbBackBtn",
        title: "ytbTitle",
        syncBadge: "ytbSyncBadge",
        nativeBtn: "ytbNativeBtn",
        speedDrawer: "ytbSpeedDrawer",
        qualityDrawer: "ytbQualityDrawer",
        bottomBar: "ytbBottomBar",
        timeText: "ytbTime",
        progressWrap: "ytbProgressWrap",
        progressFill: "ytbProgressFill",
        progressFillCanvas: "ytbProgressFillCanvas",
        progressThumb: "ytbProgressThumb",
        playBtn: "ytbPlayBtn",
        qualityBtn: "ytbQualityBtn",
        speedBtn: "ytbSpeedBtn",
        fullBtn: "ytbFullBtn",
        winPlayBtn: "ytbWinPlayBtn",
        winProgressWrap: "ytbWinProgressWrap",
        winProgressFill: "ytbWinProgressFill",
        winProgressFillCanvas: "ytbWinProgressFillCanvas",
        winProgressThumb: "ytbWinProgressThumb",
        winTime: "ytbWinTime",
        winQualityBtn: "ytbWinQualityBtn",
        winSpeedBtn: "ytbWinSpeedBtn",
        winFullBtn: "ytbWinFullBtn",
      };
      els = {};
      Object.entries(baseIds).forEach(([k, id]) => {
        els[k] = shadow.getElementById(id);
      });
      // Canvas bitmaps bypass Chromium Auto/Force Dark DarkModeFilter::kBackground inversion.
      [els.progressFillCanvas, els.winProgressFillCanvas, els.hudVolFillCanvas].forEach((cvs) => {
        if (!cvs || typeof cvs.getContext !== "function") return;
        try {
          const ctx = cvs.getContext("2d");
          if (!ctx) return;
          ctx.fillStyle = theme.accent;
          ctx.fillRect(0, 0, cvs.width || 4, cvs.height || 4);
        } catch {}
      });

      renderSpeedDrawer();

      gestures = bindTouchGestures({
        LONG_PRESS_MS: 350,
        SINGLE_TAP_DELAY_MS: 240,
        DOUBLE_TAP_MS: 250,
        DOUBLE_TAP_DIST_PX: 36,
        BOOST_LOCK_SLIDE_PX: 48,
        DRAG_THRESHOLD_PX: 14,
        TAP_MOVE_LIMIT_PX: 10,
        LOCK_AWAKE_MS,
        BOOST_LOCKED_FADE_MS: 600,
        HUD_BAR_HIDE_MS,
        MINI_TOAST_MS,
        SCRUB_HUD_HIDE_MS: 260,
        VOL_HUD_HIDE_MS: 320,
        formatTime,
        formatOptionText,
        els,
        getEnabled: () => enabled,
        isNativeBarMode: () => nativeBarMode,
        isPassthrough: () => passthroughActive,
        isScreenLocked: () => screenLocked,
        isHudVisible: () => hudVisible,
        isLockAwake: () => lockAwake,
        hasOpenDrawers: () => Boolean(speedDrawerOpen || qualityDrawerOpen || hasOpenExtraDrawers?.()),
        closeOpenDrawers: closeAllDrawers,
        wakeHud,
        hideHud,
        scheduleHudHide,
        wakeLockBtn,
        hideLockBtn,
        pulseLockBtn,
        showMiniToast,
        getVideo: () => currentVideo || adapter?.getVideoElement?.(),
        getEngine: () => engine,
        getDisplayRate,
        updateBaseRate: (r) => { baseRate = r; },
        syncRateUi,
        syncPlaybackUi,
        syncVolumeUi,
        setUserMuted: (m) => { userMuted = m; },
        togglePlayWithPulse,
        onScrubStart: () => onScrubStart?.(api),
        renderScrubPreview,
        hideScrubPreview,
        showVolumeHud,
        hideGestureHud,
        getVolSplitRatio: () => (typeof getVolSplitRatio === "function" ? getVolSplitRatio(fs.isFullscreenNow()) : 0.5),
        clearHudTimer: () => {
          clearTimeout(hudTimer);
          hudTimer = null;
        },
      });

      els.unmutePill?.addEventListener("click", (e) => {
        e.stopPropagation();
        unmuteVideo();
      });
      [els.playBtn, els.winPlayBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          togglePlayWithPulse();
        });
      });
      [els.nativeBtn, els.winNativeBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          setNativeBarMode(true);
        });
      });
      [els.syncBadge, els.winSyncBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (screenLocked) {
            wakeLockBtn(LOCK_AWAKE_MS);
            return;
          }
          if (typeof onToggleSync !== "function" || syncActionBusy) return;
          const st = getEffectiveSyncState();
          if (st === "idle") {
            clearDisconnectConfirm();
            syncActionBusy = true;
            clearTimeout(syncActionBusyTimer);
            syncActionBusyTimer = setTimeout(() => {
              syncActionBusyTimer = null;
              syncActionBusy = false;
            }, 800);
            showMiniToast("正在开启同步...", 1100);
            scheduleHudHide(HUD_BAR_HIDE_MS);
            onToggleSync("connect");
          } else if (st === "conflict") {
            clearDisconnectConfirm();
            scheduleHudHide(HUD_BAR_HIDE_MS);
            onToggleSync("conflict");
          } else if (st === "waiting" || st === "reconnecting") {
            clearDisconnectConfirm();
            syncActionBusy = true;
            clearTimeout(syncActionBusyTimer);
            syncActionBusyTimer = setTimeout(() => {
              syncActionBusyTimer = null;
              syncActionBusy = false;
            }, 600);
            showMiniToast("已取消同步", 1100);
            scheduleHudHide(HUD_BAR_HIDE_MS);
            onToggleSync("disconnect");
          } else {
            if (!disconnectConfirmArmed) {
              disconnectConfirmArmed = true;
              clearTimeout(disconnectConfirmTimer);
              disconnectConfirmTimer = setTimeout(() => {
                disconnectConfirmTimer = null;
                disconnectConfirmArmed = false;
                if (enabled) syncTopBar();
              }, 2000);
              syncTopBar();
              scheduleHudHide(2600);
            } else {
              clearDisconnectConfirm();
              syncActionBusy = true;
              clearTimeout(syncActionBusyTimer);
              syncActionBusyTimer = setTimeout(() => {
                syncActionBusyTimer = null;
                syncActionBusy = false;
              }, 600);
              showMiniToast("已断开同步", 1100);
              syncTopBar();
              scheduleHudHide(HUD_BAR_HIDE_MS);
              onToggleSync("disconnect");
            }
          }
        });
      });
      els.returnPill?.addEventListener("click", (e) => {
        e.stopPropagation();
        setNativeBarMode(false);
      });
      els.lockBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        setScreenLocked(!screenLocked);
      });
      [els.speedBtn, els.winSpeedBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (screenLocked) {
            wakeLockBtn(LOCK_AWAKE_MS);
            return;
          }
          if (!hudVisible) wakeHud(HUD_BAR_HIDE_MS);
          setSpeedDrawerOpen(!speedDrawerOpen);
        });
      });
      [els.fullBtn, els.winFullBtn, els.backBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          fs.toggle();
          if (hudVisible) scheduleHudHide(HUD_BAR_HIDE_MS);
          else wakeHud(HUD_BAR_HIDE_MS);
        });
      });

      onBindShadowControls?.(api);
    }

    function ensureMounted() {
      if (!enabled) return false;
      const video = adapter?.getVideoElement?.() || null;
      const container = findContainer(video);
      if (!container) return false;
      const classTarget = (typeof findShieldClassTarget === "function" ? findShieldClassTarget(video) : null) || container;
      clearTimeout(mountRetryTimer);
      mountRetryTimer = null;
      ensureGlobalStyle();
      createUiDom();
      currentContainer = container;
      if (host.parentNode !== container) {
        container.appendChild(host);
      }
      bindContainerShield(container);
      bindContainerObserver(container, classTarget);
      bindVideoEvents(video);
      syncScale();
      syncPassthroughState();
      syncHtmlClass();
      syncPlaybackUi();
      syncVolumeUi();
      syncRateUi();
      syncTopBar();
      refreshVideoContext({ skipAlive: true });
      return true;
    }

    function scheduleMountRetry(attempt = 0) {
      clearTimeout(mountRetryTimer);
      mountRetryTimer = null;
      if (!enabled || (host && host.isConnected) || attempt >= 35) return;
      mountRetryTimer = setTimeout(() => {
        mountRetryTimer = null;
        if (!enabled) return;
        if (ensureMounted()) {
          setNativeBarMode(nativeBarMode);
        } else {
          scheduleMountRetry(attempt + 1);
        }
      }, 400);
    }

    function ensureAlive() {
      if (!enabled) return false;
      const video = adapter?.getVideoElement?.() || null;
      const nextContainer = findContainer(video);
      const detached =
        !host ||
        !host.isConnected ||
        !currentContainer ||
        currentVideo?.isConnected === false ||
        (nextContainer && nextContainer !== currentContainer);
      if (!detached) {
        syncPassthroughState();
        return true;
      }
      if (ensureMounted()) {
        setNativeBarMode(nativeBarMode);
        return true;
      }
      scheduleMountRetry(0);
      return false;
    }

    function refreshVideoContext({ skipAlive = false } = {}) {
      if (!enabled) return;
      if (!skipAlive) ensureAlive();
      onRefreshContext?.(api);
      syncPassthroughState();
      syncTopBar();
    }

    function enable({ startNative = false } = {}) {
      if (
        typeof location !== "undefined" &&
        location?.hostname &&
        allowedHosts.length > 0 &&
        !allowedHosts.includes(location.hostname)
      ) {
        return;
      }
      const wasEnabled = enabled;
      if (!wasEnabled) {
        nativeBarMode = Boolean(startNative);
      }
      enabled = true;
      bindGlobalEvents();
      const mounted = ensureMounted();
      syncHtmlClass();
      if (!mounted) {
        scheduleMountRetry(0);
      } else if (!wasEnabled) {
        setNativeBarMode(nativeBarMode);
      }
    }

    function disable() {
      if (gestures?.getGestureMode?.() === "boost") {
        gestures.releaseBoost({ cancelLock: true });
      }
      gestures?.clearLockedBoostSpeed?.({ restore: false });
      enabled = false;
      nativeBarMode = false;
      fs.reset({ exitSystem: true });
      hudVisible = false;
      speedDrawerOpen = false;
      qualityDrawerOpen = false;
      screenLocked = false;
      lockAwake = false;
      passthroughActive = false;
      userMuted = false;
      onDisable?.(api);
      clearTimers();
      gestures?.resetState?.();
      unbindGlobalEvents();
      unbindContainerShield();
      unbindContainerObserver();
      unbindVideoEvents();
      currentContainer = null;
      syncHtmlClass();
      if (host && host.parentNode) {
        host.parentNode.removeChild(host);
      }
      if (els.root) {
        els.root.classList.remove(
          "is-hud-open",
          "is-native-mode",
          "is-fullscreen",
          "is-ending-passthrough",
          "is-locked",
          "is-lock-awake",
          "is-ep-open"
        );
      }
      els.unmutePill?.classList.remove("is-visible");
      els.boostChip?.classList.remove("is-visible", "is-lock-armed", "is-locked-speed", "is-locked-compact", "is-locked-hidden");
      els.miniToast?.classList.remove("is-visible");
      els.playFlash?.classList.remove("is-visible");
      els.speedDrawer?.classList.remove("is-open");
      els.qualityDrawer?.classList.remove("is-open");
      els.gestureHud?.classList.remove("is-visible");
      els.scrubPreview?.classList.remove("is-visible");
    }

    function updateRate(rate) {
      if (typeof rate !== "number" || !Number.isFinite(rate)) return;
      baseRate = rate;
      if (gestures?.isSpeedLockedByBoost?.() && Math.abs(rate - 2.0) > 0.05) {
        gestures.clearLockedBoostSpeed({ restore: false });
      }
      if (enabled) syncRateUi();
    }

    function setActiveCount(count) {
      if (typeof count === "number" && Number.isFinite(count)) {
        activeCount = Math.max(1, Math.round(count));
      }
      if (enabled) syncTopBar();
    }

    function setSyncState(nextState) {
      const normalized = nextState ? String(nextState) : null;
      if (normalized !== syncUiState) {
        syncActionBusy = false;
        clearTimeout(syncActionBusyTimer);
        syncActionBusyTimer = null;
      }
      syncUiState = normalized;
      const st = getEffectiveSyncState();
      if (st !== "synced" && st !== "solo") {
        clearDisconnectConfirm();
      }
      if (enabled) syncTopBar();
    }

    const api = {
      enable,
      disable,
      enterTouchMode: () => {
        if (enabled) setNativeBarMode(false);
      },
      enterNativeMode: () => {
        if (enabled) setNativeBarMode(true);
      },
      ensureAlive,
      refreshVideoContext,
      updateRate,
      setActiveCount,
      setSyncState,
      isActive: () => enabled,
      isNativeBarMode: () => nativeBarMode,
      isScreenLocked: () => screenLocked,
      isHudVisible: () => hudVisible,
      isFullscreenNow: () => fs.isFullscreenNow(),
      isDraggingSeek: () => Boolean(gestures?.isDraggingSeek?.()),
      getGestureMode: () => gestures?.getGestureMode?.() || "idle",
      getHost: () => host,
      getShadow: () => shadow,
      getEls: () => els,
      getCurrentContainer: () => currentContainer,
      getCurrentVideo: () => currentVideo,
      getFs: () => fs,
      triggerFullscreenChange: () => onFullscreenChange(),
      runNativeClick,
      syncHtmlClass,
      syncTopBar,
      syncPlaybackUi,
      syncPassthroughState,
      wakeHud,
      hideHud,
      scheduleHudHide,
      wakeLockBtn,
      showMiniToast,
      closeAllDrawers,
      setSpeedDrawerOpen,
      setQualityDrawerOpen,
      positionPopover,
      positionQualityPopover,
      renderScrubPreview,
      hideScrubPreview,
      clearLockedBoostSpeed: (opts) => gestures?.clearLockedBoostSpeed?.(opts),
      scheduleQualitySync: (fn, ms) => {
        clearTimeout(qualitySyncTimer);
        qualitySyncTimer = setTimeout(() => {
          qualitySyncTimer = null;
          if (enabled) fn();
        }, ms);
      },
      HUD_BAR_HIDE_MS,
      MINI_TOAST_MS,
      LOCK_AWAKE_MS,
    };

    return api;
  }

  touch.createTouchPlayerShell = createTouchPlayerShell;
})();
