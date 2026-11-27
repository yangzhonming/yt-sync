(() => {
  const root = (window.YTSync = window.YTSync || {});

  const RATE_OPTIONS = [2.0, 1.5, 1.25, 1.0, 0.75, 0.5];
  const HUD_QUICK_HIDE_MS = 1000;
  const HUD_BAR_HIDE_MS = 2000;
  const RETURN_PILL_HIDE_MS = 2400;
  const LOCK_AWAKE_MS = 1400;
  const BOOST_LOCKED_FADE_MS = 2500;
  const BRIDGE_TIMEOUT_MS = 800;
  const LONG_PRESS_MS = 350;
  const SINGLE_TAP_DELAY_MS = 240;
  const DOUBLE_TAP_MS = 250;
  const DOUBLE_TAP_DIST_PX = 36;
  const BOOST_LOCK_SLIDE_PX = 48;
  const DRAG_THRESHOLD_PX = 14;
  const TAP_MOVE_LIMIT_PX = 10;
  const MINI_TOAST_MS = 900;
  const PLAY_FLASH_MS = 320;
  const SCRUB_HUD_HIDE_MS = 260;
  const VOL_HUD_HIDE_MS = 320;

  const HOST_ID = "yt-sync-yt-touch-host";
  const STYLE_ID = "yt-sync-yt-touch-style";
  const ACTIVE_HTML_CLASS = "yt-sync-yt-touch-active";
  const NATIVE_HTML_CLASS = "yt-sync-yt-native-mode";
  const WEB_MAX_HTML_CLASS = "yt-sync-yt-web-max";
  const CUSTOM_THUMB_DATA_URI =
    "data:image/png;base64,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";

  const PLAY_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true"><g transform="translate(14.6 14)"><path d="M-7.031-10.875c0 0-1.297-.375-2.391.406-.688.562-.578 2.477-.578 2.477V8.016s-.125 2.226 1 2.976c1.125.75 4-.961 4-.961L7.969 1.875S9 1.062 9 0s-1.031-1.938-1.031-1.938L-7.031-10.875z"/></g></svg>';
  const PAUSE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true"><g transform="translate(14 14)"><path d="M-5.484-10C-7.953-10-8-7.984-8-7.984l-.008 15.968S-7.984 9.992-5.5 9.992c2.484 0 2.496-1.996 2.496-1.996L-2.984-8S-3.015-10-5.484-10z"/></g><g transform="translate(24.812 14)"><path d="M-5.484-10C-7.953-10-8-7.984-8-7.984l-.008 15.968S-7.984 9.992-5.5 9.992c2.484 0 2.496-1.996 2.496-1.996L-2.984-8S-3.015-10-5.484-10z"/></g></svg>';
  const CC_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1z"/></svg>';
  const BACK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  const FULL_ENTER_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  const FULL_EXIT_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
  const LOCK_CLOSED_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z"/></svg>';
  const LOCK_OPEN_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-9.9-1h2.06A3.01 3.01 0 0 1 15 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>';

  function formatTime(sec) {
    const total = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function formatRateText(rate) {
    const r = Math.max(0.2, Math.min(4.0, Math.round((Number(rate) || 1) * 100) / 100));
    if (Math.abs(r - 1.0) < 0.01) return "倍速";
    return `${Number.isInteger(r * 10) ? r.toFixed(1) : r}x`;
  }

  function formatOptionText(rate) {
    const r = Number(rate) || 1;
    return `${Number.isInteger(r * 10) ? r.toFixed(1) : r}x`;
  }

  function formatQualityShortLabel(raw) {
    const s = String(raw || "").replace(/\s+/g, " ").trim();
    if (!s) return "画质";
    if (/4320|8K/i.test(s)) return "8K";
    if (/2160|4K/i.test(s)) return "4K";
    if (/1440/i.test(s)) return "2K";
    if (/1080p\s*60|1080.*60/i.test(s)) return "1080P60";
    if (/1080/i.test(s)) return "1080P";
    if (/720p\s*60|720.*60/i.test(s)) return "720P60";
    if (/720/i.test(s)) return "720P";
    if (/480/i.test(s)) return "480P";
    if (/360/i.test(s)) return "360P";
    if (/240/i.test(s)) return "240P";
    if (/144/i.test(s)) return "144P";
    if (/auto|自动/i.test(s)) return "自动";
    const token = s.split(/\s+/)[0] || s;
    return token.slice(0, 6) || "画质";
  }

  function findMoviePlayer(video) {
    return (
      document.querySelector("#player-container-id #movie_player") ||
      document.querySelector("#player-container #movie_player") ||
      video?.closest?.("#movie_player, .html5-video-player") ||
      document.querySelector("#movie_player") ||
      document.querySelector(".html5-video-player") ||
      null
    );
  }

  function findPlayerContainer(video) {
    const mobileRoot =
      typeof location !== "undefined" && location?.hostname === "m.youtube.com"
        ? document.querySelector("#player-container-id")
        : null;
    if (mobileRoot) return mobileRoot;
    const preferred =
      document.querySelector("#player-container-id #movie_player") ||
      document.querySelector("#player-container #movie_player") ||
      video?.closest?.("#movie_player, .html5-video-player") ||
      document.querySelector("#movie_player") ||
      document.querySelector(".html5-video-player") ||
      video?.parentElement ||
      null;
    return preferred;
  }

  function findNativeCcButton() {
    return document.querySelector(
      "#movie_player .ytp-subtitles-button, .ytp-subtitles-button, ytm-closed-captioning-button button, button.player-cc-button"
    );
  }

  function createYtTouchPlayer({ adapter, engine } = {}) {
    let enabled = false;
    let nativeBarMode = false;
    let webMaximized = false;
    let hadSystemFullscreen = false;
    let hudVisible = false;
    let speedDrawerOpen = false;
    let qualityDrawerOpen = false;
    let screenLocked = false;
    let lockAwake = false;
    let speedLockedByBoost = false;
    let speedLockRestoreRate = 1;
    let adPassthrough = false;
    let endingPassthrough = false;
    let userMuted = false;
    let lastNonZeroVolume = 0.8;
    let activeCount = 1;
    let baseRate = 1;
    let cachedQualityState = {
      available: false,
      currentQuality: "auto",
      currentLabel: "",
      items: [],
    };
    let cachedStoryboard = { available: false, videoId: "" };
    const preloadedSheets = new Set();
    let lastVideoIdSeen = "";

    let host = null;
    let shadow = null;
    let els = {};
    let currentContainer = null;
    let currentVideo = null;

    let hudTimer = null;
    let returnPillTimer = null;
    let lockAwakeTimer = null;
    let boostLockedFadeTimer = null;
    let gestureHudTimer = null;
    let scrubPreviewTimer = null;
    let qualitySyncTimer = null;
    let miniToastTimer = null;
    let playFlashTimer = null;
    let longPressTimer = null;
    let singleTapTimer = null;
    let mountRetryTimer = null;

    let allowNativeClickDepth = 0;

    let draggingSeek = false;
    let seekPreviewTime = 0;
    let activeScrubPointerId = null;
    let activeScrubWrap = null;
    let activeScrubStartSec = 0;
    let lastVideoPaused = null;

    let activePointerId = null;
    let gestureMode = "idle";
    let gestureStartX = 0;
    let gestureStartY = 0;
    let gestureStartAt = 0;
    let gestureMaxDist = 0;
    let gestureStartTimeSec = 0;
    let gestureStartVol = 1;
    let gesturePendingSeekSec = 0;
    let preBoostRate = 1;
    let boostLockArmed = false;
    let lastTapAt = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    let bridgeReqSeq = 0;
    const bridgePending = new Map();

    let globalEventsBound = false;
    let boostGlobalBound = false;
    let scrubWindowBound = false;
    let unbindScrubWindowEvents = () => {};
    let containerShieldEl = null;
    let resizeObserver = null;
    let classObserver = null;

    function isSystemFullscreenNow() {
      return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    }

    function isFullscreenNow() {
      return webMaximized || isSystemFullscreenNow();
    }

    function ensureGlobalStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const chromeTargets = [
        ".ytp-chrome-bottom",
        ".ytp-chrome-top",
        ".ytp-gradient-bottom",
        ".ytp-gradient-top",
        ".ytp-bezel",
        ".ytp-bezel-text-wrapper",
        ".ytp-speedmaster-overlay",
        ".ytp-ce-element",
      ];
      const mobileChromeTargets = [
        "#player-control-overlay",
        ".player-controls-content",
        ".player-controls-background-container",
        "ytm-custom-control",
      ];
      const chromeSelectors = [
        ...chromeTargets.map(
          (sel) =>
            `html.${ACTIVE_HTML_CLASS} #movie_player:not(.ad-showing):not(.ad-interrupting) ${sel}`
        ),
        ...mobileChromeTargets.map((sel) => `html.${ACTIVE_HTML_CLASS} ${sel}`),
      ];
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        ${chromeSelectors.join(",\n        ")} {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        html.${NATIVE_HTML_CLASS} .ytp-chrome-top .ytp-chrome-top-buttons,
        html.${NATIVE_HTML_CLASS} .player-controls-top,
        html.${NATIVE_HTML_CLASS} #player-control-overlay .player-controls-top,
        html.${NATIVE_HTML_CLASS} ytm-custom-control .player-controls-top {
          padding-right: 78px !important;
          box-sizing: border-box !important;
        }
        html.${WEB_MAX_HTML_CLASS},
        html.${WEB_MAX_HTML_CLASS} body {
          overflow: hidden !important;
        }
        html.${WEB_MAX_HTML_CLASS} ytd-masthead,
        html.${WEB_MAX_HTML_CLASS} #masthead-container,
        html.${WEB_MAX_HTML_CLASS} ytm-mobile-topbar-renderer,
        html.${WEB_MAX_HTML_CLASS} .mobile-topbar-header {
          display: none !important;
        }
        html.${WEB_MAX_HTML_CLASS} #player-container-id,
        html.${WEB_MAX_HTML_CLASS} #player-container #movie_player,
        html.${WEB_MAX_HTML_CLASS} #movie_player {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          z-index: 2147483000 !important;
          background: #000000 !important;
        }
        html.${WEB_MAX_HTML_CLASS} #player-container-id #player,
        html.${WEB_MAX_HTML_CLASS} #player-container-id #movie_player {
          position: relative !important;
          inset: auto !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 1 !important;
        }
        html.${WEB_MAX_HTML_CLASS} #movie_player .html5-video-container,
        html.${WEB_MAX_HTML_CLASS} #movie_player video.html5-main-video {
          width: 100% !important;
          height: 100% !important;
          left: 0 !important;
          top: 0 !important;
          object-fit: contain !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    function syncHtmlClass() {
      const rootEl = document.documentElement;
      if (!rootEl) return;
      if (enabled) {
        ensureGlobalStyle();
      }
      rootEl.classList.toggle(
        ACTIVE_HTML_CLASS,
        Boolean(enabled && !nativeBarMode && !adPassthrough)
      );
      rootEl.classList.toggle(
        NATIVE_HTML_CLASS,
        Boolean(enabled && nativeBarMode)
      );
      rootEl.classList.toggle(
        WEB_MAX_HTML_CLASS,
        Boolean(enabled && webMaximized)
      );
    }

    function clearTimers() {
      clearTimeout(hudTimer);
      hudTimer = null;
      clearTimeout(returnPillTimer);
      returnPillTimer = null;
      clearTimeout(lockAwakeTimer);
      lockAwakeTimer = null;
      clearTimeout(boostLockedFadeTimer);
      boostLockedFadeTimer = null;
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
      clearTimeout(longPressTimer);
      longPressTimer = null;
      clearTimeout(singleTapTimer);
      singleTapTimer = null;
      lastTapAt = 0;
      clearTimeout(mountRetryTimer);
      mountRetryTimer = null;
    }

    function clearPendingBridgeRequests() {
      bridgePending.forEach((entry) => {
        clearTimeout(entry.timer);
        entry.resolve(null);
      });
      bridgePending.clear();
    }

    function onBridgeMessage(e) {
      if (e.source !== window) return;
      const data = e.data;
      if (!data || data.__ytSyncBridge !== "res") return;
      const entry = bridgePending.get(data.id);
      if (!entry) return;
      bridgePending.delete(data.id);
      clearTimeout(entry.timer);
      entry.resolve(data.ok ? data.state : null);
    }

    function requestBridge(cmd, payload = {}) {
      if (typeof window?.postMessage !== "function") {
        return Promise.resolve(null);
      }
      return new Promise((resolve) => {
        const id = `ytb_${++bridgeReqSeq}_${Date.now()}`;
        const timer = setTimeout(() => {
          bridgePending.delete(id);
          resolve(null);
        }, BRIDGE_TIMEOUT_MS);
        bridgePending.set(id, { resolve, timer });
        try {
          window.postMessage(
            {
              __ytSyncBridge: "req",
              id,
              cmd,
              ...payload,
            },
            "*"
          );
        } catch {
          bridgePending.delete(id);
          clearTimeout(timer);
          resolve(null);
        }
      });
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
      if (!enabled || nativeBarMode || adPassthrough || endingPassthrough) return;
      if (isHostEvent(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation?.();
      e.stopPropagation();
    }

    function onShieldNativeClick(e) {
      if (!enabled || nativeBarMode || adPassthrough || endingPassthrough) return;
      if (allowNativeClickDepth > 0) return;
      if (isHostEvent(e)) return;
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
      if (!enabled || !isFullscreenNow()) return;
      if (e.key === "Escape") {
        e.preventDefault?.();
        toggleFullscreen();
      }
    }

    function onFullscreenChange() {
      if (!enabled) return;
      const sysFull = isSystemFullscreenNow();
      if (sysFull) {
        hadSystemFullscreen = true;
      } else if (hadSystemFullscreen) {
        hadSystemFullscreen = false;
        if (webMaximized) {
          webMaximized = false;
          syncHtmlClass();
        }
      }
      if (!isFullscreenNow() && screenLocked) {
        setScreenLocked(false, { silent: true });
      }
      if (!host || !host.isConnected) {
        ensureAlive();
      }
      syncScale();
      syncTopBar();
      syncPlaybackUi();
      syncCcUi();
      syncQualityButtons();
      if (speedDrawerOpen) positionSpeedPopover();
      if (qualityDrawerOpen) positionQualityPopover();
    }

    function onWindowResize() {
      if (!enabled) return;
      syncScale();
      if (speedDrawerOpen) positionSpeedPopover();
      if (qualityDrawerOpen) positionQualityPopover();
    }

    function clearLockedBoostSpeed({ restore = false } = {}) {
      clearTimeout(boostLockedFadeTimer);
      boostLockedFadeTimer = null;
      const wasLockedSpeed = speedLockedByBoost;
      speedLockedByBoost = false;
      els.boostChip?.classList.remove("is-visible", "is-lock-armed", "is-locked-speed", "is-locked-compact");
      if (els.boostText) els.boostText.textContent = "2.0x 倍速播放中";
      if (els.boostHint) els.boostHint.textContent = "上滑锁定";
      if (restore && wasLockedSpeed) {
        const nextRate = Number.isFinite(speedLockRestoreRate) ? speedLockRestoreRate : 1;
        baseRate = nextRate;
        engine?.setPlaybackRate?.(nextRate, { showToast: true });
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
          baseRate = 2.0;
          engine?.setPlaybackRate?.(2.0, { showToast: true });
          syncRateUi();
          clearTimeout(boostLockedFadeTimer);
          els.boostChip?.classList.remove("is-locked-compact");
          els.boostChip?.classList.add("is-visible", "is-locked-speed");
          if (els.boostText) els.boostText.textContent = "2.0x 已锁定";
          if (els.boostHint) els.boostHint.textContent = "点此恢复";
          boostLockedFadeTimer = setTimeout(() => {
            boostLockedFadeTimer = null;
            if (!enabled || !speedLockedByBoost) return;
            els.boostChip?.classList.add("is-locked-compact");
            if (els.boostText) els.boostText.textContent = "2.0x";
            if (els.boostHint) els.boostHint.textContent = "×";
          }, BOOST_LOCKED_FADE_MS);
        } else {
          speedLockedByBoost = false;
          els.boostChip?.classList.remove("is-visible", "is-locked-speed", "is-locked-compact");
          if (els.boostText) els.boostText.textContent = "2.0x 倍速播放中";
          if (els.boostHint) els.boostHint.textContent = "上滑锁定";
          const target = Number.isFinite(preBoostRate) ? preBoostRate : 1;
          engine?.setPlaybackRate?.(target, { showToast: false });
          syncRateUi();
        }
      }
    }

    function bindGlobalEvents() {
      if (globalEventsBound) return;
      globalEventsBound = true;
      document.addEventListener("fullscreenchange", onFullscreenChange);
      document.addEventListener("webkitfullscreenchange", onFullscreenChange);
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("touchstart", onNativeWakeTap, true);
      window.addEventListener("pointerdown", onNativeWakeTap, true);
      window.addEventListener("keydown", onKeyDownEscape, true);
      window.addEventListener("message", onBridgeMessage);
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
      window.removeEventListener("message", onBridgeMessage);
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
          syncCcUi();
        });
        classObserver.observe(clsNode, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }
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
    }

    function bindContainerShield(container) {
      if (containerShieldEl === container) return;
      unbindContainerShield();
      if (!container || typeof container.addEventListener !== "function") return;
      containerShieldEl = container;
      container.addEventListener("contextmenu", onShieldContextMenu, true);
      container.addEventListener("click", onShieldNativeClick, true);
      container.addEventListener("dblclick", onShieldNativeClick, true);
    }

    function unbindContainerShield() {
      if (containerShieldEl) {
        containerShieldEl.removeEventListener("contextmenu", onShieldContextMenu, true);
        containerShieldEl.removeEventListener("click", onShieldNativeClick, true);
        containerShieldEl.removeEventListener("dblclick", onShieldNativeClick, true);
        containerShieldEl = null;
      }
    }

    function onVideoPlayOrPause() {
      if (!enabled) return;
      const paused = Boolean(currentVideo?.paused);
      if (lastVideoPaused !== paused) {
        lastVideoPaused = paused;
        if (hudVisible) {
          scheduleHudHide(HUD_BAR_HIDE_MS);
        }
      }
      syncPassthroughState();
      syncPlaybackUi();
    }

    function onVideoEnded() {
      if (!enabled) return;
      syncPassthroughState();
      syncPlaybackUi();
    }

    function onVideoTimeOrMeta() {
      if (!enabled) return;
      syncPlaybackUi();
    }

    function onVideoVolumeChange() {
      if (!enabled) return;
      syncVolumeUi();
    }

    function onVideoRateChange() {
      if (!enabled || gestureMode === "boost") return;
      syncRateUi();
    }

    function bindVideoEvents(video) {
      if (currentVideo === video) return;
      unbindVideoEvents();
      if (!video || typeof video.addEventListener !== "function") return;
      currentVideo = video;
      lastVideoPaused = Boolean(video.paused);
      video.addEventListener("play", onVideoPlayOrPause);
      video.addEventListener("pause", onVideoPlayOrPause);
      video.addEventListener("ended", onVideoEnded);
      video.addEventListener("timeupdate", onVideoTimeOrMeta);
      video.addEventListener("loadedmetadata", onVideoTimeOrMeta);
      video.addEventListener("durationchange", onVideoTimeOrMeta);
      video.addEventListener("seeked", onVideoTimeOrMeta);
      video.addEventListener("volumechange", onVideoVolumeChange);
      video.addEventListener("ratechange", onVideoRateChange);
    }

    function unbindVideoEvents() {
      if (!currentVideo) return;
      ["play", "pause"].forEach((ev) => currentVideo.removeEventListener(ev, onVideoPlayOrPause));
      currentVideo.removeEventListener("ended", onVideoEnded);
      ["timeupdate", "loadedmetadata", "durationchange", "seeked"].forEach((ev) =>
        currentVideo.removeEventListener(ev, onVideoTimeOrMeta)
      );
      currentVideo.removeEventListener("volumechange", onVideoVolumeChange);
      currentVideo.removeEventListener("ratechange", onVideoRateChange);
      currentVideo = null;
      lastVideoPaused = null;
    }

    function getDisplayRate() {
      if (gestureMode === "boost") return 2.0;
      const engRate = engine?.getBaseRate?.();
      if (typeof engRate === "number" && Number.isFinite(engRate)) return engRate;
      const vidRate = currentVideo?.playbackRate;
      if (typeof vidRate === "number" && Number.isFinite(vidRate)) return vidRate;
      return baseRate || 1;
    }

    function getCcState() {
      const btn = findNativeCcButton();
      if (!btn) return { available: false, on: false, btn: null };
      const ariaPressed = btn.getAttribute?.("aria-pressed");
      const label = `${btn.getAttribute?.("aria-label") || ""} ${btn.getAttribute?.("title") || ""}`;
      const disabled =
        Boolean(btn.disabled) ||
        btn.getAttribute?.("aria-disabled") === "true" ||
        btn.style?.display === "none" ||
        (ariaPressed === "" && /不可用|无法显示|unavailable/i.test(label));
      return {
        available: !disabled,
        on: ariaPressed === "true",
        btn,
      };
    }

    function syncCcUi() {
      const state = getCcState();
      [els.ccBtn, els.winCcBtn].forEach((btn) => {
        if (!btn) return;
        btn.classList.toggle("is-hidden", !state.available);
        btn.classList.toggle("is-on", state.on);
        btn.setAttribute("aria-pressed", String(state.on));
        btn.setAttribute("aria-label", state.on ? "字幕已开" : "字幕已关");
      });
    }

    function toggleCc() {
      const state = getCcState();
      if (!state.available || !state.btn) return;
      runNativeClick(state.btn);
      const after = getCcState();
      syncCcUi();
      showMiniToast(after.on ? "字幕已开" : "字幕已关", MINI_TOAST_MS);
    }

    function syncQualityButtons() {
      const st = cachedQualityState;
      const avail = Boolean(st?.available && Array.isArray(st.items) && st.items.length > 0);
      const label = formatQualityShortLabel(st?.currentLabel || st?.currentQuality);
      [els.qualityBtn, els.winQualityBtn].forEach((btn) => {
        if (!btn) return;
        btn.classList.toggle("is-hidden", !avail);
        btn.textContent = label || "画质";
      });
    }

    async function refreshQualityState() {
      const res = await requestBridge("get_quality");
      if (!enabled) return;
      if (res && typeof res === "object") {
        cachedQualityState = res;
        syncQualityButtons();
        if (qualityDrawerOpen) {
          renderQualityDrawerContent();
        }
      }
    }

    function buildStoryboardSheetUrl(sb, sheetIdx) {
      if (!sb?.baseUrl) return "";
      const name = String(sb.nameTemplate || "M$M").replace("$M", String(sheetIdx));
      let url = String(sb.baseUrl)
        .replace("$L", String(sb.level))
        .replace("$N", name);
      if (sb.sigh && !url.includes("sigh=")) {
        url += `${url.includes("?") ? "&" : "?"}sigh=${encodeURIComponent(sb.sigh)}`;
      }
      return url;
    }

    function preloadStoryboardSheet(url) {
      if (!url || preloadedSheets.has(url)) return;
      preloadedSheets.add(url);
      if (typeof Image === "function") {
        try {
          const img = new Image();
          img.src = url;
        } catch {}
      }
    }

    async function refreshStoryboardState() {
      const res = await requestBridge("get_storyboard");
      if (!enabled) return;
      if (res && typeof res === "object") {
        cachedStoryboard = res;
      }
    }

    function positionQualityPopover() {
      if (!els.qualityDrawer) return;
      const btn = isFullscreenNow() ? els.qualityBtn : els.winQualityBtn;
      const rootRect = els.root?.getBoundingClientRect?.();
      const btnRect = btn?.getBoundingClientRect?.();
      const scale = Number(host?.style?.getPropertyValue?.("--ytb-s")) || 1;
      if (rootRect && rootRect.width > 0 && btnRect && btnRect.width > 0) {
        const centerX = btnRect.left - rootRect.left + btnRect.width / 2;
        const halfW = 58 * scale;
        const clampedX = Math.max(halfW + 8, Math.min(rootRect.width - halfW - 8, centerX));
        els.qualityDrawer.style.left = `${clampedX}px`;
      } else {
        els.qualityDrawer.style.left = "";
      }
    }

    function renderQualityDrawerContent() {
      if (!els.qualityDrawer) return;
      const items = Array.isArray(cachedQualityState?.items) ? cachedQualityState.items : [];
      const curQ = String(cachedQualityState?.currentQuality || "auto");
      els.qualityDrawer.textContent = "";
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "ytb-quality-opt is-empty";
        empty.textContent = "加载画质中…";
        els.qualityDrawer.appendChild(empty);
        return;
      }
      items.forEach((item) => {
        const isActive = item.quality === curQ;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `ytb-quality-opt${isActive ? " is-active" : ""}`;
        btn.textContent = item.label || formatQualityShortLabel(item.quality);
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          setQualityDrawerOpen(false);
          scheduleHudHide(HUD_BAR_HIDE_MS);
          const shortTxt = formatQualityShortLabel(item.label || item.quality);
          showMiniToast(`画质 ${shortTxt}`, MINI_TOAST_MS);
          const nextState = await requestBridge("set_quality", { quality: item.quality });
          if (enabled && nextState) {
            cachedQualityState = nextState;
            syncQualityButtons();
          } else if (enabled) {
            cachedQualityState = {
              ...cachedQualityState,
              currentQuality: item.quality,
              currentLabel: item.label || shortTxt,
            };
            syncQualityButtons();
          }
          clearTimeout(qualitySyncTimer);
          qualitySyncTimer = setTimeout(() => {
            qualitySyncTimer = null;
            if (enabled) refreshQualityState();
          }, 220);
        });
        els.qualityDrawer.appendChild(btn);
      });
    }

    function setQualityDrawerOpen(open) {
      qualityDrawerOpen = Boolean(open);
      if (qualityDrawerOpen) {
        speedDrawerOpen = false;
        els.speedDrawer?.classList.remove("is-open");
        renderQualityDrawerContent();
        positionQualityPopover();
        refreshQualityState();
      }
      els.qualityDrawer?.classList.toggle("is-open", qualityDrawerOpen);
      if (qualityDrawerOpen) {
        clearTimeout(hudTimer);
        hudTimer = null;
      } else if (hudVisible) {
        scheduleHudHide(HUD_BAR_HIDE_MS);
      }
    }

    function toggleFullscreen() {
      if (isFullscreenNow()) {
        webMaximized = false;
        syncHtmlClass();
        if (isSystemFullscreenNow()) {
          try {
            (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
          } catch {}
        }
        try {
          screen?.orientation?.unlock?.();
        } catch {}
        onFullscreenChange();
        try {
          window.dispatchEvent?.(new Event("resize"));
        } catch {}
        return;
      }
      webMaximized = true;
      syncHtmlClass();
      onFullscreenChange();
      try {
        const rootEl = document.documentElement;
        (rootEl?.requestFullscreen || rootEl?.webkitRequestFullscreen)?.call(rootEl)?.catch?.(() => {});
      } catch {}
      try {
        screen?.orientation?.lock?.("landscape")?.catch?.(() => {});
      } catch {}
      try {
        window.dispatchEvent?.(new Event("resize"));
      } catch {}
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

    function syncTopBar() {
      const inFull = isFullscreenNow() && !nativeBarMode;
      els.root?.classList.toggle("is-fullscreen", inFull);
      if (els.fullBtn) {
        els.fullBtn.innerHTML = FULL_EXIT_SVG;
        els.fullBtn.setAttribute("aria-label", "退出全屏");
      }
      if (els.winFullBtn) {
        els.winFullBtn.innerHTML = FULL_ENTER_SVG;
        els.winFullBtn.setAttribute("aria-label", "全屏");
      }
      if (els.title) {
        els.title.textContent = adapter?.getVideoTitle?.() || "正在播放";
      }
      if (els.syncBadge) {
        if (engine?.isSoloMode?.()) {
          els.syncBadge.textContent = "独自看片";
        } else if (engine?.isSynced?.()) {
          els.syncBadge.textContent = `已同步 · ${Math.max(1, activeCount)}人`;
        } else {
          els.syncBadge.textContent = "等待同步";
        }
      }
    }

    function syncPlaybackUi() {
      const video = currentVideo || adapter?.getVideoElement?.();
      if (!video) return;
      const paused = Boolean(video.paused);
      const svg = paused ? PLAY_SVG : PAUSE_SVG;
      const stateStr = paused ? "paused" : "playing";
      const labelStr = paused ? "播放" : "暂停";
      [els.playBtn, els.winPlayBtn].forEach((btn) => {
        if (!btn) return;
        btn.innerHTML = svg;
        if (btn.dataset) btn.dataset.state = stateStr;
        btn.setAttribute("aria-label", labelStr);
      });

      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const cur = draggingSeek
        ? seekPreviewTime
        : Number.isFinite(video.currentTime)
          ? video.currentTime
          : 0;
      const pct = dur > 0 ? Math.max(0, Math.min(100, (cur / dur) * 100)) : 0;
      const timeStr = `${formatTime(cur)}/${formatTime(dur)}`;

      [els.timeText, els.winTime].forEach((el) => {
        if (el) el.textContent = timeStr;
      });
      [els.progressFill, els.winProgressFill, els.miniProgressFill].forEach((el) => {
        if (el) el.style.width = `${pct}%`;
      });
      [els.progressThumb, els.winProgressThumb].forEach((el) => {
        if (el) el.style.left = `${pct}%`;
      });
    }

    function syncPassthroughState() {
      const video = currentVideo || adapter?.getVideoElement?.();
      const player = findMoviePlayer(video) || currentContainer;
      const nextAd = Boolean(
        enabled &&
          !nativeBarMode &&
          (adapter?.isAdPlaying?.() ||
            player?.classList?.contains?.("ad-showing") ||
            player?.classList?.contains?.("ad-interrupting"))
      );
      const nextEnding = Boolean(
        enabled &&
          !nativeBarMode &&
          !nextAd &&
          (video?.ended || player?.classList?.contains?.("ended-mode"))
      );
      const changed = nextAd !== adPassthrough || nextEnding !== endingPassthrough;
      adPassthrough = nextAd;
      endingPassthrough = nextEnding;
      const anyPass = adPassthrough || endingPassthrough;
      els.root?.classList.toggle("is-ending-passthrough", anyPass);
      if (changed) {
        syncHtmlClass();
        if (anyPass) {
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
          enabled &&
            !nativeBarMode &&
            !adPassthrough &&
            !endingPassthrough &&
            !userMuted &&
            video &&
            muted
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
      if (video.paused) {
        video.play?.()?.catch?.(() => {});
        flashCenterPlayState(false);
        scheduleHudHide(HUD_QUICK_HIDE_MS);
      } else {
        video.pause?.();
        flashCenterPlayState(true);
        if (!hudVisible) wakeHud(HUD_BAR_HIDE_MS);
        else scheduleHudHide(HUD_BAR_HIDE_MS);
      }
      syncPlaybackUi();
    }

    function flashCenterPlayState(nowPaused) {
      if (!els.playFlash) return;
      clearTimeout(playFlashTimer);
      els.playFlash.innerHTML = nowPaused ? PAUSE_SVG : PLAY_SVG;
      els.playFlash.classList.remove("is-visible");
      if (typeof els.playFlash.offsetWidth === "number") void els.playFlash.offsetWidth;
      els.playFlash.classList.add("is-visible");
      playFlashTimer = setTimeout(() => {
        playFlashTimer = null;
        els.playFlash?.classList.remove("is-visible");
      }, PLAY_FLASH_MS);
    }

    function renderScrubPreview({ previewSec, durSec, deltaSec, mode }) {
      if (!els.scrubPreview) return;
      const isTrack = mode === "track";
      els.scrubPreview.classList.toggle("is-track-mode", isTrack);
      els.scrubPreview.classList.toggle("is-swipe-mode", !isTrack);
      els.scrubPreview.style.left = "";

      const curStr = formatTime(previewSec);
      const sb = cachedStoryboard;
      const hasSb = Boolean(
        sb?.available && sb.cols > 0 && sb.rows > 0 && sb.totalCount > 0 && sb.baseUrl
      );
      if (hasSb && els.scrubThumbImg) {
        const cols = Number(sb.cols);
        const rows = Number(sb.rows);
        const total = Number(sb.totalCount);
        const perSheet = cols * rows;
        let idx = 0;
        if (sb.intervalMs > 0) {
          idx = Math.floor((Math.max(0, Number(previewSec) || 0) * 1000) / sb.intervalMs);
        } else if (durSec > 0) {
          idx = Math.floor((Math.max(0, Math.min(durSec, Number(previewSec) || 0)) / durSec) * total);
        }
        idx = Math.max(0, Math.min(total - 1, idx));
        const sheetIdx = Math.floor(idx / perSheet);
        const inSheet = idx % perSheet;
        const row = Math.floor(inSheet / cols);
        const col = inSheet % cols;
        const sheetUrl = buildStoryboardSheetUrl(sb, sheetIdx);
        if (sheetUrl) {
          const xPct = cols > 1 ? (col / (cols - 1)) * 100 : 0;
          const yPct = rows > 1 ? (row / (rows - 1)) * 100 : 0;
          els.scrubThumbImg.style.backgroundImage = `url("${sheetUrl}")`;
          els.scrubThumbImg.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
          els.scrubThumbImg.style.backgroundPosition = `${xPct.toFixed(4)}% ${yPct.toFixed(4)}%`;
          if (els.scrubThumb?.style && sb.width > 0 && sb.height > 0) {
            const baseW = isFullscreenNow() ? 160 : 128;
            const thumbH = Math.max(48, Math.round((baseW * sb.height) / sb.width));
            els.scrubThumb.style.height = `calc(${thumbH}px * var(--ytb-s, 1))`;
          }
          if (els.scrubThumbTime) els.scrubThumbTime.textContent = curStr;
          els.scrubPreview.classList.add("has-thumb");
          preloadStoryboardSheet(sheetUrl);
          const totalSheets = Math.ceil(total / perSheet);
          if (sheetIdx + 1 < totalSheets) {
            preloadStoryboardSheet(buildStoryboardSheetUrl(sb, sheetIdx + 1));
          }
        } else {
          els.scrubPreview.classList.remove("has-thumb");
        }
      } else {
        els.scrubPreview.classList.remove("has-thumb");
      }

      if (els.scrubTime) {
        els.scrubTime.textContent = `${curStr} / ${formatTime(durSec)}`;
      }
      if (els.scrubDelta) {
        const rounded = Math.round(deltaSec || 0);
        if (rounded === 0) {
          els.scrubDelta.textContent = "";
        } else {
          const sign = rounded > 0 ? "+" : "-";
          const abs = Math.abs(rounded);
          const dStr = abs >= 60 ? formatTime(abs) : `${abs}秒`;
          els.scrubDelta.textContent = `${sign}${dStr}`;
        }
      }
      els.scrubPreview.classList.add("is-visible");
    }

    function hideScrubPreview(delayMs = 0) {
      clearTimeout(scrubPreviewTimer);
      const resetAndHide = () => {
        scrubPreviewTimer = null;
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
      hideScrubPreview(0);
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
      if (!enabled || nativeBarMode || !isFullscreenNow()) return;
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

    function setScreenLocked(nextLocked, { silent = false } = {}) {
      const target = Boolean(nextLocked) && enabled && !nativeBarMode && isFullscreenNow();
      if (screenLocked === target) {
        if (target) wakeLockBtn(LOCK_AWAKE_MS);
        return;
      }
      screenLocked = target;
      if (screenLocked) {
        clearTimeout(singleTapTimer);
        singleTapTimer = null;
        lastTapAt = 0;
        speedDrawerOpen = false;
        qualityDrawerOpen = false;
        els.speedDrawer?.classList.remove("is-open");
        els.qualityDrawer?.classList.remove("is-open");
        els.root?.classList.remove("is-hud-open");
        hudVisible = false;
        clearTimeout(hudTimer);
        hudTimer = null;
        els.root?.classList.add("is-locked");
        if (els.lockBtn) {
          els.lockBtn.innerHTML = LOCK_CLOSED_SVG;
          els.lockBtn.setAttribute("aria-label", "解锁");
        }
        wakeLockBtn(LOCK_AWAKE_MS);
        if (!silent) showMiniToast("已锁屏，点击锁图标解锁", 1400);
      } else {
        hideLockBtn();
        els.root?.classList.remove("is-locked", "is-lock-awake");
        if (els.lockBtn) {
          els.lockBtn.innerHTML = LOCK_OPEN_SVG;
          els.lockBtn.setAttribute("aria-label", "锁屏");
        }
        if (!silent && enabled && !nativeBarMode) {
          wakeHud(HUD_BAR_HIDE_MS);
          showMiniToast("已解除锁屏", 1100);
        }
      }
    }

    function refreshVideoContext({ skipAlive = false } = {}) {
      if (!enabled) return;
      if (!skipAlive) ensureAlive();
      const vid = adapter?.getVideoId?.() || "";
      if (vid !== lastVideoIdSeen) {
        lastVideoIdSeen = vid;
        cachedStoryboard = { available: false, videoId: vid };
        preloadedSheets.clear();
        clearLockedBoostSpeed({ restore: false });
      }
      syncPassthroughState();
      syncCcUi();
      syncTopBar();
      refreshQualityState();
      refreshStoryboardState();
    }

    function positionSpeedPopover() {
      if (!els.speedDrawer) return;
      const btn = isFullscreenNow() ? els.speedBtn : els.winSpeedBtn;
      const rootRect = els.root?.getBoundingClientRect?.();
      const btnRect = btn?.getBoundingClientRect?.();
      const scale = Number(host?.style?.getPropertyValue?.("--ytb-s")) || 1;
      if (rootRect && rootRect.width > 0 && btnRect && btnRect.width > 0) {
        const centerX = btnRect.left - rootRect.left + btnRect.width / 2;
        const halfW = 38 * scale;
        const clampedX = Math.max(halfW + 8, Math.min(rootRect.width - halfW - 8, centerX));
        els.speedDrawer.style.left = `${clampedX}px`;
      } else {
        els.speedDrawer.style.left = "";
      }
    }

    function setSpeedDrawerOpen(open) {
      speedDrawerOpen = Boolean(open);
      if (speedDrawerOpen) {
        qualityDrawerOpen = false;
        els.qualityDrawer?.classList.remove("is-open");
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

    function hideHud() {
      clearTimeout(hudTimer);
      hudTimer = null;
      hudVisible = false;
      setSpeedDrawerOpen(false);
      setQualityDrawerOpen(false);
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
        draggingSeek ||
        gestureMode === "seek" ||
        gestureMode === "volume"
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
      if (!enabled || nativeBarMode || adPassthrough || endingPassthrough) return;
      if (screenLocked) {
        wakeLockBtn(LOCK_AWAKE_MS);
        return;
      }
      hudVisible = true;
      els.root?.classList.add("is-hud-open");
      syncPlaybackUi();
      syncVolumeUi();
      syncCcUi();
      syncQualityButtons();
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
        adPassthrough = false;
        endingPassthrough = false;
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
          clearLockedBoostSpeed({ restore: false });
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

    function bindShadowControls() {
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

      els.boostChip?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!enabled || !speedLockedByBoost) return;
        if (screenLocked) {
          wakeLockBtn(LOCK_AWAKE_MS);
          pulseLockBtn();
          showMiniToast("已锁屏，点击锁图标解锁", 1100);
          return;
        }
        clearLockedBoostSpeed({ restore: true });
      });

      [els.ccBtn, els.winCcBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleCc();
          wakeHud(HUD_BAR_HIDE_MS);
        });
      });

      [els.nativeBtn, els.winNativeBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          setNativeBarMode(true);
        });
      });

      els.lockBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        setScreenLocked(!screenLocked);
      });

      [els.qualityBtn, els.winQualityBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (screenLocked) {
            wakeLockBtn(LOCK_AWAKE_MS);
            return;
          }
          if (!hudVisible) wakeHud(HUD_BAR_HIDE_MS);
          setQualityDrawerOpen(!qualityDrawerOpen);
        });
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
          toggleFullscreen();
          if (hudVisible) scheduleHudHide(HUD_BAR_HIDE_MS);
          else wakeHud(HUD_BAR_HIDE_MS);
        });
      });

      els.returnPill?.addEventListener("click", (e) => {
        e.stopPropagation();
        setNativeBarMode(false);
      });

      const updateSeekFromClientX = (clientX) => {
        const wrapEl = activeScrubWrap;
        const video = currentVideo || adapter?.getVideoElement?.();
        if (!wrapEl || !video) return;
        const rect = wrapEl.getBoundingClientRect?.() || { left: 0, width: 320 };
        const width = Math.max(1, rect.width || 320);
        const ratio = Math.max(0, Math.min(1, ((clientX || 0) - (rect.left || 0)) / width));
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        seekPreviewTime = dur * ratio;
        [els.progressFill, els.winProgressFill, els.miniProgressFill].forEach((el) => {
          if (el) el.style.width = `${ratio * 100}%`;
        });
        [els.progressThumb, els.winProgressThumb].forEach((el) => {
          if (el) el.style.left = `${ratio * 100}%`;
        });
        const labelStr = `${formatTime(seekPreviewTime)}/${formatTime(dur)}`;
        if (els.timeText) els.timeText.textContent = labelStr;
        if (els.winTime) els.winTime.textContent = labelStr;
        renderScrubPreview({
          previewSec: seekPreviewTime,
          durSec: dur,
          deltaSec: seekPreviewTime - activeScrubStartSec,
          mode: "track",
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
        const video = currentVideo || adapter?.getVideoElement?.();
        if (video && Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = seekPreviewTime;
        }
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

      unbindScrubWindowEvents = () => {
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
          if (speedDrawerOpen) setSpeedDrawerOpen(false);
          if (qualityDrawerOpen) setQualityDrawerOpen(false);
          draggingSeek = true;
          activeScrubPointerId = e.pointerId ?? 0;
          activeScrubWrap = wrapEl;
          const video = currentVideo || adapter?.getVideoElement?.();
          activeScrubStartSec = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
          wrapEl.classList.add("is-dragging");
          clearTimeout(hudTimer);
          hudTimer = null;
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

      const shield = els.shield;
      if (shield && typeof shield.addEventListener === "function") {
        shield.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        const handleSingleTap = () => {
          singleTapTimer = null;
          if (!enabled || nativeBarMode || adPassthrough || endingPassthrough) return;
          if (screenLocked) {
            if (lockAwake) hideLockBtn();
            else wakeLockBtn(LOCK_AWAKE_MS);
            return;
          }
          if (speedDrawerOpen || qualityDrawerOpen) {
            setSpeedDrawerOpen(false);
            setQualityDrawerOpen(false);
            scheduleHudHide(HUD_BAR_HIDE_MS);
          } else if (hudVisible) {
            hideHud();
          } else {
            wakeHud(HUD_BAR_HIDE_MS);
          }
        };

        shield.addEventListener("pointerdown", (e) => {
          if (!enabled || nativeBarMode || adPassthrough || endingPassthrough) return;
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
          const video = currentVideo || adapter?.getVideoElement?.();
          gestureStartTimeSec = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
          gestureStartVol = Number.isFinite(video?.volume) ? video.volume : 1;
          gesturePendingSeekSec = gestureStartTimeSec;

          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            if (!enabled || nativeBarMode || adPassthrough || endingPassthrough || gestureMode !== "pending") return;
            clearTimeout(singleTapTimer);
            singleTapTimer = null;
            lastTapAt = 0;
            if (screenLocked) {
              gestureMode = "locked_block";
              wakeLockBtn(LOCK_AWAKE_MS);
              pulseLockBtn();
              showMiniToast("已锁屏，点击锁图标解锁", 1100);
              return;
            }
            preBoostRate = getDisplayRate();
            gestureMode = "boost";
            boostLockArmed = false;
            shield.setPointerCapture?.(activePointerId);
            bindBoostGlobalRelease();
            engine?.setPlaybackRate?.(2.0, { showToast: false });
            syncRateUi();
            if (els.boostText) els.boostText.textContent = "2.0x 倍速播放中";
            if (els.boostHint) els.boostHint.textContent = "上滑锁定";
            els.boostChip?.classList.remove("is-lock-armed");
            els.boostChip?.classList.add("is-visible");
          }, LONG_PRESS_MS);
        });

        shield.addEventListener("pointermove", (e) => {
          if (
            !enabled ||
            nativeBarMode ||
            adPassthrough ||
            endingPassthrough ||
            gestureMode === "idle" ||
            gestureMode === "scroll_yield" ||
            gestureMode === "locked_block"
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
            if (screenLocked) {
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
              clearTimeout(hudTimer);
              hudTimer = null;
              try {
                shield.setPointerCapture?.(e.pointerId);
              } catch {}
            } else {
              const rect = shield.getBoundingClientRect?.() || { left: 0, width: 360, height: 240 };
              const relX = e.clientX - (rect.left || 0);
              if (relX >= (rect.width || 360) * 0.5) {
                gestureMode = "volume";
                clearTimeout(hudTimer);
                hudTimer = null;
                try {
                  shield.setPointerCapture?.(e.pointerId);
                } catch {}
              } else {
                gestureMode = "scroll_yield";
                return;
              }
            }
          }

          const video = currentVideo || adapter?.getVideoElement?.();
          if (!video) return;

          if (gestureMode === "seek") {
            const rect = shield.getBoundingClientRect?.() || { left: 0, width: 360, height: 240 };
            const width = Math.max(180, rect.width || 360);
            const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
            const spanSec = dur > 0 ? Math.min(Math.max(45, dur * 0.25), 90) : 60;
            const deltaSec = (dx / width) * spanSec;
            const clampedTarget =
              dur > 0
                ? Math.max(0, Math.min(dur - 0.1, gestureStartTimeSec + deltaSec))
                : Math.max(0, gestureStartTimeSec + deltaSec);
            gesturePendingSeekSec = clampedTarget;
            renderScrubPreview({
              previewSec: gesturePendingSeekSec,
              durSec: dur,
              deltaSec: gesturePendingSeekSec - gestureStartTimeSec,
              mode: "swipe",
            });
          } else if (gestureMode === "volume") {
            const rect = shield.getBoundingClientRect?.() || { left: 0, width: 360, height: 240 };
            const height = Math.max(120, (rect.height || 240) * 0.65);
            const nextVol = Math.max(0, Math.min(1, gestureStartVol - dy / height));
            if (nextVol <= 0.005) {
              video.volume = 0;
              video.muted = true;
              userMuted = true;
            } else {
              video.volume = nextVol;
              userMuted = false;
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
            const video = currentVideo || adapter?.getVideoElement?.();
            if (video && Number.isFinite(gesturePendingSeekSec)) {
              video.currentTime = gesturePendingSeekSec;
              syncPlaybackUi();
            }
            hideScrubPreview(SCRUB_HUD_HIDE_MS);
            if (hudVisible) scheduleHudHide(HUD_BAR_HIDE_MS);
          } else if (finishedMode === "volume") {
            hideGestureHud(VOL_HUD_HIDE_MS);
          } else if (
            finishedMode === "pending" &&
            gestureMaxDist <= TAP_MOVE_LIMIT_PX &&
            heldMs < LONG_PRESS_MS
          ) {
            const now = Date.now();
            const isDoubleTap =
              lastTapAt > 0 &&
              now - lastTapAt <= DOUBLE_TAP_MS &&
              Math.hypot((e.clientX || 0) - lastTapX, (e.clientY || 0) - lastTapY) <= DOUBLE_TAP_DIST_PX;
            if (isDoubleTap) {
              clearTimeout(singleTapTimer);
              singleTapTimer = null;
              lastTapAt = 0;
              if (screenLocked) {
                wakeLockBtn(LOCK_AWAKE_MS);
                pulseLockBtn();
                showMiniToast("已锁屏，点击锁图标解锁", 1100);
              } else {
                if (speedDrawerOpen) setSpeedDrawerOpen(false);
                if (qualityDrawerOpen) setQualityDrawerOpen(false);
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
    }

    function createUiDom() {
      if (host) return;
      host = document.createElement("div");
      host.id = HOST_ID;
      host.style.cssText =
        "position:absolute;inset:0;z-index:2147483050;pointer-events:none;overflow:hidden;";
      shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <style>
          :host {
            all: initial;
            position: absolute;
            inset: 0;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          }
          * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }
          .ytb-root {
            position: relative;
            width: 100%;
            height: 100%;
            user-select: none;
            -webkit-user-select: none;
            pointer-events: none;
            overflow: hidden;
          }
          .ytb-shield {
            position: absolute;
            inset: 0;
            pointer-events: auto;
            touch-action: pan-y;
            z-index: 1;
          }
          .ytb-root.is-locked .ytb-shield {
            touch-action: none;
          }
          .ytb-vol-zone {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 50%;
            pointer-events: none;
            touch-action: none;
          }
          .ytb-root.is-native-mode .ytb-shield,
          .ytb-root.is-native-mode .ytb-bottom-bar,
          .ytb-root.is-native-mode .ytb-top-bar,
          .ytb-root.is-native-mode .ytb-win-top,
          .ytb-root.is-native-mode .ytb-unmute-pill,
          .ytb-root.is-native-mode .ytb-boost-chip,
          .ytb-root.is-native-mode .ytb-speed-drawer,
          .ytb-root.is-native-mode .ytb-quality-drawer,
          .ytb-root.is-native-mode .ytb-lock-btn,
          .ytb-root.is-ending-passthrough .ytb-shield,
          .ytb-root.is-ending-passthrough .ytb-bottom-bar,
          .ytb-root.is-ending-passthrough .ytb-top-bar,
          .ytb-root.is-ending-passthrough .ytb-win-top,
          .ytb-root.is-ending-passthrough .ytb-lock-btn,
          .ytb-root.is-locked .ytb-top-bar,
          .ytb-root.is-locked .ytb-win-top,
          .ytb-root.is-locked .ytb-bottom-bar,
          .ytb-root.is-locked .ytb-speed-drawer,
          .ytb-root.is-locked .ytb-quality-drawer {
            display: none !important;
            pointer-events: none !important;
          }
          .ytb-icon-btn.is-hidden,
          .ytb-ghost-btn.is-hidden {
            display: none !important;
          }

          /* Screen Lock Floating Button (Fullscreen Right Center) */
          .ytb-lock-btn {
            position: absolute;
            right: calc(16px * var(--ytb-s, 1));
            top: 50%;
            transform: translateY(-50%);
            width: calc(40px * var(--ytb-s, 1));
            height: calc(40px * var(--ytb-s, 1));
            border-radius: 9999px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(18, 18, 22, 0.68);
            backdrop-filter: blur(8px);
            color: #ffffff;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 8;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.12s ease;
          }
          .ytb-lock-btn svg {
            width: calc(19px * var(--ytb-s, 1));
            height: calc(19px * var(--ytb-s, 1));
          }
          .ytb-root.is-fullscreen:not(.is-native-mode):not(.is-ending-passthrough) .ytb-lock-btn {
            display: flex;
          }
          .ytb-root.is-fullscreen.is-hud-open:not(.is-native-mode) .ytb-lock-btn,
          .ytb-root.is-fullscreen.is-lock-awake:not(.is-native-mode) .ytb-lock-btn {
            opacity: 1;
            pointer-events: auto;
          }
          .ytb-root.is-locked .ytb-lock-btn {
            border-color: rgba(255, 0, 51, 0.72);
            color: #ff3b5c;
          }
          .ytb-lock-btn.is-pulse {
            animation: ytbLockPulse 0.34s ease;
          }
          @keyframes ytbLockPulse {
            0%, 100% { transform: translateY(-50%) scale(1); }
            45% { transform: translateY(-50%) scale(1.16); }
          }

          /* Top-Center 2.0x Boost Chip (with Slide-Up Lock & Clickable Restore) */
          .ytb-boost-chip {
            position: absolute;
            top: calc(12px * var(--ytb-s, 1));
            left: 50%;
            transform: translateX(-50%);
            z-index: 9;
            padding: calc(4px * var(--ytb-s, 1)) calc(12px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(0, 0, 0, 0.68);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #ffffff;
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 600;
            display: none;
            align-items: center;
            gap: calc(6px * var(--ytb-s, 1));
            pointer-events: none;
            white-space: nowrap;
            transition: background 0.15s ease, border-color 0.15s ease;
          }
          .ytb-boost-chip.is-visible {
            display: inline-flex;
          }
          .ytb-boost-chip.is-lock-armed {
            background: rgba(255, 0, 51, 0.9);
            border-color: rgba(255, 255, 255, 0.4);
          }
          .ytb-boost-chip.is-locked-speed {
            pointer-events: auto;
            cursor: pointer;
            background: rgba(20, 20, 26, 0.84);
            border-color: rgba(255, 0, 51, 0.55);
            transition: opacity 0.25s ease, background 0.15s ease, padding 0.2s ease;
          }
          .ytb-boost-chip.is-locked-speed:active {
            background: rgba(255, 0, 51, 0.35);
          }
          .ytb-boost-chip.is-locked-compact {
            opacity: 0.62;
            padding: calc(3px * var(--ytb-s, 1)) calc(9px * var(--ytb-s, 1));
          }
          .ytb-boost-arrows {
            color: #ff3b5c;
            letter-spacing: -1px;
            animation: ytbBoostPulse 0.9s infinite ease-in-out;
          }
          .ytb-boost-chip.is-lock-armed .ytb-boost-arrows {
            color: #ffffff;
          }
          .ytb-boost-hint {
            font-size: calc(10.5px * var(--ytb-s, 1));
            color: rgba(255, 255, 255, 0.68);
            padding-left: calc(2px * var(--ytb-s, 1));
            border-left: 1px solid rgba(255, 255, 255, 0.22);
          }
          .ytb-boost-chip.is-lock-armed .ytb-boost-hint,
          .ytb-boost-chip.is-locked-speed .ytb-boost-hint {
            color: #ffffff;
          }
          @keyframes ytbBoostPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }

          /* Top-Left Auto-Muted Pill */
          .ytb-unmute-pill {
            position: absolute;
            top: calc(10px * var(--ytb-s, 1));
            left: calc(12px * var(--ytb-s, 1));
            z-index: 8;
            height: calc(26px * var(--ytb-s, 1));
            padding: 0 calc(9px * var(--ytb-s, 1));
            border-radius: calc(4px * var(--ytb-s, 1));
            border: none;
            background: rgba(20, 20, 20, 0.78);
            color: rgba(255, 255, 255, 0.94);
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 500;
            display: none;
            align-items: center;
            cursor: pointer;
            pointer-events: auto;
          }
          .ytb-unmute-pill.is-visible {
            display: inline-flex;
          }
          .ytb-root.is-fullscreen.is-hud-open .ytb-unmute-pill {
            top: calc(46px * var(--ytb-s, 1));
          }

          /* Return To Touch Pill (Only In 原栏 Mode, Top-Right Aligned With 原栏 Button) */
          .ytb-return-pill {
            position: absolute;
            top: calc(10px * var(--ytb-s, 1));
            right: calc(10px * var(--ytb-s, 1));
            z-index: 20;
            height: calc(28px * var(--ytb-s, 1));
            padding: 0 calc(10px * var(--ytb-s, 1));
            border-radius: 9999px;
            border: 1px solid rgba(255, 0, 51, 0.72);
            background: rgba(16, 16, 20, 0.84);
            backdrop-filter: blur(8px);
            color: #ffffff;
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 600;
            display: none;
            align-items: center;
            gap: calc(4px * var(--ytb-s, 1));
            cursor: pointer;
            pointer-events: auto;
            opacity: 0.55;
            transition: opacity 0.2s ease;
          }
          .ytb-root.is-native-mode .ytb-return-pill {
            display: inline-flex;
          }
          .ytb-root.is-native-mode .ytb-return-pill.is-awake {
            opacity: 0.96;
            pointer-events: auto;
          }

          /* Center Play/Pause Pulse Icon */
          .ytb-play-flash {
            position: absolute;
            top: 50%;
            left: 50%;
            width: calc(48px * var(--ytb-s, 1));
            height: calc(48px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(0, 0, 0, 0.56);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
            pointer-events: none;
            z-index: 6;
          }
          .ytb-play-flash svg {
            width: calc(22px * var(--ytb-s, 1));
            height: calc(22px * var(--ytb-s, 1));
          }
          .ytb-play-flash.is-visible {
            animation: ytbPlayFlash 0.32s ease-out forwards;
          }
          @keyframes ytbPlayFlash {
            0% { opacity: 0.95; transform: translate(-50%, -50%) scale(0.84); }
            65% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.06); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1.18); }
          }

          /* Center Volume Gesture HUD */
          .ytb-gesture-hud {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            min-width: calc(120px * var(--ytb-s, 1));
            padding: calc(10px * var(--ytb-s, 1)) calc(14px * var(--ytb-s, 1));
            border-radius: calc(10px * var(--ytb-s, 1));
            background: rgba(18, 18, 22, 0.84);
            backdrop-filter: blur(8px);
            color: #ffffff;
            text-align: center;
            z-index: 8;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.14s ease;
          }
          .ytb-gesture-hud.is-visible {
            opacity: 1;
          }
          .ytb-hud-main {
            font-size: calc(15px * var(--ytb-s, 1));
            font-weight: 700;
            line-height: 1.25;
            font-variant-numeric: tabular-nums;
          }
          .ytb-hud-sub {
            margin-top: calc(3px * var(--ytb-s, 1));
            font-size: calc(11.5px * var(--ytb-s, 1));
            color: #ff3b5c;
            font-weight: 600;
          }
          .ytb-hud-vol-row {
            margin-top: calc(7px * var(--ytb-s, 1));
            height: calc(4px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.24);
            overflow: hidden;
            display: none;
          }
          .ytb-hud-vol-fill {
            height: 100%;
            background: #ff0033;
            width: 0%;
          }

          /* Centered Scrub Time & Delta Preview */
          .ytb-scrub-preview {
            position: absolute;
            top: 46%;
            left: 50%;
            z-index: 8;
            transform: translate(-50%, -50%);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.12s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: calc(5px * var(--ytb-s, 1));
          }
          .ytb-scrub-preview.is-visible {
            opacity: 1;
          }
          .ytb-scrub-preview.is-track-mode:not(.ytb-root.is-fullscreen *) {
            top: auto;
            bottom: calc(54px * var(--ytb-s, 1));
            transform: translateX(-50%);
          }
          .ytb-root.is-fullscreen .ytb-scrub-preview.is-track-mode,
          .ytb-scrub-preview.is-swipe-mode {
            top: 46%;
            left: 50% !important;
            bottom: auto;
            transform: translate(-50%, -50%);
          }
          .ytb-scrub-thumb {
            display: none;
            position: relative;
            width: calc(128px * var(--ytb-s, 1));
            height: calc(72px * var(--ytb-s, 1));
            border-radius: calc(4px * var(--ytb-s, 1));
            overflow: hidden;
            background-color: #111111;
            border: 1px solid rgba(255, 255, 255, 0.22);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
          }
          .ytb-scrub-thumb-img {
            width: 100%;
            height: 100%;
            background-repeat: no-repeat;
          }
          .ytb-root.is-fullscreen .ytb-scrub-thumb {
            width: calc(160px * var(--ytb-s, 1));
            height: calc(90px * var(--ytb-s, 1));
          }
          .ytb-scrub-preview.has-thumb .ytb-scrub-thumb {
            display: block;
          }
          .ytb-scrub-thumb-time {
            position: absolute;
            left: 50%;
            bottom: calc(4px * var(--ytb-s, 1));
            transform: translateX(-50%);
            padding: calc(1px * var(--ytb-s, 1)) calc(6px * var(--ytb-s, 1));
            border-radius: calc(3px * var(--ytb-s, 1));
            background: rgba(0, 0, 0, 0.72);
            color: #ffffff;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(11px * var(--ytb-s, 1));
            font-weight: 600;
            white-space: nowrap;
          }
          .ytb-scrub-preview.is-swipe-mode .ytb-scrub-thumb-time {
            display: none;
          }
          .ytb-scrub-meta {
            display: inline-flex;
            align-items: center;
            gap: calc(6px * var(--ytb-s, 1));
            padding: calc(4px * var(--ytb-s, 1)) calc(10px * var(--ytb-s, 1));
            border-radius: calc(6px * var(--ytb-s, 1));
            background: rgba(18, 18, 22, 0.84);
            backdrop-filter: blur(8px);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(13px * var(--ytb-s, 1));
            font-weight: 600;
            color: #ffffff;
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
          }
          .ytb-scrub-delta {
            color: #ff3b5c;
            font-size: calc(11.5px * var(--ytb-s, 1));
          }

          /* Ultra-Thin 2px Resting Bottom Progress Bar */
          .ytb-mini-progress {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 2px;
            background: rgba(255, 255, 255, 0.16);
            pointer-events: none;
            z-index: 4;
            opacity: 1;
            transition: opacity 0.18s ease;
          }
          .ytb-root.is-hud-open .ytb-mini-progress,
          .ytb-root.is-native-mode .ytb-mini-progress,
          .ytb-root.is-ending-passthrough .ytb-mini-progress,
          .ytb-root.is-locked .ytb-mini-progress {
            opacity: 0;
          }
          .ytb-mini-progress-fill {
            height: 100%;
            width: 0%;
            background: #ff0033;
          }

          /* Compact Mini Toast */
          .ytb-mini-toast {
            position: absolute;
            top: calc(14px * var(--ytb-s, 1));
            left: 50%;
            transform: translateX(-50%);
            z-index: 9;
            padding: calc(4px * var(--ytb-s, 1)) calc(10px * var(--ytb-s, 1));
            border-radius: calc(6px * var(--ytb-s, 1));
            background: rgba(16, 16, 20, 0.82);
            color: rgba(255, 255, 255, 0.96);
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 600;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.16s ease;
            white-space: nowrap;
          }
          .ytb-mini-toast.is-visible {
            opacity: 1;
          }

          /* Windowed Top-Right Floating Pill */
          .ytb-win-top {
            position: absolute;
            top: calc(8px * var(--ytb-s, 1));
            right: calc(8px * var(--ytb-s, 1));
            z-index: 6;
            display: flex;
            align-items: center;
            gap: calc(5px * var(--ytb-s, 1));
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease;
          }
          .ytb-root.is-hud-open:not(.is-fullscreen) .ytb-win-top {
            opacity: 1;
            pointer-events: auto;
          }
          .ytb-ghost-btn {
            height: calc(26px * var(--ytb-s, 1));
            padding: 0 calc(8px * var(--ytb-s, 1));
            border-radius: calc(5px * var(--ytb-s, 1));
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(0, 0, 0, 0.42);
            color: rgba(255, 255, 255, 0.94);
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 600;
            cursor: pointer;
          }
          .ytb-ghost-btn:active {
            background: rgba(255, 255, 255, 0.18);
          }

          /* Fullscreen Top Gradient Bar */
          .ytb-top-bar {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            z-index: 6;
            display: none;
            align-items: center;
            justify-content: space-between;
            gap: calc(10px * var(--ytb-s, 1));
            padding: calc(12px * var(--ytb-s, 1)) calc(14px * var(--ytb-s, 1)) calc(24px * var(--ytb-s, 1));
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.66) 0%, rgba(0, 0, 0, 0) 100%);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease;
          }
          .ytb-root.is-fullscreen .ytb-top-bar {
            display: flex;
          }
          .ytb-root.is-fullscreen.is-hud-open .ytb-top-bar {
            opacity: 1;
            pointer-events: auto;
          }
          .ytb-top-left {
            display: flex;
            align-items: center;
            gap: calc(6px * var(--ytb-s, 1));
            min-width: 0;
            flex: 1;
          }
          .ytb-back-btn {
            width: calc(32px * var(--ytb-s, 1));
            height: calc(32px * var(--ytb-s, 1));
            border: none;
            background: transparent;
            color: #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 0;
            flex-shrink: 0;
          }
          .ytb-back-btn svg {
            width: calc(20px * var(--ytb-s, 1));
            height: calc(20px * var(--ytb-s, 1));
          }
          .ytb-title {
            color: #ffffff;
            font-size: calc(13.5px * var(--ytb-s, 1));
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .ytb-top-right {
            display: flex;
            align-items: center;
            gap: calc(8px * var(--ytb-s, 1));
            flex-shrink: 0;
          }
          .ytb-sync-badge {
            padding: calc(2px * var(--ytb-s, 1)) calc(8px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(255, 0, 51, 0.22);
            border: 1px solid rgba(255, 0, 51, 0.45);
            color: #ffd6dc;
            font-size: calc(11px * var(--ytb-s, 1));
            font-weight: 600;
          }

          /* Bottom Control Container */
          .ytb-bottom-bar {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 7;
            padding: calc(18px * var(--ytb-s, 1)) calc(8px * var(--ytb-s, 1)) calc(4px * var(--ytb-s, 1));
            background: linear-gradient(0deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.34) 58%, rgba(0, 0, 0, 0) 100%);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease;
          }
          .ytb-root.is-fullscreen .ytb-bottom-bar {
            padding: calc(24px * var(--ytb-s, 1)) calc(14px * var(--ytb-s, 1)) calc(8px * var(--ytb-s, 1));
          }
          .ytb-root.is-hud-open .ytb-bottom-bar {
            opacity: 1;
            pointer-events: auto;
          }

          .ytb-bar-fs {
            display: none;
            flex-direction: column;
            gap: calc(1px * var(--ytb-s, 1));
          }
          .ytb-bar-win {
            display: flex;
            align-items: center;
            gap: calc(4px * var(--ytb-s, 1));
          }
          .ytb-root.is-fullscreen .ytb-bar-fs {
            display: flex;
          }
          .ytb-root.is-fullscreen .ytb-bar-win {
            display: none;
          }

          .ytb-time {
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 500;
            color: rgba(255, 255, 255, 0.92);
            white-space: nowrap;
            flex-shrink: 0;
          }
          .ytb-fs-time-row {
            padding: 0 calc(4px * var(--ytb-s, 1));
            margin-bottom: calc(-4px * var(--ytb-s, 1));
            line-height: 1.2;
          }

          /* Progress Track with Custom Emoji Thumb */
          .ytb-progress-wrap {
            position: relative;
            height: calc(34px * var(--ytb-s, 1));
            display: flex;
            align-items: center;
            cursor: pointer;
            touch-action: none;
          }
          .ytb-bar-win .ytb-progress-wrap {
            flex: 1 1 auto;
            min-width: calc(72px * var(--ytb-s, 1));
          }
          .ytb-bar-fs .ytb-progress-wrap {
            flex: none;
            width: 100%;
            height: calc(36px * var(--ytb-s, 1));
          }
          .ytb-progress-track {
            position: relative;
            width: 100%;
            height: calc(3px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.32);
            pointer-events: none;
          }
          .ytb-progress-fill {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 0%;
            border-radius: 9999px;
            background: #ff0033;
          }
          .ytb-progress-thumb {
            position: absolute;
            top: 50%;
            left: 0%;
            width: calc(20px * var(--ytb-s, 1));
            height: calc(20px * var(--ytb-s, 1));
            border-radius: 0;
            background: transparent url("${CUSTOM_THUMB_DATA_URI}") center / contain no-repeat;
            box-shadow: none;
            filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.55));
            transform: translate(-50%, -50%);
            transition: width 0.12s ease, height 0.12s ease, transform 0.12s ease;
            pointer-events: none;
          }
          .ytb-bar-win .ytb-progress-thumb {
            width: calc(18px * var(--ytb-s, 1));
            height: calc(18px * var(--ytb-s, 1));
          }
          .ytb-progress-wrap.is-dragging .ytb-progress-thumb {
            width: calc(26px * var(--ytb-s, 1));
            height: calc(26px * var(--ytb-s, 1));
            transform: translate(-50%, -50%) rotate(-8deg);
            filter: drop-shadow(0 0 4px rgba(255, 0, 51, 0.9));
            box-shadow: none;
          }

          .ytb-tier-2 {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: calc(6px * var(--ytb-s, 1));
          }
          .ytb-left-actions,
          .ytb-right-actions {
            display: flex;
            align-items: center;
            gap: calc(2px * var(--ytb-s, 1));
          }

          .ytb-icon-btn {
            min-width: calc(32px * var(--ytb-s, 1));
            height: calc(32px * var(--ytb-s, 1));
            padding: 0 calc(5px * var(--ytb-s, 1));
            border: none;
            border-radius: calc(6px * var(--ytb-s, 1));
            background: transparent;
            color: #ffffff;
            font-size: calc(12.5px * var(--ytb-s, 1));
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .ytb-icon-btn:active {
            background: rgba(255, 255, 255, 0.18);
          }
          .ytb-btn-play svg,
          .ytb-btn-full svg {
            width: calc(19px * var(--ytb-s, 1));
            height: calc(19px * var(--ytb-s, 1));
          }
          .ytb-btn-cc svg {
            width: calc(20px * var(--ytb-s, 1));
            height: calc(20px * var(--ytb-s, 1));
          }
          .ytb-btn-cc {
            color: rgba(255, 255, 255, 0.78);
          }
          .ytb-btn-cc.is-on {
            color: #ff3b5c;
          }
          .ytb-btn-cc-win {
            background: rgba(0, 0, 0, 0.36);
            min-width: calc(28px * var(--ytb-s, 1));
            height: calc(26px * var(--ytb-s, 1));
            padding: 0 calc(4px * var(--ytb-s, 1));
          }
          .ytb-btn-speed,
          .ytb-btn-quality {
            font-weight: 600;
          }
          .ytb-btn-speed.is-active-rate {
            color: #ff3b5c;
          }

          /* Floating Compact Speed Popover */
          .ytb-speed-drawer {
            position: absolute;
            bottom: calc(58px * var(--ytb-s, 1));
            left: 86%;
            transform: translate(-50%, 6px);
            width: calc(74px * var(--ytb-s, 1));
            z-index: 9;
            padding: calc(5px * var(--ytb-s, 1)) 0;
            border-radius: calc(8px * var(--ytb-s, 1));
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(18, 19, 25, 0.94);
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.48);
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease, transform 0.15s ease;
          }
          .ytb-root:not(.is-fullscreen) .ytb-speed-drawer {
            bottom: calc(44px * var(--ytb-s, 1));
          }
          .ytb-speed-drawer.is-open {
            opacity: 1;
            transform: translate(-50%, 0);
            pointer-events: auto;
          }
          .ytb-speed-opt {
            width: 100%;
            height: calc(30px * var(--ytb-s, 1));
            padding: 0 calc(8px * var(--ytb-s, 1));
            border: none;
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(12.5px * var(--ytb-s, 1));
            font-weight: 500;
            cursor: pointer;
            text-align: center;
          }
          .ytb-speed-opt:active {
            background: rgba(255, 255, 255, 0.1);
          }
          .ytb-speed-opt.is-active {
            color: #ff3b5c;
            font-weight: 700;
          }

          /* Floating Compact Quality Popover */
          .ytb-quality-drawer {
            position: absolute;
            bottom: calc(58px * var(--ytb-s, 1));
            left: 74%;
            transform: translateX(-50%);
            width: calc(116px * var(--ytb-s, 1));
            max-height: 62%;
            overflow-y: auto;
            overscroll-behavior: contain;
            z-index: 9;
            padding: calc(5px * var(--ytb-s, 1)) 0;
            border-radius: calc(8px * var(--ytb-s, 1));
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(18, 19, 25, 0.94);
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.48);
            display: none;
            flex-direction: column;
            align-items: stretch;
            pointer-events: auto;
          }
          .ytb-root:not(.is-fullscreen) .ytb-quality-drawer {
            bottom: calc(44px * var(--ytb-s, 1));
          }
          .ytb-quality-drawer.is-open {
            display: flex;
          }
          .ytb-quality-opt {
            width: 100%;
            min-height: calc(30px * var(--ytb-s, 1));
            padding: 0 calc(10px * var(--ytb-s, 1));
            border: none;
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .ytb-quality-opt:active {
            background: rgba(255, 255, 255, 0.1);
          }
          .ytb-quality-opt.is-active {
            color: #ff3b5c;
            font-weight: 700;
          }
          .ytb-quality-opt.is-empty {
            color: rgba(255, 255, 255, 0.55);
            cursor: default;
          }
        </style>
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
          <button id="ytbLockBtn" class="ytb-lock-btn" type="button" aria-label="锁屏">${LOCK_OPEN_SVG}</button>
          <div id="ytbPlayFlash" class="ytb-play-flash"></div>
          <div id="ytbGestureHud" class="ytb-gesture-hud">
            <div id="ytbHudMain" class="ytb-hud-main"></div>
            <div id="ytbHudSub" class="ytb-hud-sub"></div>
            <div id="ytbHudVolRow" class="ytb-hud-vol-row">
              <div id="ytbHudVolFill" class="ytb-hud-vol-fill"></div>
            </div>
          </div>
          <div id="ytbScrubPreview" class="ytb-scrub-preview">
            <div id="ytbScrubThumb" class="ytb-scrub-thumb">
              <div id="ytbScrubThumbImg" class="ytb-scrub-thumb-img"></div>
              <span id="ytbScrubThumbTime" class="ytb-scrub-thumb-time">00:00</span>
            </div>
            <div id="ytbScrubMeta" class="ytb-scrub-meta">
              <span id="ytbScrubTime" class="ytb-scrub-time">00:00 / 00:00</span>
              <span id="ytbScrubDelta" class="ytb-scrub-delta"></span>
            </div>
          </div>
          <div id="ytbMiniProgress" class="ytb-mini-progress">
            <div id="ytbMiniProgressFill" class="ytb-mini-progress-fill"></div>
          </div>
          <div id="ytbMiniToast" class="ytb-mini-toast"></div>

          <!-- Windowed Top-Right Floating Actions -->
          <div id="ytbWinTop" class="ytb-win-top">
            <button id="ytbWinCcBtn" class="ytb-icon-btn ytb-btn-cc ytb-btn-cc-win is-hidden" type="button" aria-label="字幕开关">${CC_SVG}</button>
            <button id="ytbWinNativeBtn" class="ytb-ghost-btn" type="button">原栏</button>
          </div>

          <!-- Fullscreen Top Bar -->
          <div id="ytbTopBar" class="ytb-top-bar">
            <div class="ytb-top-left">
              <button id="ytbBackBtn" class="ytb-back-btn" type="button" aria-label="退出全屏">${BACK_SVG}</button>
              <div id="ytbTitle" class="ytb-title"></div>
            </div>
            <div class="ytb-top-right">
              <div id="ytbSyncBadge" class="ytb-sync-badge"></div>
              <button id="ytbNativeBtn" class="ytb-ghost-btn" type="button">原栏</button>
            </div>
          </div>

          <div id="ytbSpeedDrawer" class="ytb-speed-drawer"></div>
          <div id="ytbQualityDrawer" class="ytb-quality-drawer"></div>

          <div id="ytbBottomBar" class="ytb-bottom-bar">
            <!-- Fullscreen 2-Tier Layout -->
            <div class="ytb-bar-fs">
              <div class="ytb-fs-time-row">
                <span id="ytbTime" class="ytb-time">00:00/00:00</span>
              </div>
              <div id="ytbProgressWrap" class="ytb-progress-wrap">
                <div class="ytb-progress-track">
                  <div id="ytbProgressFill" class="ytb-progress-fill"></div>
                  <div id="ytbProgressThumb" class="ytb-progress-thumb"></div>
                </div>
              </div>
              <div class="ytb-tier-2">
                <div class="ytb-left-actions">
                  <button id="ytbPlayBtn" class="ytb-icon-btn ytb-btn-play" type="button" aria-label="播放">${PLAY_SVG}</button>
                  <button id="ytbCcBtn" class="ytb-icon-btn ytb-btn-cc is-hidden" type="button" aria-label="字幕开关">${CC_SVG}</button>
                </div>
                <div class="ytb-right-actions">
                  <button id="ytbQualityBtn" class="ytb-icon-btn ytb-btn-quality is-hidden" type="button">画质</button>
                  <button id="ytbSpeedBtn" class="ytb-icon-btn ytb-btn-speed" type="button">倍速</button>
                  <button id="ytbFullBtn" class="ytb-icon-btn ytb-btn-full" type="button" aria-label="退出全屏">${FULL_EXIT_SVG}</button>
                </div>
              </div>
            </div>

            <!-- Windowed Slim Single-Row Layout -->
            <div class="ytb-bar-win">
              <button id="ytbWinPlayBtn" class="ytb-icon-btn ytb-btn-play" type="button" aria-label="播放">${PLAY_SVG}</button>
              <div id="ytbWinProgressWrap" class="ytb-progress-wrap">
                <div class="ytb-progress-track">
                  <div id="ytbWinProgressFill" class="ytb-progress-fill"></div>
                  <div id="ytbWinProgressThumb" class="ytb-progress-thumb"></div>
                </div>
              </div>
              <span id="ytbWinTime" class="ytb-time">00:00/00:00</span>
              <button id="ytbWinQualityBtn" class="ytb-icon-btn ytb-btn-quality is-hidden" type="button">画质</button>
              <button id="ytbWinSpeedBtn" class="ytb-icon-btn ytb-btn-speed" type="button">倍速</button>
              <button id="ytbWinFullBtn" class="ytb-icon-btn ytb-btn-full" type="button" aria-label="全屏">${FULL_ENTER_SVG}</button>
            </div>
          </div>
        </div>
      `;
      els = {
        root: shadow.getElementById("ytbRoot"),
        shield: shadow.getElementById("ytbShield"),
        volZone: shadow.getElementById("ytbVolZone"),
        boostChip: shadow.getElementById("ytbBoostChip"),
        boostText: shadow.getElementById("ytbBoostText"),
        boostHint: shadow.getElementById("ytbBoostHint"),
        unmutePill: shadow.getElementById("ytbUnmutePill"),
        returnPill: shadow.getElementById("ytbReturnPill"),
        lockBtn: shadow.getElementById("ytbLockBtn"),
        playFlash: shadow.getElementById("ytbPlayFlash"),
        gestureHud: shadow.getElementById("ytbGestureHud"),
        hudMain: shadow.getElementById("ytbHudMain"),
        hudSub: shadow.getElementById("ytbHudSub"),
        hudVolRow: shadow.getElementById("ytbHudVolRow"),
        hudVolFill: shadow.getElementById("ytbHudVolFill"),
        scrubPreview: shadow.getElementById("ytbScrubPreview"),
        scrubThumb: shadow.getElementById("ytbScrubThumb"),
        scrubThumbImg: shadow.getElementById("ytbScrubThumbImg"),
        scrubThumbTime: shadow.getElementById("ytbScrubThumbTime"),
        scrubMeta: shadow.getElementById("ytbScrubMeta"),
        scrubTime: shadow.getElementById("ytbScrubTime"),
        scrubDelta: shadow.getElementById("ytbScrubDelta"),
        miniProgress: shadow.getElementById("ytbMiniProgress"),
        miniProgressFill: shadow.getElementById("ytbMiniProgressFill"),
        miniToast: shadow.getElementById("ytbMiniToast"),
        winTop: shadow.getElementById("ytbWinTop"),
        winCcBtn: shadow.getElementById("ytbWinCcBtn"),
        winNativeBtn: shadow.getElementById("ytbWinNativeBtn"),
        topBar: shadow.getElementById("ytbTopBar"),
        backBtn: shadow.getElementById("ytbBackBtn"),
        title: shadow.getElementById("ytbTitle"),
        syncBadge: shadow.getElementById("ytbSyncBadge"),
        nativeBtn: shadow.getElementById("ytbNativeBtn"),
        speedDrawer: shadow.getElementById("ytbSpeedDrawer"),
        qualityDrawer: shadow.getElementById("ytbQualityDrawer"),
        bottomBar: shadow.getElementById("ytbBottomBar"),
        timeText: shadow.getElementById("ytbTime"),
        progressWrap: shadow.getElementById("ytbProgressWrap"),
        progressFill: shadow.getElementById("ytbProgressFill"),
        progressThumb: shadow.getElementById("ytbProgressThumb"),
        playBtn: shadow.getElementById("ytbPlayBtn"),
        ccBtn: shadow.getElementById("ytbCcBtn"),
        qualityBtn: shadow.getElementById("ytbQualityBtn"),
        speedBtn: shadow.getElementById("ytbSpeedBtn"),
        fullBtn: shadow.getElementById("ytbFullBtn"),
        winPlayBtn: shadow.getElementById("ytbWinPlayBtn"),
        winProgressWrap: shadow.getElementById("ytbWinProgressWrap"),
        winProgressFill: shadow.getElementById("ytbWinProgressFill"),
        winProgressThumb: shadow.getElementById("ytbWinProgressThumb"),
        winTime: shadow.getElementById("ytbWinTime"),
        winQualityBtn: shadow.getElementById("ytbWinQualityBtn"),
        winSpeedBtn: shadow.getElementById("ytbWinSpeedBtn"),
        winFullBtn: shadow.getElementById("ytbWinFullBtn"),
      };
      renderSpeedDrawer();
      bindShadowControls();
    }

    function ensureMounted() {
      if (!enabled) return false;
      const video = adapter?.getVideoElement?.() || null;
      const container = findPlayerContainer(video);
      if (!container) return false;
      const moviePlayer = findMoviePlayer(video) || container;
      clearTimeout(mountRetryTimer);
      mountRetryTimer = null;
      createUiDom();
      currentContainer = container;
      if (host.parentNode !== container) {
        container.appendChild(host);
      }
      bindContainerShield(container);
      bindContainerObserver(container, moviePlayer);
      bindVideoEvents(video);
      syncScale();
      syncPassthroughState();
      syncHtmlClass();
      syncPlaybackUi();
      syncVolumeUi();
      syncCcUi();
      syncQualityButtons();
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
      const nextContainer = findPlayerContainer(video);
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

    function enable({ startNative = false } = {}) {
      if (
        typeof location !== "undefined" &&
        location?.hostname &&
        location.hostname !== "www.youtube.com" &&
        location.hostname !== "m.youtube.com"
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
      if (gestureMode === "boost") {
        releaseBoost({ cancelLock: true });
      }
      clearLockedBoostSpeed({ restore: false });
      enabled = false;
      nativeBarMode = false;
      webMaximized = false;
      hadSystemFullscreen = false;
      if (isSystemFullscreenNow()) {
        try {
          (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
        } catch {}
      }
      try {
        screen?.orientation?.unlock?.();
      } catch {}
      hudVisible = false;
      speedDrawerOpen = false;
      qualityDrawerOpen = false;
      screenLocked = false;
      lockAwake = false;
      boostLockArmed = false;
      adPassthrough = false;
      endingPassthrough = false;
      userMuted = false;
      draggingSeek = false;
      activeScrubPointerId = null;
      activeScrubWrap = null;
      activePointerId = null;
      gestureMode = "idle";
      cachedStoryboard = { available: false, videoId: "" };
      preloadedSheets.clear();
      lastVideoIdSeen = "";
      clearTimers();
      clearPendingBridgeRequests();
      unbindScrubWindowEvents();
      unbindBoostGlobalRelease();
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
          "is-lock-awake"
        );
      }
      if (els.unmutePill) els.unmutePill.classList.remove("is-visible");
      if (els.boostChip) {
        els.boostChip.classList.remove("is-visible", "is-lock-armed", "is-locked-speed", "is-locked-compact");
      }
      if (els.miniToast) els.miniToast.classList.remove("is-visible");
      if (els.playFlash) els.playFlash.classList.remove("is-visible");
      if (els.speedDrawer) els.speedDrawer.classList.remove("is-open");
      if (els.qualityDrawer) els.qualityDrawer.classList.remove("is-open");
      if (els.gestureHud) els.gestureHud.classList.remove("is-visible");
      if (els.scrubPreview) els.scrubPreview.classList.remove("is-visible");
    }

    function updateRate(rate) {
      if (typeof rate !== "number" || !Number.isFinite(rate)) return;
      baseRate = rate;
      if (speedLockedByBoost && Math.abs(rate - 2.0) > 0.05) {
        clearLockedBoostSpeed({ restore: false });
      }
      if (enabled) syncRateUi();
    }

    function setActiveCount(count) {
      if (typeof count === "number" && Number.isFinite(count)) {
        activeCount = Math.max(1, Math.round(count));
      }
      if (enabled) syncTopBar();
    }

    return {
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
      isActive: () => enabled,
      isNativeBarMode: () => nativeBarMode,
      isScreenLocked: () => screenLocked,
    };
  }

  root.createYtTouchPlayer = createYtTouchPlayer;
})();
