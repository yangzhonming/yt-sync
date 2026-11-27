(() => {
  const root = (window.YTSync = window.YTSync || {});
  const BRIDGE_TIMEOUT_MS = 800;

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
    return findMoviePlayer(video) || video?.parentElement || null;
  }

  function findNativeCcButton() {
    return document.querySelector(
      "#movie_player .ytp-subtitles-button, .ytp-subtitles-button, ytm-closed-captioning-button button, button.player-cc-button"
    );
  }

  function buildYoutubeGlobalCss({ activeHtmlClass, nativeHtmlClass, webMaxHtmlClass }) {
    const chromeTargets = [
      ".ytp-chrome-bottom",
      ".ytp-chrome-top",
      ".ytp-gradient-bottom",
      ".ytp-gradient-top",
      ".ytp-bezel",
      ".ytp-bezel-text-wrapper",
      ".ytp-speedmaster-overlay",
      ".ytp-ce-element",
      ".ytp-unmute",
      ".ytp-unmute-inner",
      "button.ytp-unmute",
    ];
    const mobileChromeTargets = [
      "#player-control-overlay",
      ".player-controls-content",
      ".player-controls-background-container",
      "ytm-custom-control",
      ".ytm-unmute-button",
      "ytm-unmute-button-renderer",
      ".player-unmute-button",
      ".ytp-unmute",
      ".ytp-unmute-inner",
    ];
    const chromeSelectors = [
      ...chromeTargets.map(
        (sel) =>
          `html.${activeHtmlClass} #movie_player:not(.ad-showing):not(.ad-interrupting) ${sel}`
      ),
      ...mobileChromeTargets.map((sel) => `html.${activeHtmlClass} ${sel}`),
    ];
    return `
      ${chromeSelectors.join(",\n      ")} {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      html.${nativeHtmlClass} .ytp-chrome-top .ytp-chrome-top-buttons,
      html.${nativeHtmlClass} .player-controls-top,
      html.${nativeHtmlClass} #player-control-overlay .player-controls-top,
      html.${nativeHtmlClass} ytm-custom-control .player-controls-top {
        padding-right: 78px !important;
        box-sizing: border-box !important;
      }
      html.${webMaxHtmlClass},
      html.${webMaxHtmlClass} body {
        overflow: hidden !important;
      }
      html.${webMaxHtmlClass} ytd-masthead,
      html.${webMaxHtmlClass} #masthead-container,
      html.${webMaxHtmlClass} ytm-mobile-topbar-renderer,
      html.${webMaxHtmlClass} .mobile-topbar-header {
        display: none !important;
      }
      html.${webMaxHtmlClass} #player-container-id,
      html.${webMaxHtmlClass} #player-container #movie_player,
      html.${webMaxHtmlClass} #movie_player {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        max-height: none !important;
        z-index: 2147483000 !important;
        background: #000000 !important;
      }
      html.${webMaxHtmlClass} #player-container-id #player,
      html.${webMaxHtmlClass} #player-container-id #movie_player {
        position: relative !important;
        inset: auto !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 1 !important;
      }
      html.${webMaxHtmlClass} #movie_player .html5-video-container,
      html.${webMaxHtmlClass} #movie_player video.html5-main-video {
        width: 100% !important;
        height: 100% !important;
        left: 0 !important;
        top: 0 !important;
        object-fit: contain !important;
      }
    `;
  }

  function createYtTouchPlayer({ adapter, engine, onToggleSync } = {}) {
    const touch = root.touch;
    const { ASSETS, UTILS, THEMES, createTouchPlayerShell } = touch;
    const { formatTime, formatQualityShortLabel } = UTILS;

    let webMaximized = false;
    let ccDrawerOpen = false;
    let cachedQualityState = {
      available: false,
      currentQuality: "auto",
      currentLabel: "",
      items: [],
    };
    let cachedCaptionsState = {
      available: false,
      on: false,
      activeLanguageCode: "",
      activeVssId: "",
      items: [],
    };
    let cachedStoryboard = { available: false, videoId: "" };
    const preloadedSheets = new Set();
    let lastVideoIdSeen = "";
    let ccSyncTimer = null;

    let bridgeReqSeq = 0;
    const bridgePending = new Map();
    let bridgeListening = false;

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

    function bindBridge() {
      if (bridgeListening) return;
      bridgeListening = true;
      window.addEventListener("message", onBridgeMessage);
    }

    function unbindBridge() {
      if (!bridgeListening) return;
      bridgeListening = false;
      window.removeEventListener("message", onBridgeMessage);
      clearPendingBridgeRequests();
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

    function getNativeCcState() {
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

    function syncCcUi(api) {
      const els = api.getEls();
      const bridgeAvail = Boolean(cachedCaptionsState?.available && cachedCaptionsState.items?.length);
      const nativeState = getNativeCcState();
      const avail = bridgeAvail || nativeState.available;
      const on = bridgeAvail ? Boolean(cachedCaptionsState.on) : nativeState.on;
      [els.ccBtn, els.winCcBtn].forEach((btn) => {
        if (!btn) return;
        btn.classList.toggle("is-hidden", !avail);
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", String(on));
        btn.setAttribute("aria-label", on ? "字幕已开" : "字幕已关");
      });
    }

    function setCcDrawerOpen(open, api) {
      const els = api.getEls();
      ccDrawerOpen = Boolean(open);
      if (ccDrawerOpen) {
        api.setSpeedDrawerOpen(false);
        api.setQualityDrawerOpen(false);
        renderCcDrawerContent(api);
        const btn = api.isFullscreenNow() ? els.ccBtn : els.winCcBtn;
        api.positionPopover(els.ccDrawer, btn, 73);
        refreshCaptionsState(api);
      }
      els.ccDrawer?.classList.toggle("is-open", ccDrawerOpen);
      if (!ccDrawerOpen && api.isHudVisible()) {
        api.scheduleHudHide(api.HUD_BAR_HIDE_MS);
      } else if (ccDrawerOpen) {
        api.scheduleHudHide(api.HUD_BAR_HIDE_MS);
      }
    }

    function renderCcDrawerContent(api) {
      const els = api.getEls();
      if (!els.ccDrawer) return;
      const items = Array.isArray(cachedCaptionsState?.items) ? cachedCaptionsState.items : [];
      const isOn = Boolean(cachedCaptionsState?.on);
      const curVss = String(cachedCaptionsState?.activeVssId || "");
      const curLang = String(cachedCaptionsState?.activeLanguageCode || "");
      els.ccDrawer.textContent = "";

      const offBtn = document.createElement("button");
      offBtn.type = "button";
      offBtn.className = `ytb-cc-opt${!isOn ? " is-active" : ""}`;
      offBtn.textContent = "关闭字幕";
      offBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        setCcDrawerOpen(false, api);
        api.showMiniToast("字幕已关", api.MINI_TOAST_MS);
        const res = await requestBridge("set_caption", { off: true });
        if (api.isActive() && res) {
          cachedCaptionsState = res;
          syncCcUi(api);
        }
      });
      els.ccDrawer.appendChild(offBtn);

      items.forEach((item) => {
        const isActive =
          isOn &&
          ((curVss && item.vssId === curVss) || (!curVss && curLang && item.languageCode === curLang));
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `ytb-cc-opt${isActive ? " is-active" : ""}`;
        btn.textContent = item.label || item.languageCode || "字幕";
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          setCcDrawerOpen(false, api);
          api.showMiniToast(`字幕 ${item.label || item.languageCode}`, api.MINI_TOAST_MS);
          const res = await requestBridge("set_caption", {
            languageCode: item.languageCode,
            vssId: item.vssId,
          });
          if (api.isActive() && res) {
            cachedCaptionsState = res;
            syncCcUi(api);
          }
          clearTimeout(ccSyncTimer);
          ccSyncTimer = setTimeout(() => {
            ccSyncTimer = null;
            if (api.isActive()) refreshCaptionsState(api);
          }, 220);
        });
        els.ccDrawer.appendChild(btn);
      });
    }

    function handleCcButtonClick(api) {
      if (cachedCaptionsState?.available && cachedCaptionsState.items?.length > 0) {
        if (!api.isHudVisible()) api.wakeHud(api.HUD_BAR_HIDE_MS);
        setCcDrawerOpen(!ccDrawerOpen, api);
        return;
      }
      const state = getNativeCcState();
      if (!state.available || !state.btn) return;
      api.runNativeClick(state.btn);
      const after = getNativeCcState();
      syncCcUi(api);
      api.showMiniToast(after.on ? "字幕已开" : "字幕已关", api.MINI_TOAST_MS);
      api.wakeHud(api.HUD_BAR_HIDE_MS);
    }

    function syncQualityButtons(api) {
      const els = api.getEls();
      const st = cachedQualityState;
      const avail = Boolean(st?.available && Array.isArray(st.items) && st.items.length > 0);
      const label = formatQualityShortLabel(st?.currentLabel || st?.currentQuality);
      [els.qualityBtn, els.winQualityBtn].forEach((btn) => {
        if (!btn) return;
        btn.classList.toggle("is-hidden", !avail);
        btn.textContent = label || "画质";
      });
    }

    async function refreshQualityState(api) {
      const res = await requestBridge("get_quality");
      if (!api.isActive()) return;
      if (res && typeof res === "object") {
        cachedQualityState = res;
        syncQualityButtons(api);
        renderQualityDrawerContent(api);
      }
    }

    async function refreshCaptionsState(api) {
      const res = await requestBridge("get_captions");
      if (!api.isActive()) return;
      if (res && typeof res === "object") {
        cachedCaptionsState = res;
        syncCcUi(api);
        if (ccDrawerOpen) renderCcDrawerContent(api);
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

    async function refreshStoryboardState(api) {
      const res = await requestBridge("get_storyboard");
      if (!api.isActive()) return;
      if (res && typeof res === "object") {
        cachedStoryboard = res;
      }
    }

    function renderQualityDrawerContent(api) {
      const els = api.getEls();
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
          api.setQualityDrawerOpen(false);
          api.scheduleHudHide(api.HUD_BAR_HIDE_MS);
          const shortTxt = formatQualityShortLabel(item.label || item.quality);
          api.showMiniToast(`画质 ${shortTxt}`, api.MINI_TOAST_MS);
          const nextState = await requestBridge("set_quality", { quality: item.quality });
          if (api.isActive() && nextState) {
            cachedQualityState = nextState;
            syncQualityButtons(api);
          } else if (api.isActive()) {
            cachedQualityState = {
              ...cachedQualityState,
              currentQuality: item.quality,
              currentLabel: item.label || shortTxt,
            };
            syncQualityButtons(api);
          }
          api.scheduleQualitySync(() => refreshQualityState(api), 220);
        });
        els.qualityDrawer.appendChild(btn);
      });
    }

    const shell = createTouchPlayerShell({
      adapter,
      engine,
      onToggleSync,
      hostId: "yt-sync-yt-touch-host",
      styleId: "yt-sync-yt-touch-style",
      activeHtmlClass: "yt-sync-yt-touch-active",
      nativeHtmlClass: "yt-sync-yt-native-mode",
      webMaxHtmlClass: "yt-sync-yt-web-max",
      allowedHosts: ["www.youtube.com", "m.youtube.com"],
      theme: THEMES.youtube,
      scrubThumbHtml: '<div id="ytbScrubThumbImg" class="ytb-scrub-thumb-img"></div>',
      winTopExtraHtml: `<button id="ytbWinCcBtn" class="ytb-icon-btn ytb-btn-cc ytb-btn-cc-win is-hidden" type="button" aria-label="字幕开关">${ASSETS.CC_SVG}</button>`,
      fsLeftExtraHtml: `<button id="ytbPlayBtn" class="ytb-icon-btn ytb-btn-play" type="button" aria-label="播放">${ASSETS.PLAY_SVG}</button><button id="ytbCcBtn" class="ytb-icon-btn ytb-btn-cc is-hidden" type="button" aria-label="字幕开关">${ASSETS.CC_SVG}</button>`,
      extraDrawersHtml: '<div id="ytbCcDrawer" class="ytb-cc-drawer"></div>',
      includeYtExtras: true,
      buildGlobalCss: buildYoutubeGlobalCss,
      findContainer: findPlayerContainer,
      findShieldClassTarget: findMoviePlayer,
      getVolSplitRatio: () => 0.5,
      checkPassthrough: ({ video, container }) => {
        const player = findMoviePlayer(video) || container;
        const isAd = Boolean(
          adapter?.isAdPlaying?.() ||
            player?.classList?.contains?.("ad-showing") ||
            player?.classList?.contains?.("ad-interrupting")
        );
        const isEnding = Boolean(!isAd && (video?.ended || player?.classList?.contains?.("ended-mode")));
        return isAd || isEnding;
      },
      fullscreenConfig: {
        isWebMax: () => webMaximized,
        enterWebMax: () => {
          webMaximized = true;
          return true;
        },
        exitWebMax: () => {
          webMaximized = false;
        },
      },
      onBindShadowControls: (api) => {
        const els = api.getEls();
        const shadow = api.getShadow();
        els.ccBtn = shadow.getElementById("ytbCcBtn");
        els.winCcBtn = shadow.getElementById("ytbWinCcBtn");
        els.ccDrawer = shadow.getElementById("ytbCcDrawer");

        [els.ccBtn, els.winCcBtn].forEach((btn) => {
          btn?.addEventListener("click", (e) => {
            e.stopPropagation();
            if (api.isScreenLocked()) {
              api.wakeLockBtn(api.LOCK_AWAKE_MS);
              return;
            }
            handleCcButtonClick(api);
          });
        });

        [els.qualityBtn, els.winQualityBtn].forEach((btn) => {
          btn?.addEventListener("click", (e) => {
            e.stopPropagation();
            if (api.isScreenLocked()) {
              api.wakeLockBtn(api.LOCK_AWAKE_MS);
              return;
            }
            if (!api.isHudVisible()) api.wakeHud(api.HUD_BAR_HIDE_MS);
            const isOpen = els.qualityDrawer?.classList?.contains("is-open");
            api.setQualityDrawerOpen(!isOpen, () => {
              renderQualityDrawerContent(api);
              refreshQualityState(api);
            });
          });
        });
      },
      onHideDrawers: (except) => {
        const els = shell.getEls();
        if (except !== "cc") {
          ccDrawerOpen = false;
          els.ccDrawer?.classList.remove("is-open");
        }
      },
      hasOpenExtraDrawers: () => ccDrawerOpen,
      onRenderScrub: ({ previewSec, durSec }, api) => {
        const els = api.getEls();
        const sb = cachedStoryboard;
        const hasSb = Boolean(
          sb?.available && sb.cols > 0 && sb.rows > 0 && sb.totalCount > 0 && sb.baseUrl
        );
        if (!hasSb || !els.scrubThumbImg) return false;
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
        if (!sheetUrl) return false;

        const xPct = cols > 1 ? (col / (cols - 1)) * 100 : 0;
        const yPct = rows > 1 ? (row / (rows - 1)) * 100 : 0;
        els.scrubThumbImg.style.backgroundImage = `url("${sheetUrl}")`;
        els.scrubThumbImg.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
        els.scrubThumbImg.style.backgroundPosition = `${xPct.toFixed(4)}% ${yPct.toFixed(4)}%`;
        if (els.scrubThumb?.style && sb.width > 0 && sb.height > 0) {
          const baseW = api.isFullscreenNow() ? 160 : 128;
          const thumbH = Math.max(48, Math.round((baseW * sb.height) / sb.width));
          els.scrubThumb.style.height = `calc(${thumbH}px * var(--ytb-s, 1))`;
        }
        els.scrubPreview?.classList.add("has-thumb");
        preloadStoryboardSheet(sheetUrl);
        const totalSheets = Math.ceil(total / perSheet);
        if (sheetIdx + 1 < totalSheets) {
          preloadStoryboardSheet(buildStoryboardSheetUrl(sb, sheetIdx + 1));
        }
        return true;
      },
      onRefreshContext: (api) => {
        const vid = adapter?.getVideoId?.() || "";
        if (vid !== lastVideoIdSeen) {
          lastVideoIdSeen = vid;
          cachedStoryboard = { available: false, videoId: vid };
          preloadedSheets.clear();
          api.clearLockedBoostSpeed({ restore: false });
        }
        syncCcUi(api);
        syncQualityButtons(api);
        refreshQualityState(api);
        refreshCaptionsState(api);
        refreshStoryboardState(api);
      },
      onWakeHud: (api) => {
        syncCcUi(api);
        syncQualityButtons(api);
      },
      onFullscreenSync: (api) => {
        syncCcUi(api);
        syncQualityButtons(api);
        if (ccDrawerOpen) {
          const els = api.getEls();
          const btn = api.isFullscreenNow() ? els.ccBtn : els.winCcBtn;
          api.positionPopover(els.ccDrawer, btn, 73);
        }
      },
      onResize: (api) => {
        if (ccDrawerOpen) {
          const els = api.getEls();
          const btn = api.isFullscreenNow() ? els.ccBtn : els.winCcBtn;
          api.positionPopover(els.ccDrawer, btn, 73);
        }
      },
      onDisable: () => {
        webMaximized = false;
        ccDrawerOpen = false;
        clearTimeout(ccSyncTimer);
        ccSyncTimer = null;
        cachedStoryboard = { available: false, videoId: "" };
        preloadedSheets.clear();
        lastVideoIdSeen = "";
        unbindBridge();
      },
    });

    return {
      ...shell,
      enable: (opts) => {
        bindBridge();
        shell.enable(opts);
      },
    };
  }

  root.createYtTouchPlayer = createYtTouchPlayer;
})();
