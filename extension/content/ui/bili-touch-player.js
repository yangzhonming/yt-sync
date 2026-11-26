(() => {
  const root = (window.YTSync = window.YTSync || {});

  const RATE_OPTIONS = [2.0, 1.5, 1.25, 1.0, 0.75];
  const HUD_QUICK_HIDE_MS = 1000;
  const HUD_BAR_HIDE_MS = 2800;
  const RETURN_PILL_HIDE_MS = 2400;
  const VIDEOSHOT_RETRY_COOLDOWN_MS = 15000;
  const MAX_DECODED_SHEETS = 4;
  const LONG_PRESS_MS = 350;
  const DRAG_THRESHOLD_PX = 14;
  const TAP_MOVE_LIMIT_PX = 10;
  const MINI_TOAST_MS = 900;
  const PLAY_FLASH_MS = 320;
  const SCRUB_HUD_HIDE_MS = 260;
  const VOL_HUD_HIDE_MS = 320;

  const HOST_ID = "yt-sync-bili-touch-host";
  const STYLE_ID = "yt-sync-bili-touch-style";
  const ACTIVE_HTML_CLASS = "yt-sync-bili-touch-active";

  const PLAY_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v14l11-7-11-7z"/></svg>';
  const PAUSE_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>';
  const BACK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  const FULL_ENTER_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  const FULL_EXIT_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
  const VOL_ON_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M18.36 5.64a9 9 0 0 1 0 12.73"/></svg>';
  const VOL_MUTE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><line x1="22" y1="9" x2="16" y2="15" stroke="#fb7299"/><line x1="16" y1="9" x2="22" y2="15" stroke="#fb7299"/></svg>';
  const DM_ON_SVG =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4l3 2.5L15 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="6.5" width="18" height="13" rx="3" stroke="currentColor" stroke-width="1.8"/><text x="12" y="15.5" text-anchor="middle" fill="currentColor" font-size="8.5" font-weight="700" font-family="sans-serif">弹</text><circle cx="19" cy="17.5" r="4" fill="#fb7299"/><path d="M17.2 17.5l1.2 1.2 2.3-2.3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DM_OFF_SVG =
    '<svg viewBox="0 0 24 24" fill="none" opacity="0.62" aria-hidden="true"><path d="M9 4l3 2.5L15 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="6.5" width="18" height="13" rx="3" stroke="currentColor" stroke-width="1.8"/><text x="12" y="15.5" text-anchor="middle" fill="currentColor" font-size="8.5" font-weight="700" font-family="sans-serif">弹</text><line x1="4" y1="19" x2="20" y2="7" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round"/></svg>';

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

  function isFullscreenNow() {
    return Boolean(
      document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.querySelector?.(".bpx-player-container")?.getAttribute?.("data-screen") === "full"
    );
  }

  function findPlayerContainer(video) {
    const direct =
      video?.closest?.(".bpx-player-video-area, .bpx-player-container, #bilibili-player") || null;
    if (direct) return direct;
    return (
      document.querySelector(".bpx-player-video-area") ||
      document.querySelector(".bpx-player-container") ||
      document.querySelector("#bilibili-player") ||
      video?.parentElement ||
      null
    );
  }

  function findDanmakuCheckbox() {
    return document.querySelector(
      '.bpx-player-dm-switch input[type="checkbox"], .bui-danmaku-switch-input'
    );
  }

  function findNativeFullscreenButton() {
    return document.querySelector(".bpx-player-ctrl-full, .bpx-player-ctrl-btn.bpx-player-ctrl-full");
  }

  function parseBiliVideoRef() {
    try {
      const pathStr = typeof location !== "undefined" ? String(location.pathname || "") : "";
      const searchStr = typeof location !== "undefined" ? String(location.search || "") : "";
      const params = searchStr ? new URLSearchParams(searchStr) : null;

      const videoMatch = pathStr.match(/^\/video\/(BV[0-9A-Za-z]+|av(\d+))/i);
      if (videoMatch) {
        const bvid = videoMatch[1].toUpperCase().startsWith("BV") ? videoMatch[1] : null;
        const aid = bvid ? null : videoMatch[2];
        const pRaw = Number(params?.get("p") || 1);
        const pageNum = Number.isInteger(pRaw) && pRaw > 1 ? pRaw : 1;
        return {
          key: `${bvid || `av${aid}`}?p=${pageNum}`,
          kind: "video",
          bvid,
          aid,
          pageNum,
        };
      }

      if (pathStr.startsWith("/list/")) {
        const bvidParam = params?.get("bvid") || "";
        const oidParam = params?.get("oid") || "";
        const bvid = /^BV[0-9A-Za-z]+$/i.test(bvidParam) ? bvidParam : null;
        const aid = !bvid && /^\d+$/.test(oidParam) ? oidParam : null;
        if (bvid || aid) {
          const pRaw = Number(params?.get("p") || 1);
          const pageNum = Number.isInteger(pRaw) && pRaw > 1 ? pRaw : 1;
          return {
            key: `${bvid || `av${aid}`}?p=${pageNum}`,
            kind: "video",
            bvid,
            aid,
            pageNum,
          };
        }
      }

      const bangumiMatch = pathStr.match(/^\/bangumi\/play\/(ep(\d+)|ss(\d+))/i);
      if (bangumiMatch) {
        const epId = bangumiMatch[2] || null;
        const seasonId = bangumiMatch[3] || null;
        return {
          key: epId ? `ep${epId}` : `ss${seasonId}`,
          kind: "bangumi",
          epId,
          seasonId,
          pageNum: 1,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  function normalizeShotUrl(rawUrl) {
    const s = String(rawUrl || "").trim();
    if (!s) return "";
    if (s.startsWith("//")) return `https:${s}`;
    return s;
  }

  function extractVideoshotData(json, cid) {
    const data = json?.code === 0 ? json.data : null;
    if (!data) return null;
    let src = null;
    if (Array.isArray(data.image) && data.image.length > 0) {
      src = data;
    } else if (data.video_shots && typeof data.video_shots === "object") {
      const shotMap = data.video_shots;
      const keys = Object.keys(shotMap);
      const preferredKey = cid && shotMap[String(cid)] ? String(cid) : keys[0];
      if (preferredKey && shotMap[preferredKey]) {
        src = shotMap[preferredKey];
      }
    }
    if (!src) return null;
    const images = Array.isArray(src.image) ? src.image.map(normalizeShotUrl).filter(Boolean) : [];
    const cols = Number(src.img_x_len) || 0;
    const rows = Number(src.img_y_len) || 0;
    if (images.length === 0 || cols <= 0 || rows <= 0) return null;
    return {
      images,
      cols,
      rows,
      xSize: Number(src.img_x_size) || 0,
      ySize: Number(src.img_y_size) || 0,
      pvdata: normalizeShotUrl(src.pvdata || ""),
      index: Array.isArray(src.index) ? src.index : [],
    };
  }

  async function fetchJsonWithFallback(url) {
    if (typeof fetch !== "function") return null;
    for (const credentials of ["omit", "include"]) {
      try {
        const res = await fetch(url, { credentials });
        if (res?.ok) {
          return await res.json();
        }
      } catch {}
    }
    return null;
  }

  async function fetchPvdataIndex(pvdataUrl) {
    if (!pvdataUrl || typeof fetch !== "function" || typeof DataView !== "function") return [];
    for (const credentials of ["omit", "include"]) {
      try {
        const res = await fetch(pvdataUrl, { credentials });
        if (res?.ok && typeof res.arrayBuffer === "function") {
          const ab = await res.arrayBuffer();
          if (!ab || ab.byteLength < 2) continue;
          const dv = new DataView(ab);
          const out = [];
          for (let i = 0; i + 1 < dv.byteLength; i += 2) {
            out.push(dv.getUint16(i, false));
          }
          if (out.length > 0) return out;
        }
      } catch {}
    }
    return [];
  }

  function findVideoshotFrame(shot, sec, dur) {
    if (!shot || !Array.isArray(shot.images) || shot.images.length === 0) return null;
    const cols = Number(shot.cols) || 0;
    const rows = Number(shot.rows) || 0;
    if (cols <= 0 || rows <= 0) return null;
    const perSheet = cols * rows;
    const maxFrames = shot.images.length * perSheet;
    const targetSec = Math.max(0, Number(sec) || 0);
    let frameIdx = 0;

    if (Array.isArray(shot.index) && shot.index.length > 0) {
      const idxArr = shot.index;
      let lo = 0;
      let hi = idxArr.length - 1;
      let matched = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (Number(idxArr[mid]) <= targetSec) {
          matched = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      const hasDummyZero = idxArr.length > 1 && Number(idxArr[0]) === 0 && Number(idxArr[1]) === 0;
      frameIdx = hasDummyZero ? Math.max(0, matched - 1) : matched;
    } else if (Number.isFinite(dur) && dur > 0) {
      frameIdx = Math.floor((Math.min(targetSec, dur) / dur) * Math.max(1, maxFrames - 1));
    }

    frameIdx = Math.max(0, Math.min(maxFrames - 1, frameIdx));
    const sheetIdx = Math.min(shot.images.length - 1, Math.floor(frameIdx / perSheet));
    const inSheet = frameIdx % perSheet;
    const row = Math.floor(inSheet / cols);
    const col = inSheet % cols;
    const imageUrl = shot.images[sheetIdx];
    if (!imageUrl) return null;

    return {
      imageUrl,
      sheetIdx,
      col,
      row,
      cols,
      rows,
      xSize: Number(shot.xSize) || 0,
      ySize: Number(shot.ySize) || 0,
    };
  }

  function createBiliTouchPlayer({ adapter, engine } = {}) {
    let enabled = false;
    let nativeBarMode = false;
    let hudVisible = false;
    let speedDrawerOpen = false;
    let volumePopoverOpen = false;
    let endingPassthrough = false;
    let dmFallbackEnabled = true;
    let userMuted = false;
    let lastNonZeroVolume = 0.8;
    let activeCount = 1;
    let baseRate = 1;

    let host = null;
    let shadow = null;
    let els = {};
    let currentContainer = null;
    let currentVideo = null;

    let hudTimer = null;
    let returnPillTimer = null;
    let gestureHudTimer = null;
    let scrubPreviewTimer = null;
    let videoshotPreloadTimer = null;
    let miniToastTimer = null;
    let playFlashTimer = null;
    let longPressTimer = null;
    let mountRetryTimer = null;

    let allowNativeClickDepth = 0;

    let draggingSeek = false;
    let draggingVolume = false;
    let seekPreviewTime = 0;
    let activeScrubPointerId = null;
    let activeScrubWrap = null;
    let activeScrubStartSec = 0;
    let activeVolPointerId = null;
    let activeScrubContext = null;
    let lastVideoPaused = null;

    let activePointerId = null;
    let gestureMode = "idle"; // idle | pending | seek | volume | boost | scroll_yield
    let gestureStartX = 0;
    let gestureStartY = 0;
    let gestureStartAt = 0;
    let gestureMaxDist = 0;
    let gestureStartTimeSec = 0;
    let gestureStartVol = 1;
    let gesturePendingSeekSec = 0;
    let preBoostRate = 1;

    const videoshotCache = new Map();
    const videoshotPending = new Map();
    const videoshotFailedAt = new Map();
    const decodedShotImages = new Map();
    const loadingShotUrls = new Set();
    const multiSheetTimers = new Set();
    let scrubDrawRafId = null;
    let pendingDrawPayload = null;
    let lastDrawnFrameKey = "";
    let lastPaintedVideoKey = "";
    let hasPaintedScrubFrame = false;

    let globalEventsBound = false;
    let boostGlobalBound = false;
    let scrubWindowBound = false;
    let volWindowBound = false;
    let unbindScrubWindowEvents = () => {};
    let unbindVolWindowEvents = () => {};
    let containerShieldEl = null;
    let outerShieldEl = null;
    let resizeObserver = null;

    function ensureGlobalStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const softHiddenTargets = [
        ".bpx-player-control-wrap",
        ".bpx-player-control-entity",
        ".bpx-player-control-top",
        ".bpx-player-control-bottom",
        ".bpx-player-control-mask",
        ".bpx-player-shadow-progress-area",
      ];
      const hardHiddenTargets = [
        ".bpx-player-top-wrap",
        ".bpx-player-state-wrap",
        ".bpx-player-context-area",
        ".bpx-player-contextmenu",
        ".bpx-player-contextmenu-wrap",
        ".bpx-player-toast-wrap",
        ".bpx-player-dialog-wrap",
      ];
      const toSelectors = (list) =>
        list.flatMap((sel) => [
          `html.${ACTIVE_HTML_CLASS} #bilibili-player ${sel}`,
          `html.${ACTIVE_HTML_CLASS} .bpx-player-container ${sel}`,
        ]);
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        ${toSelectors(softHiddenTargets).join(",\n        ")} {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        ${toSelectors(hardHiddenTargets).join(",\n        ")} {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    function syncHtmlClass() {
      const rootEl = document.documentElement;
      if (!rootEl) return;
      if (enabled && !nativeBarMode) {
        ensureGlobalStyle();
        rootEl.classList.add(ACTIVE_HTML_CLASS);
      } else {
        rootEl.classList.remove(ACTIVE_HTML_CLASS);
      }
    }

    function clearTimers() {
      clearTimeout(hudTimer);
      hudTimer = null;
      clearTimeout(returnPillTimer);
      returnPillTimer = null;
      clearTimeout(gestureHudTimer);
      gestureHudTimer = null;
      clearTimeout(scrubPreviewTimer);
      scrubPreviewTimer = null;
      clearTimeout(videoshotPreloadTimer);
      videoshotPreloadTimer = null;
      clearTimeout(miniToastTimer);
      miniToastTimer = null;
      clearTimeout(playFlashTimer);
      playFlashTimer = null;
      clearTimeout(longPressTimer);
      longPressTimer = null;
      clearTimeout(mountRetryTimer);
      mountRetryTimer = null;
      multiSheetTimers.forEach((t) => clearTimeout(t));
      multiSheetTimers.clear();
      if (scrubDrawRafId !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(scrubDrawRafId);
      }
      scrubDrawRafId = null;
      pendingDrawPayload = null;
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

    function isEndingTarget(e) {
      return Boolean(e?.target?.closest?.(".bpx-player-ending-wrap"));
    }

    function onShieldContextMenu(e) {
      if (!enabled || nativeBarMode || endingPassthrough || isEndingTarget(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation?.();
      e.stopPropagation();
    }

    function onShieldNativeClick(e) {
      if (!enabled || nativeBarMode || endingPassthrough || isEndingTarget(e)) return;
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

    function onFullscreenChange() {
      if (!enabled) return;
      ensureMounted();
      syncScale();
      syncTopBar();
      syncPlaybackUi();
      if (volumePopoverOpen) positionVolumePopover();
    }

    function onWindowResize() {
      if (!enabled) return;
      syncScale();
      if (volumePopoverOpen) positionVolumePopover();
    }

    function onBoostDocVisChange() {
      if (document.hidden) releaseBoost();
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

    function releaseBoost() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      unbindBoostGlobalRelease();
      const wasBoost = gestureMode === "boost";
      gestureMode = "idle";
      activePointerId = null;
      els.boostChip?.classList.remove("is-visible");
      if (wasBoost) {
        const restore = Number.isFinite(preBoostRate) ? preBoostRate : 1;
        engine?.setPlaybackRate?.(restore, { showToast: false });
        syncRateUi();
      }
    }

    function bindGlobalEvents() {
      if (globalEventsBound) return;
      globalEventsBound = true;
      document.addEventListener("fullscreenchange", onFullscreenChange);
      document.addEventListener("webkitfullscreenchange", onFullscreenChange);
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("touchstart", onNativeWakeTap, { passive: true, capture: true });
      window.addEventListener("pointerdown", onNativeWakeTap, { passive: true, capture: true });
    }

    function unbindGlobalEvents() {
      if (!globalEventsBound) return;
      globalEventsBound = false;
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("touchstart", onNativeWakeTap, true);
      window.removeEventListener("pointerdown", onNativeWakeTap, true);
    }

    function bindContainerObserver(container) {
      unbindContainerObserver();
      if (!container || typeof ResizeObserver !== "function") return;
      resizeObserver = new ResizeObserver(() => {
        if (enabled) syncScale();
      });
      resizeObserver.observe(container);
    }

    function unbindContainerObserver() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    }

    function bindContainerShield(container) {
      const nextOuter =
        container?.closest?.(".bpx-player-container") ||
        document.querySelector(".bpx-player-container") ||
        null;
      const resolvedOuter = nextOuter && nextOuter !== container ? nextOuter : null;
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
      syncEndingState();
      syncPlaybackUi();
      syncVolumeUi();
    }

    function onVideoLoadedMetadata() {
      if (!enabled) return;
      syncEndingState();
      syncPlaybackUi();
      syncVolumeUi();
      scheduleVideoshotPreload(1200);
    }

    function onVideoPlayStateChange() {
      if (!enabled) return;
      syncEndingState();
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
      if (gestureMode !== "boost") {
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
      ["timeupdate", "durationchange", "seeking"].forEach((ev) => {
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
      ["timeupdate", "durationchange", "seeking"].forEach((ev) => {
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
      if (gestureMode === "boost") return 2.0;
      const engRate = engine?.getBaseRate?.();
      if (typeof engRate === "number" && Number.isFinite(engRate)) return engRate;
      const vidRate = currentVideo?.playbackRate;
      if (typeof vidRate === "number" && Number.isFinite(vidRate)) return vidRate;
      return baseRate || 1;
    }

    function getDanmakuState() {
      const cb = findDanmakuCheckbox();
      if (cb && typeof cb.checked === "boolean") {
        dmFallbackEnabled = cb.checked;
        return cb.checked;
      }
      return dmFallbackEnabled;
    }

    function toggleDanmaku() {
      const cb = findDanmakuCheckbox();
      if (cb) {
        runNativeClick(cb);
        dmFallbackEnabled = Boolean(cb.checked);
      } else {
        dmFallbackEnabled = !dmFallbackEnabled;
        const evInit = {
          key: "d",
          code: "KeyD",
          keyCode: 68,
          which: 68,
          bubbles: true,
          cancelable: true,
        };
        const downEv = new KeyboardEvent("keydown", evInit);
        downEv.__ytSyncSynthetic = true;
        const upEv = new KeyboardEvent("keyup", evInit);
        upEv.__ytSyncSynthetic = true;
        const target = currentContainer || document;
        target.dispatchEvent(downEv);
        target.dispatchEvent(upEv);
      }
      syncDanmakuUi();
      showMiniToast(dmFallbackEnabled ? "弹幕已开" : "弹幕已关", MINI_TOAST_MS);
    }

    function toggleFullscreen() {
      const fullBtn = findNativeFullscreenButton();
      if (fullBtn && typeof fullBtn.click === "function") {
        runNativeClick(fullBtn);
        return;
      }
      toggleDomFullscreenFallback(isFullscreenNow());
    }

    function toggleDomFullscreenFallback(wasFullscreen) {
      if (wasFullscreen) {
        (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
      } else {
        const target =
          document.querySelector(".bpx-player-container") ||
          currentContainer?.closest?.(".bpx-player-container") ||
          document.querySelector("#bilibili-player") ||
          currentContainer ||
          adapter?.getVideoElement?.() ||
          document.documentElement;
        (target?.requestFullscreen || target?.webkitRequestFullscreen)?.call(target)?.catch?.(() => {});
      }
    }

    function syncDanmakuUi() {
      const on = getDanmakuState();
      const svg = on ? DM_ON_SVG : DM_OFF_SVG;
      const label = on ? "弹幕已开" : "弹幕已关";
      [els.dmBtn, els.winDmBtn].forEach((btn) => {
        if (!btn) return;
        btn.innerHTML = svg;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", String(on));
        btn.setAttribute("aria-label", label);
      });
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

    function isEndingOverlayActive(video) {
      if (video?.ended) return true;
      const endingEl = document.querySelector?.(".bpx-player-ending-wrap");
      if (endingEl && typeof getComputedStyle === "function") {
        const cs = getComputedStyle(endingEl);
        if (cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity || 0) > 0.05) {
          return true;
        }
      }
      return false;
    }

    function syncEndingState() {
      const video = currentVideo || adapter?.getVideoElement?.();
      const nextEnding = Boolean(enabled && !nativeBarMode && isEndingOverlayActive(video));
      if (nextEnding !== endingPassthrough) {
        endingPassthrough = nextEnding;
        els.root?.classList.toggle("is-ending-passthrough", endingPassthrough);
        if (endingPassthrough) {
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
      const effectivePct = muted ? 0 : Math.round(rawVol * 100);
      const svg = muted ? VOL_MUTE_SVG : VOL_ON_SVG;
      const label = muted ? "取消静音" : "音量";

      [els.volBtn, els.winVolBtn].forEach((btn) => {
        if (!btn) return;
        btn.innerHTML = svg;
        btn.classList.toggle("is-muted", muted);
        btn.setAttribute("aria-label", label);
      });
      if (els.volPct) els.volPct.textContent = String(effectivePct);
      if (els.volFill) els.volFill.style.height = `${effectivePct}%`;
      if (els.volThumb) els.volThumb.style.bottom = `${effectivePct}%`;
      if (els.unmutePill) {
        const showUnmute = Boolean(
          enabled && !nativeBarMode && !endingPassthrough && !userMuted && video && muted
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
      flashPlayIcon(pausedAfter);
      wakeHud(pausedAfter ? HUD_BAR_HIDE_MS : HUD_QUICK_HIDE_MS);
    }

    function flashPlayIcon(paused) {
      if (!els.playFlash) return;
      clearTimeout(playFlashTimer);
      els.playFlash.innerHTML = paused ? PAUSE_SVG : PLAY_SVG;
      els.playFlash.classList.add("is-visible");
      playFlashTimer = setTimeout(() => {
        playFlashTimer = null;
        els.playFlash?.classList.remove("is-visible");
      }, PLAY_FLASH_MS);
    }

    function putDecodedSheet(url, source) {
      if (decodedShotImages.has(url)) {
        decodedShotImages.delete(url);
      }
      while (decodedShotImages.size >= MAX_DECODED_SHEETS) {
        const oldestKey = decodedShotImages.keys().next().value;
        const evicted = decodedShotImages.get(oldestKey);
        decodedShotImages.delete(oldestKey);
        if (evicted && evicted.tagName === "CANVAS") {
          evicted.width = 0;
          evicted.height = 0;
        }
      }
      decodedShotImages.set(url, source);
    }

    function touchDecodedSheet(url) {
      if (!url || !decodedShotImages.has(url)) return null;
      const val = decodedShotImages.get(url);
      decodedShotImages.delete(url);
      decodedShotImages.set(url, val);
      return val;
    }

    function clearDecodedSheets() {
      decodedShotImages.forEach((entry) => {
        if (entry && entry.tagName === "CANVAS") {
          entry.width = 0;
          entry.height = 0;
        }
      });
      decodedShotImages.clear();
      loadingShotUrls.clear();
    }

    function preloadShotSheet(url, onReady) {
      if (!url) return;
      const existing = touchDecodedSheet(url);
      if (existing) {
        if (typeof onReady === "function") onReady(existing);
        return;
      }
      if (loadingShotUrls.has(url)) return;
      if (typeof Image !== "function") {
        const mockImg = { _mock: true, naturalWidth: 1600, naturalHeight: 900, src: url };
        putDecodedSheet(url, mockImg);
        if (typeof onReady === "function") onReady(mockImg);
        return;
      }
      loadingShotUrls.add(url);
      const img = new Image();
      img.onload = async () => {
        if (typeof img.decode === "function") {
          try {
            await img.decode();
          } catch {
            loadingShotUrls.delete(url);
            return;
          }
        }
        loadingShotUrls.delete(url);
        if (!enabled) {
          img.onload = null;
          img.onerror = null;
          img.src = "";
          return;
        }
        const natW = Number(img.naturalWidth) || 0;
        const natH = Number(img.naturalHeight) || 0;
        if (img.naturalWidth === undefined || natW > 0) {
          let cachedSource = img;
          if (natW > 2000 && natH > 0 && typeof document?.createElement === "function") {
            try {
              const downW = Math.min(1600, natW);
              const downH = Math.max(1, Math.round((natH / natW) * downW));
              const offscreen = document.createElement("canvas");
              offscreen.tagName = offscreen.tagName || "CANVAS";
              offscreen.width = downW;
              offscreen.height = downH;
              const octx = offscreen.getContext?.("2d");
              if (octx && typeof octx.drawImage === "function") {
                octx.drawImage(img, 0, 0, downW, downH);
                cachedSource = offscreen;
                img.onload = null;
                img.onerror = null;
                img.src = "";
              }
            } catch {}
          }
          putDecodedSheet(url, cachedSource);
          if (typeof onReady === "function") onReady(cachedSource);
          if (enabled && activeScrubContext && (draggingSeek || gestureMode === "seek")) {
            renderScrubPreview(activeScrubContext);
          }
        }
      };
      img.onerror = () => {
        loadingShotUrls.delete(url);
      };
      img.src = url;
    }

    function preloadAllShotSheets(images) {
      if (!Array.isArray(images) || images.length === 0) return;
      const limit = Math.min(images.length, MAX_DECODED_SHEETS);
      const loadAt = (idx) => {
        if (!enabled || idx >= limit) return;
        preloadShotSheet(images[idx], () => {
          if (!enabled || idx + 1 >= limit) return;
          const timer = setTimeout(() => {
            multiSheetTimers.delete(timer);
            loadAt(idx + 1);
          }, 400);
          multiSheetTimers.add(timer);
        });
      };
      loadAt(0);
    }

    function scheduleVideoshotPreload(delayMs = 1200) {
      if (!enabled) return;
      const ref = parseBiliVideoRef();
      if (!ref) return;
      if (videoshotCache.has(ref.key)) {
        const cached = videoshotCache.get(ref.key);
        if (cached?.images?.length) preloadAllShotSheets(cached.images);
        return;
      }
      if (videoshotPending.has(ref.key) || videoshotPreloadTimer) return;
      videoshotPreloadTimer = setTimeout(() => {
        videoshotPreloadTimer = null;
        if (enabled) ensureVideoshotLoaded();
      }, delayMs);
    }

    function ensureVideoshotLoaded() {
      const ref = parseBiliVideoRef();
      if (!ref || typeof fetch !== "function") return null;
      if (videoshotCache.has(ref.key)) {
        const cached = videoshotCache.get(ref.key);
        if (cached?.images?.length) preloadAllShotSheets(cached.images);
        return Promise.resolve(cached);
      }
      if (videoshotPending.has(ref.key)) return videoshotPending.get(ref.key);
      const lastFail = videoshotFailedAt.get(ref.key) || 0;
      if (lastFail > 0 && Date.now() - lastFail < VIDEOSHOT_RETRY_COOLDOWN_MS) {
        return null;
      }

      const promise = (async () => {
        try {
          let bvid = ref.bvid;
          let aid = ref.aid;
          let cid = null;

          if (ref.kind === "bangumi") {
            const pgcQuery = ref.epId
              ? `ep_id=${encodeURIComponent(ref.epId)}`
              : `season_id=${encodeURIComponent(ref.seasonId)}`;
            const pgcJson = await fetchJsonWithFallback(
              `https://api.bilibili.com/pgc/view/web/season?${pgcQuery}`
            );
            const episodes = Array.isArray(pgcJson?.result?.episodes)
              ? pgcJson.result.episodes
              : [];
            const matchedEp =
              (ref.epId && episodes.find((ep) => String(ep?.id) === String(ref.epId))) ||
              episodes[0] ||
              null;
            if (matchedEp) {
              if (matchedEp.bvid) bvid = matchedEp.bvid;
              if (matchedEp.aid) aid = String(matchedEp.aid);
              if (matchedEp.cid) cid = matchedEp.cid;
            }
          }

          if (!bvid && !aid) {
            videoshotFailedAt.set(ref.key, Date.now());
            return null;
          }

          const idQuery = bvid
            ? `bvid=${encodeURIComponent(bvid)}`
            : `aid=${encodeURIComponent(aid)}`;

          const fetchPageCid = async (pageIdx) => {
            const pageJson = await fetchJsonWithFallback(
              `https://api.bilibili.com/x/player/pagelist?${idQuery}`
            );
            const list = Array.isArray(pageJson?.data) ? pageJson.data : [];
            const item = list[Math.max(0, pageIdx - 1)] || list[0] || null;
            return item?.cid || null;
          };

          if (!cid && ref.pageNum > 1) {
            cid = await fetchPageCid(ref.pageNum);
          }

          let shotUrl = `https://api.bilibili.com/x/player/videoshot?${idQuery}${cid ? `&cid=${encodeURIComponent(cid)}` : ""}&index=1`;
          let json = await fetchJsonWithFallback(shotUrl);
          let parsed = extractVideoshotData(json, cid);

          if (!parsed && !cid) {
            cid = await fetchPageCid(ref.pageNum || 1);
            if (cid) {
              shotUrl = `https://api.bilibili.com/x/player/videoshot?${idQuery}&cid=${encodeURIComponent(cid)}&index=1`;
              json = await fetchJsonWithFallback(shotUrl);
              parsed = extractVideoshotData(json, cid);
            }
          }

          if (!parsed) {
            videoshotFailedAt.set(ref.key, Date.now());
            return null;
          }

          if (parsed.index.length === 0 && parsed.pvdata) {
            const binIndex = await fetchPvdataIndex(parsed.pvdata);
            if (binIndex.length > 0) {
              parsed.index = binIndex;
            }
          }

          videoshotFailedAt.delete(ref.key);
          videoshotCache.set(ref.key, parsed);
          preloadAllShotSheets(parsed.images);
          if (enabled && activeScrubContext && (draggingSeek || gestureMode === "seek")) {
            renderScrubPreview(activeScrubContext);
          }
          return parsed;
        } catch {
          videoshotFailedAt.set(ref.key, Date.now());
          return null;
        } finally {
          videoshotPending.delete(ref.key);
        }
      })();

      videoshotPending.set(ref.key, promise);
      return promise;
    }

    function paintCanvasNow(sheetSource, frame, frameKey) {
      const canvas = els.scrubCanvas;
      if (!canvas) return;
      if (lastDrawnFrameKey === frameKey && hasPaintedScrubFrame) return;
      const ctx = canvas.getContext?.("2d");
      if (!ctx) return;
      const srcW = Number(sheetSource?.naturalWidth || sheetSource?.width) || 0;
      const srcH = Number(sheetSource?.naturalHeight || sheetSource?.height) || 0;
      const cellW = srcW > 0 ? srcW / frame.cols : frame.xSize || 160;
      const cellH = srcH > 0 ? srcH / frame.rows : frame.ySize || 90;
      const sx = frame.col * cellW;
      const sy = frame.row * cellH;
      const cw = Number(canvas.width) || 320;
      const ch = Number(canvas.height) || 180;
      ctx.drawImage(sheetSource, sx, sy, cellW, cellH, 0, 0, cw, ch);
      lastDrawnFrameKey = frameKey;
      hasPaintedScrubFrame = true;
      if (canvas.dataset) canvas.dataset.frameKey = frameKey;
    }

    function drawScrubCanvasFrame(sheetSource, frame, frameKey) {
      if (!els.scrubCanvas || !sheetSource || !frame) return;
      if (lastDrawnFrameKey === frameKey && hasPaintedScrubFrame) return;
      pendingDrawPayload = { img: sheetSource, frame, frameKey };
      if (typeof requestAnimationFrame !== "function") {
        const payload = pendingDrawPayload;
        pendingDrawPayload = null;
        paintCanvasNow(payload.img, payload.frame, payload.frameKey);
        return;
      }
      if (scrubDrawRafId !== null) return;
      scrubDrawRafId = requestAnimationFrame(() => {
        scrubDrawRafId = null;
        const payload = pendingDrawPayload;
        pendingDrawPayload = null;
        if (payload) {
          paintCanvasNow(payload.img, payload.frame, payload.frameKey);
        }
      });
    }

    function renderScrubPreview(ctx) {
      if (!ctx || !els.scrubPreview) return;
      const { mode, previewSec, durSec, deltaSec, ratio } = ctx;
      const isTrack = mode === "track";
      els.scrubPreview.classList.toggle("is-track-mode", isTrack);
      els.scrubPreview.classList.toggle("is-swipe-mode", !isTrack);

      const ref = parseBiliVideoRef();
      const refKey = ref ? ref.key : "";
      if (refKey !== lastPaintedVideoKey) {
        hasPaintedScrubFrame = false;
        lastDrawnFrameKey = "";
        lastPaintedVideoKey = refKey;
      }
      const shot = ref ? videoshotCache.get(ref.key) : null;
      const frame = findVideoshotFrame(shot, previewSec, durSec);
      const decodedImg = frame ? touchDecodedSheet(frame.imageUrl) : null;
      let thumbShown = false;

      if (frame && decodedImg) {
        const frameKey = `${frame.imageUrl}#${frame.col},${frame.row}`;
        drawScrubCanvasFrame(decodedImg, frame, frameKey);
        hasPaintedScrubFrame = true;
        thumbShown = true;
        els.scrubPreview.classList.add("has-thumb");
      } else if (frame && hasPaintedScrubFrame) {
        preloadShotSheet(frame.imageUrl);
        thumbShown = true;
        els.scrubPreview.classList.add("has-thumb");
      } else {
        if (frame) preloadShotSheet(frame.imageUrl);
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
          els.scrubDelta.textContent = `${rounded > 0 ? "+" : "-"}${Math.abs(rounded)}s`;
          els.scrubDelta.style.display = "inline";
        }
      }

      if (isTrack) {
        const rootRect = els.root?.getBoundingClientRect?.();
        const wrapRect = activeScrubWrap?.getBoundingClientRect?.();
        const scale = Number(host?.style?.getPropertyValue?.("--ytb-s")) || 1;
        const baseWidth = thumbShown ? (isFullscreenNow() ? 160 : 128) : 96;
        const halfBoxW = (baseWidth * scale) / 2;
        if (rootRect && rootRect.width > 0 && wrapRect && wrapRect.width > 0) {
          const clampedRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
          const rawCenterX = (wrapRect.left - rootRect.left) + clampedRatio * wrapRect.width;
          const clampedX = Math.max(halfBoxW + 8, Math.min(rootRect.width - halfBoxW - 8, rawCenterX));
          els.scrubPreview.style.left = `${clampedX}px`;
        } else {
          const clampedPct = Math.max(12, Math.min(88, (Number(ratio) || 0) * 100));
          els.scrubPreview.style.left = `${clampedPct}%`;
        }
      } else {
        els.scrubPreview.style.left = "";
      }

      els.scrubPreview.classList.add("is-visible");
    }

    function showScrubPreview(ctx) {
      clearTimeout(scrubPreviewTimer);
      scrubPreviewTimer = null;
      activeScrubContext = ctx;
      renderScrubPreview(ctx);
    }

    function hideScrubPreview(delayMs = 0) {
      clearTimeout(scrubPreviewTimer);
      const resetAndHide = () => {
        scrubPreviewTimer = null;
        activeScrubContext = null;
        hasPaintedScrubFrame = false;
        lastDrawnFrameKey = "";
        els.scrubPreview?.classList.remove("is-visible");
      };
      if (delayMs > 0) {
        scrubPreviewTimer = setTimeout(resetAndHide, delayMs);
      } else {
        resetAndHide();
      }
    }

    function showVolumeHud(pct) {
      clearTimeout(gestureHudTimer);
      gestureHudTimer = null;
      if (!els.gestureHud) return;
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      if (els.hudMain) els.hudMain.textContent = `音量 ${clamped}%`;
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

    function positionVolumePopover() {
      if (!els.volPopover) return;
      const btn = isFullscreenNow() ? els.volBtn : els.winVolBtn;
      const rootRect = els.root?.getBoundingClientRect?.();
      const btnRect = btn?.getBoundingClientRect?.();
      const scale = Number(host?.style?.getPropertyValue?.("--ytb-s")) || 1;
      if (rootRect && rootRect.width > 0 && btnRect && btnRect.width > 0) {
        const centerX = (btnRect.left - rootRect.left) + btnRect.width / 2;
        const halfW = 16 * scale;
        const clampedX = Math.max(halfW + 6, Math.min(rootRect.width - halfW - 6, centerX));
        els.volPopover.style.left = `${clampedX}px`;
      } else {
        els.volPopover.style.left = "";
      }
    }

    function setVolumePopoverOpen(open) {
      volumePopoverOpen = Boolean(open);
      if (volumePopoverOpen) {
        speedDrawerOpen = false;
        els.speedDrawer?.classList.remove("is-open");
        syncVolumeUi();
        positionVolumePopover();
      }
      els.volPopover?.classList.toggle("is-open", volumePopoverOpen);
      if (volumePopoverOpen) {
        clearTimeout(hudTimer);
        hudTimer = null;
      } else if (hudVisible) {
        scheduleHudHide(HUD_BAR_HIDE_MS);
      }
    }

    function setSpeedDrawerOpen(open) {
      speedDrawerOpen = Boolean(open);
      if (speedDrawerOpen) {
        volumePopoverOpen = false;
        els.volPopover?.classList.remove("is-open");
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
      setVolumePopoverOpen(false);
      els.root?.classList.remove("is-hud-open");
    }

    function scheduleHudHide(ms = HUD_BAR_HIDE_MS) {
      clearTimeout(hudTimer);
      const video = currentVideo || adapter?.getVideoElement?.();
      if (
        Boolean(video?.paused) ||
        speedDrawerOpen ||
        volumePopoverOpen ||
        draggingSeek ||
        draggingVolume ||
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
      if (!enabled || nativeBarMode || endingPassthrough) return;
      hudVisible = true;
      els.root?.classList.add("is-hud-open");
      syncPlaybackUi();
      syncVolumeUi();
      syncDanmakuUi();
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
      if (nativeBarMode) {
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
        syncEndingState();
        wakeHud(HUD_QUICK_HIDE_MS);
      }
    }

    function renderSpeedDrawer() {
      if (!els.speedDrawer) return;
      els.speedDrawer.textContent = "";
      const header = document.createElement("div");
      header.className = "ytb-speed-header";
      header.textContent = "倍速";
      els.speedDrawer.appendChild(header);
      RATE_OPTIONS.forEach((rate) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ytb-speed-opt";
        btn.dataset.rate = String(rate);
        btn.textContent = formatOptionText(rate);
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
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

      [els.volBtn, els.winVolBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          const video = currentVideo || adapter?.getVideoElement?.();
          const isMuted =
            Boolean(video?.muted) || (Number.isFinite(video?.volume) ? video.volume : 1) <= 0.001;
          if (isMuted) {
            unmuteVideo();
            wakeHud(HUD_BAR_HIDE_MS);
            return;
          }
          if (!hudVisible) wakeHud(HUD_BAR_HIDE_MS);
          setVolumePopoverOpen(!volumePopoverOpen);
        });
      });

      const updateVolFromClientY = (clientY) => {
        const track = els.volTrack;
        const video = currentVideo || adapter?.getVideoElement?.();
        if (!track || !video) return;
        const rect = track.getBoundingClientRect?.() || { top: 0, bottom: 120, height: 120 };
        const height = Math.max(1, rect.height || 120);
        const rawRatio = Math.max(0, Math.min(1, (rect.bottom - clientY) / height));
        const ratio = rawRatio <= 0.015 ? 0 : rawRatio;
        userMuted = ratio === 0;
        video.volume = ratio;
        video.muted = ratio === 0;
        syncVolumeUi();
        showVolumeHud(ratio * 100);
      };

      const onVolWindowMove = (e) => {
        if (!draggingVolume) return;
        const pid = e.pointerId ?? 0;
        if (activeVolPointerId !== null && pid !== activeVolPointerId) return;
        updateVolFromClientY(e.clientY);
      };

      const finishVolumeDrag = (e) => {
        if (!draggingVolume) return;
        if (e && e.pointerId !== undefined && activeVolPointerId !== null && e.pointerId !== activeVolPointerId) {
          return;
        }
        e?.stopPropagation?.();
        draggingVolume = false;
        activeVolPointerId = null;
        unbindVolWindowEvents();
        hideGestureHud(VOL_HUD_HIDE_MS);
        scheduleHudHide(HUD_BAR_HIDE_MS);
      };

      const bindVolWindowEvents = () => {
        if (volWindowBound) return;
        volWindowBound = true;
        window.addEventListener("pointermove", onVolWindowMove, true);
        window.addEventListener("pointerup", finishVolumeDrag, true);
        window.addEventListener("pointercancel", finishVolumeDrag, true);
        window.addEventListener("blur", finishVolumeDrag);
      };

      unbindVolWindowEvents = () => {
        if (!volWindowBound) return;
        volWindowBound = false;
        window.removeEventListener("pointermove", onVolWindowMove, true);
        window.removeEventListener("pointerup", finishVolumeDrag, true);
        window.removeEventListener("pointercancel", finishVolumeDrag, true);
        window.removeEventListener("blur", finishVolumeDrag);
      };

      els.volTrack?.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        { passive: false }
      );
      els.volTrack?.addEventListener(
        "touchmove",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        { passive: false }
      );

      els.volTrack?.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        draggingVolume = true;
        activeVolPointerId = e.pointerId ?? 0;
        clearTimeout(hudTimer);
        hudTimer = null;
        try {
          els.volTrack.setPointerCapture?.(e.pointerId);
        } catch {}
        bindVolWindowEvents();
        updateVolFromClientY(e.clientY);
      });

      els.volTrack?.addEventListener("pointermove", (e) => {
        if (!draggingVolume) return;
        const pid = e.pointerId ?? 0;
        if (activeVolPointerId !== null && pid !== activeVolPointerId) return;
        e.stopPropagation();
        updateVolFromClientY(e.clientY);
      });

      els.volTrack?.addEventListener("pointerup", finishVolumeDrag);
      els.volTrack?.addEventListener("pointercancel", finishVolumeDrag);

      [els.dmBtn, els.winDmBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleDanmaku();
          wakeHud(HUD_BAR_HIDE_MS);
        });
      });

      [els.nativeBtn, els.winNativeBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          setNativeBarMode(true);
        });
      });

      [els.speedBtn, els.winSpeedBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!hudVisible) wakeHud(HUD_BAR_HIDE_MS);
          setSpeedDrawerOpen(!speedDrawerOpen);
        });
      });

      [els.fullBtn, els.winFullBtn, els.backBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleFullscreen();
          wakeHud(HUD_BAR_HIDE_MS);
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
        const width = Math.max(1, rect.width || 1);
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / width));
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        seekPreviewTime = dur * ratio;
        syncPlaybackUi();
        showScrubPreview({
          mode: "track",
          previewSec: seekPreviewTime,
          durSec: dur,
          deltaSec: seekPreviewTime - activeScrubStartSec,
          ratio,
        });
      };

      const onScrubWindowMove = (e) => {
        if (!draggingSeek) return;
        const pid = e.pointerId ?? 0;
        if (activeScrubPointerId !== null && pid !== activeScrubPointerId) return;
        updateSeekFromClientX(e.clientX);
      };

      const finishSeekDrag = (e) => {
        if (!draggingSeek) return;
        if (
          e &&
          e.pointerId !== undefined &&
          activeScrubPointerId !== null &&
          e.pointerId !== activeScrubPointerId
        ) {
          return;
        }
        e?.stopPropagation?.();
        draggingSeek = false;
        activeScrubPointerId = null;
        if (activeScrubWrap) {
          activeScrubWrap.classList.remove("is-dragging");
          activeScrubWrap = null;
        }
        unbindScrubWindowEvents();
        const video = currentVideo || adapter?.getVideoElement?.();
        if (video && Number.isFinite(seekPreviewTime)) {
          video.currentTime = seekPreviewTime;
        }
        hideScrubPreview(SCRUB_HUD_HIDE_MS);
        scheduleHudHide(HUD_BAR_HIDE_MS);
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
          if (volumePopoverOpen) setVolumePopoverOpen(false);
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
          ensureVideoshotLoaded();
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

        shield.addEventListener("pointerdown", (e) => {
          if (!enabled || nativeBarMode || endingPassthrough) return;
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
          const video = currentVideo || adapter?.getVideoElement?.();
          gestureStartTimeSec = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
          gestureStartVol = Number.isFinite(video?.volume) ? video.volume : 1;
          gesturePendingSeekSec = gestureStartTimeSec;

          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            if (!enabled || nativeBarMode || endingPassthrough || gestureMode !== "pending") return;
            preBoostRate = getDisplayRate();
            gestureMode = "boost";
            shield.setPointerCapture?.(activePointerId);
            bindBoostGlobalRelease();
            engine?.setPlaybackRate?.(2.0, { showToast: false });
            syncRateUi();
            els.boostChip?.classList.add("is-visible");
          }, LONG_PRESS_MS);
        });

        shield.addEventListener("pointermove", (e) => {
          if (!enabled || nativeBarMode || endingPassthrough || gestureMode === "idle" || gestureMode === "scroll_yield") {
            return;
          }
          const pid = e.pointerId ?? 0;
          if (activePointerId !== null && pid !== activePointerId) return;

          const dx = e.clientX - gestureStartX;
          const dy = e.clientY - gestureStartY;
          const dist = Math.hypot(dx, dy);
          gestureMaxDist = Math.max(gestureMaxDist, dist);

          if (dist > TAP_MOVE_LIMIT_PX && longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }

          if (gestureMode === "pending") {
            if (Math.abs(dx) > DRAG_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 1.15) {
              gestureMode = "seek";
              try {
                shield.setPointerCapture?.(e.pointerId);
              } catch {}
              ensureVideoshotLoaded();
            } else if (Math.abs(dy) > DRAG_THRESHOLD_PX && Math.abs(dy) > Math.abs(dx) * 1.15) {
              const rect = shield.getBoundingClientRect?.() || { left: 0, width: 360, height: 240 };
              const relX = gestureStartX - (rect.left || 0);
              const width = rect.width || window.innerWidth || 360;
              const splitRatio = isFullscreenNow() ? 0.5 : 0.6;
              if (relX >= width * splitRatio) {
                gestureMode = "volume";
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
            const width = Math.max(200, rect.width || 360);
            const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
            const deltaSec = (dx / width) * 90;
            gesturePendingSeekSec =
              dur > 0
                ? Math.max(0, Math.min(dur, gestureStartTimeSec + deltaSec))
                : Math.max(0, gestureStartTimeSec + deltaSec);
            showScrubPreview({
              mode: "swipe",
              previewSec: gesturePendingSeekSec,
              durSec: dur,
              deltaSec: gesturePendingSeekSec - gestureStartTimeSec,
              ratio: dur > 0 ? gesturePendingSeekSec / dur : 0,
            });
          } else if (gestureMode === "volume") {
            const rect = shield.getBoundingClientRect?.() || { left: 0, width: 360, height: 240 };
            const height = Math.max(120, (rect.height || 240) * 0.65);
            const nextVol = Math.max(0, Math.min(1, gestureStartVol - dy / height));
            video.volume = nextVol;
            if (nextVol > 0) {
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
            if (gestureMode === "seek" || gestureMode === "volume") {
              e.preventDefault();
            }
          },
          { passive: false }
        );

        const onGestureCancel = (e) => {
          const pid = e.pointerId ?? 0;
          if (activePointerId !== null && pid !== activePointerId) return;
          if (gestureMode === "boost") {
            releaseBoost();
          } else {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            activePointerId = null;
            gestureMode = "idle";
          }
          hideGestureHud(0);
          hideScrubPreview(0);
        };

        const onGestureUp = (e) => {
          const pid = e.pointerId ?? 0;
          if (activePointerId !== null && pid !== activePointerId) return;
          clearTimeout(longPressTimer);
          longPressTimer = null;
          if (gestureMode === "boost") {
            releaseBoost();
            e.stopPropagation();
            return;
          }
          activePointerId = null;
          if (!enabled || nativeBarMode || endingPassthrough) {
            gestureMode = "idle";
            return;
          }
          e.stopPropagation();

          const finishedMode = gestureMode;
          const heldMs = Date.now() - gestureStartAt;
          gestureMode = "idle";
          const video = currentVideo || adapter?.getVideoElement?.();

          if (finishedMode === "seek") {
            if (video && Number.isFinite(gesturePendingSeekSec)) {
              video.currentTime = gesturePendingSeekSec;
            }
            hideScrubPreview(SCRUB_HUD_HIDE_MS);
          } else if (finishedMode === "volume") {
            hideGestureHud(VOL_HUD_HIDE_MS);
          } else if (
            finishedMode === "pending" &&
            gestureMaxDist <= TAP_MOVE_LIMIT_PX &&
            heldMs < LONG_PRESS_MS
          ) {
            if (speedDrawerOpen || volumePopoverOpen) {
              setSpeedDrawerOpen(false);
              setVolumePopoverOpen(false);
              scheduleHudHide(HUD_BAR_HIDE_MS);
            } else {
              togglePlayWithPulse();
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
        "position:absolute;inset:0;z-index:1005;pointer-events:none;overflow:hidden;";
      shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <style>
          :host {
            all: initial;
            position: absolute;
            inset: 0;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
          }
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          .ytb-root {
            position: absolute;
            inset: 0;
            pointer-events: none;
            user-select: none;
            color: #ffffff;
          }
          .ytb-shield {
            position: absolute;
            inset: 0;
            pointer-events: auto;
            touch-action: pan-y;
          }
          .ytb-root.is-fullscreen .ytb-shield {
            touch-action: none;
          }
          .ytb-vol-zone {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 40%;
            pointer-events: auto;
            touch-action: none;
          }
          .ytb-root.is-native-mode .ytb-shield,
          .ytb-root.is-ending-passthrough .ytb-shield,
          .ytb-root.is-ending-passthrough .ytb-bottom-bar,
          .ytb-root.is-ending-passthrough .ytb-top-bar,
          .ytb-root.is-ending-passthrough .ytb-win-top {
            display: none !important;
            pointer-events: none !important;
          }

          /* Top-Center Lightweight 2.0x Boost Chip */
          .ytb-boost-chip {
            position: absolute;
            top: calc(10px * var(--ytb-s, 1));
            left: 50%;
            transform: translateX(-50%);
            z-index: 9;
            padding: calc(4px * var(--ytb-s, 1)) calc(11px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(0, 0, 0, 0.64);
            backdrop-filter: blur(6px);
            color: #ffffff;
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 600;
            display: none;
            align-items: center;
            gap: calc(4px * var(--ytb-s, 1));
            pointer-events: none;
            white-space: nowrap;
          }
          .ytb-boost-chip.is-visible {
            display: inline-flex;
          }

          /* Top-Left Lightweight Auto-Muted Pill */
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
            gap: calc(4px * var(--ytb-s, 1));
            cursor: pointer;
            pointer-events: auto;
          }
          .ytb-unmute-pill.is-visible {
            display: inline-flex;
          }
          .ytb-root.is-fullscreen.is-hud-open .ytb-unmute-pill {
            top: calc(44px * var(--ytb-s, 1));
          }

          /* Top-Right Return Pill in Native Bar Mode */
          .ytb-return-pill {
            position: absolute;
            top: calc(10px * var(--ytb-s, 1));
            right: calc(12px * var(--ytb-s, 1));
            z-index: 8;
            height: calc(28px * var(--ytb-s, 1));
            padding: 0 calc(10px * var(--ytb-s, 1));
            border-radius: 9999px;
            border: 1px solid rgba(251, 114, 153, 0.55);
            background: rgba(16, 16, 22, 0.82);
            backdrop-filter: blur(8px);
            color: #ffd0de;
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 600;
            display: none;
            align-items: center;
            cursor: pointer;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
          }
          .ytb-root.is-native-mode .ytb-return-pill {
            display: inline-flex;
          }
          .ytb-root.is-native-mode .ytb-return-pill.is-awake {
            opacity: 1;
            pointer-events: auto;
          }

          /* Center Micro-Pulse SVG on Single Tap */
          .ytb-play-flash {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0.92);
            width: calc(42px * var(--ytb-s, 1));
            height: calc(42px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(0, 0, 0, 0.44);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.12s ease, transform 0.14s ease;
            z-index: 6;
          }
          .ytb-play-flash svg {
            width: calc(20px * var(--ytb-s, 1));
            height: calc(20px * var(--ytb-s, 1));
          }
          .ytb-play-flash.is-visible {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }

          /* Upper-Center Volume Gesture HUD */
          .ytb-gesture-hud {
            position: absolute;
            top: 26%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 7;
            min-width: calc(112px * var(--ytb-s, 1));
            padding: calc(7px * var(--ytb-s, 1)) calc(14px * var(--ytb-s, 1));
            border-radius: calc(6px * var(--ytb-s, 1));
            background: rgba(20, 20, 20, 0.86);
            color: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: calc(5px * var(--ytb-s, 1));
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.12s ease;
            white-space: nowrap;
          }
          .ytb-gesture-hud.is-visible {
            opacity: 1;
          }
          .ytb-hud-main {
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(12.5px * var(--ytb-s, 1));
            font-weight: 600;
          }
          .ytb-hud-sub {
            display: none;
          }
          .ytb-hud-vol-row {
            width: calc(92px * var(--ytb-s, 1));
            height: calc(3.5px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.24);
            overflow: hidden;
            display: none;
          }
          .ytb-hud-vol-fill {
            height: 100%;
            width: 80%;
            border-radius: 9999px;
            background: #fb7299;
          }

          /* Bilibili Native-Style Scrub Preview & Videoshot Sprite Window */
          .ytb-scrub-preview {
            position: absolute;
            z-index: 8;
            transform: translateX(-50%);
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
          .ytb-scrub-preview.is-track-mode {
            bottom: calc(46px * var(--ytb-s, 1));
          }
          .ytb-root.is-fullscreen .ytb-scrub-preview.is-track-mode {
            bottom: calc(74px * var(--ytb-s, 1));
          }
          .ytb-scrub-preview.is-swipe-mode {
            top: 28%;
            left: 50%;
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
          .ytb-scrub-canvas {
            display: block;
            width: 100%;
            height: 100%;
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
            border-radius: calc(4px * var(--ytb-s, 1));
            background: rgba(20, 20, 20, 0.9);
            color: #ffffff;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 600;
            white-space: nowrap;
          }
          .ytb-scrub-preview.is-track-mode.has-thumb .ytb-scrub-meta {
            display: none;
          }
          .ytb-scrub-delta {
            color: #fb7299;
            font-size: calc(11px * var(--ytb-s, 1));
          }

          /* Bottom 2px Mini Progress Hairline While HUD Hidden */
          .ytb-mini-progress {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 2px;
            z-index: 3;
            background: rgba(255, 255, 255, 0.2);
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.2s linear;
          }
          .ytb-root.is-hud-open .ytb-mini-progress,
          .ytb-root.is-native-mode .ytb-mini-progress,
          .ytb-root.is-ending-passthrough .ytb-mini-progress {
            opacity: 0;
          }
          .ytb-mini-progress-fill {
            height: 100%;
            width: 0%;
            background: #fb7299;
          }

          /* Bottom-Left Subtle Mini Toast (Discrete Actions, 900ms) */
          .ytb-mini-toast {
            position: absolute;
            left: calc(12px * var(--ytb-s, 1));
            bottom: calc(48px * var(--ytb-s, 1));
            z-index: 7;
            padding: calc(4px * var(--ytb-s, 1)) calc(10px * var(--ytb-s, 1));
            border-radius: calc(6px * var(--ytb-s, 1));
            background: rgba(0, 0, 0, 0.62);
            color: rgba(255, 255, 255, 0.92);
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 500;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.14s ease;
            white-space: nowrap;
          }
          .ytb-root.is-fullscreen .ytb-mini-toast {
            bottom: calc(76px * var(--ytb-s, 1));
          }
          .ytb-mini-toast.is-visible {
            opacity: 1;
          }

          /* Windowed Top-Right Floating Controls (弹 + 原栏) */
          .ytb-win-top {
            position: absolute;
            top: calc(8px * var(--ytb-s, 1));
            right: calc(10px * var(--ytb-s, 1));
            z-index: 5;
            display: flex;
            align-items: center;
            gap: calc(4px * var(--ytb-s, 1));
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s linear;
          }
          .ytb-root.is-fullscreen .ytb-win-top {
            display: none;
          }
          .ytb-root:not(.is-fullscreen).is-hud-open:not(.is-native-mode) .ytb-win-top {
            opacity: 1;
            pointer-events: auto;
          }

          /* Fullscreen Top Bar */
          .ytb-top-bar {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            z-index: 4;
            padding: calc(8px * var(--ytb-s, 1)) calc(12px * var(--ytb-s, 1)) calc(16px * var(--ytb-s, 1));
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.68) 0%, transparent 100%);
            display: none;
            align-items: center;
            justify-content: space-between;
            gap: calc(8px * var(--ytb-s, 1));
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s linear;
          }
          .ytb-root.is-fullscreen:not(.is-native-mode) .ytb-top-bar {
            display: flex;
          }
          .ytb-root.is-fullscreen.is-hud-open:not(.is-native-mode) .ytb-top-bar {
            opacity: 1;
            pointer-events: auto;
          }
          .ytb-top-left {
            display: flex;
            align-items: center;
            gap: calc(5px * var(--ytb-s, 1));
            min-width: 0;
            flex: 1;
          }
          .ytb-top-right {
            display: flex;
            align-items: center;
            gap: calc(6px * var(--ytb-s, 1));
            flex-shrink: 0;
          }
          .ytb-back-btn {
            width: calc(30px * var(--ytb-s, 1));
            height: calc(30px * var(--ytb-s, 1));
            border: none;
            border-radius: calc(6px * var(--ytb-s, 1));
            background: transparent;
            color: #ffffff;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .ytb-back-btn svg {
            width: calc(18px * var(--ytb-s, 1));
            height: calc(18px * var(--ytb-s, 1));
          }
          .ytb-title {
            font-size: calc(13px * var(--ytb-s, 1));
            font-weight: 500;
            color: #f4f4f5;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .ytb-sync-badge {
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 500;
            color: #6ee7b7;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .ytb-ghost-btn {
            border: none;
            border-radius: calc(6px * var(--ytb-s, 1));
            background: rgba(0, 0, 0, 0.38);
            color: rgba(255, 255, 255, 0.88);
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 500;
            padding: calc(4px * var(--ytb-s, 1)) calc(8px * var(--ytb-s, 1));
            cursor: pointer;
          }
          .ytb-ghost-btn:active {
            background: rgba(255, 255, 255, 0.2);
          }

          /* Bottom Bar Wrapper */
          .ytb-bottom-bar {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 4;
            padding: calc(10px * var(--ytb-s, 1)) calc(10px * var(--ytb-s, 1)) calc(4px * var(--ytb-s, 1));
            background: linear-gradient(0deg, rgba(0, 0, 0, 0.76) 0%, rgba(0, 0, 0, 0.26) 60%, transparent 100%);
            opacity: 0;
            pointer-events: none;
            touch-action: none;
            transition: opacity 0.2s linear;
          }
          .ytb-root.is-hud-open:not(.is-native-mode) .ytb-bottom-bar {
            opacity: 1;
            pointer-events: auto;
          }
          .ytb-root.is-native-mode .ytb-bottom-bar {
            display: none;
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

          /* Progress Track (Generous Touch Hit Box + 3px Pink Line + 10px Dot) */
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
            background: #fb7299;
          }
          .ytb-progress-thumb {
            position: absolute;
            top: 50%;
            left: 0%;
            width: calc(10px * var(--ytb-s, 1));
            height: calc(10px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: #ffffff;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
            transform: translate(-50%, -50%);
            transition: width 0.1s ease, height 0.1s ease;
            pointer-events: none;
          }
          .ytb-progress-wrap.is-dragging .ytb-progress-thumb {
            width: calc(14px * var(--ytb-s, 1));
            height: calc(14px * var(--ytb-s, 1));
            box-shadow: 0 0 0 calc(2px * var(--ytb-s, 1)) #fb7299;
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

          /* Borderless Pure-White SVG Hit Targets */
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
          .ytb-btn-vol svg {
            width: calc(18px * var(--ytb-s, 1));
            height: calc(18px * var(--ytb-s, 1));
          }
          .ytb-btn-dm svg {
            width: calc(20px * var(--ytb-s, 1));
            height: calc(20px * var(--ytb-s, 1));
          }
          .ytb-btn-dm-win {
            background: rgba(0, 0, 0, 0.36);
            min-width: calc(28px * var(--ytb-s, 1));
            height: calc(26px * var(--ytb-s, 1));
            padding: 0 calc(4px * var(--ytb-s, 1));
          }
          .ytb-btn-speed {
            font-weight: 600;
          }
          .ytb-btn-speed.is-active-rate {
            color: #fb7299;
          }

          /* Volume Popover (Bilibili Native 32px Slim Bar) */
          .ytb-vol-popover {
            position: absolute;
            left: calc(80% - calc(28px * var(--ytb-s, 1)));
            bottom: calc(42px * var(--ytb-s, 1));
            transform: translateX(-50%);
            z-index: 9;
            width: calc(32px * var(--ytb-s, 1));
            height: calc(102px * var(--ytb-s, 1));
            padding: calc(2px * var(--ytb-s, 1)) 0 calc(10px * var(--ytb-s, 1));
            border-radius: calc(3px * var(--ytb-s, 1));
            border: none;
            box-shadow: none;
            background: rgba(20, 20, 20, 0.9);
            display: none;
            flex-direction: column;
            align-items: center;
            pointer-events: auto;
          }
          .ytb-root.is-fullscreen .ytb-vol-popover {
            left: calc(88px * var(--ytb-s, 1));
            bottom: calc(62px * var(--ytb-s, 1));
          }
          .ytb-vol-popover.is-open {
            display: flex;
          }
          .ytb-vol-pct {
            height: calc(24px * var(--ytb-s, 1));
            line-height: calc(24px * var(--ytb-s, 1));
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 500;
            color: #e5e9ef;
          }
          .ytb-vol-track {
            position: relative;
            width: 100%;
            flex: 1;
            display: flex;
            justify-content: center;
            cursor: pointer;
            touch-action: none;
          }
          .ytb-vol-bar-bg {
            position: relative;
            width: calc(2.5px * var(--ytb-s, 1));
            height: 100%;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.25);
            pointer-events: none;
          }
          .ytb-vol-fill {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 80%;
            border-radius: 9999px;
            background: #fb7299;
          }
          .ytb-vol-thumb {
            position: absolute;
            left: 50%;
            bottom: 80%;
            width: calc(11px * var(--ytb-s, 1));
            height: calc(11px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: #fb7299;
            box-shadow: 0 0 0 calc(2px * var(--ytb-s, 1)) #ffffff;
            transform: translate(-50%, 50%);
            pointer-events: none;
          }

          /* Right-Side Full-Height Speed Drawer */
          .ytb-speed-drawer {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: calc(106px * var(--ytb-s, 1));
            z-index: 9;
            padding: calc(10px * var(--ytb-s, 1)) calc(8px * var(--ytb-s, 1));
            background: rgba(14, 14, 20, 0.9);
            backdrop-filter: blur(12px);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: calc(4px * var(--ytb-s, 1));
            transform: translateX(105%);
            transition: transform 0.18s ease;
            pointer-events: auto;
          }
          .ytb-speed-drawer.is-open {
            transform: translateX(0);
          }
          .ytb-speed-header {
            font-size: calc(11.5px * var(--ytb-s, 1));
            color: #a1a1aa;
            text-align: center;
            padding-bottom: calc(3px * var(--ytb-s, 1));
          }
          .ytb-speed-opt {
            width: 100%;
            height: calc(32px * var(--ytb-s, 1));
            padding: 0 calc(8px * var(--ytb-s, 1));
            border: none;
            border-radius: calc(7px * var(--ytb-s, 1));
            background: transparent;
            color: #e4e4e7;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(13px * var(--ytb-s, 1));
            font-weight: 500;
            cursor: pointer;
            text-align: center;
          }
          .ytb-speed-opt.is-active {
            background: rgba(251, 114, 153, 0.22);
            color: #fb7299;
            font-weight: 700;
          }
        </style>
        <div id="ytbRoot" class="ytb-root">
          <div id="ytbShield" class="ytb-shield">
            <div id="ytbVolZone" class="ytb-vol-zone"></div>
          </div>
          <div id="ytbBoostChip" class="ytb-boost-chip">» 2.0x</div>
          <button id="ytbUnmutePill" class="ytb-unmute-pill" type="button">🔇 点此开声</button>
          <button id="ytbReturnPill" class="ytb-return-pill" type="button">✨ 触屏栏</button>
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
              <canvas id="ytbScrubCanvas" class="ytb-scrub-canvas" width="320" height="180"></canvas>
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
            <button id="ytbWinDmBtn" class="ytb-icon-btn ytb-btn-dm ytb-btn-dm-win" type="button" aria-label="弹幕开关">${DM_ON_SVG}</button>
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

          <div id="ytbVolPopover" class="ytb-vol-popover">
            <div id="ytbVolPct" class="ytb-vol-pct">80</div>
            <div id="ytbVolTrack" class="ytb-vol-track">
              <div class="ytb-vol-bar-bg">
                <div id="ytbVolFill" class="ytb-vol-fill"></div>
                <div id="ytbVolThumb" class="ytb-vol-thumb"></div>
              </div>
            </div>
          </div>

          <div id="ytbSpeedDrawer" class="ytb-speed-drawer"></div>

          <div id="ytbBottomBar" class="ytb-bottom-bar">
            <!-- Fullscreen App 2-Tier Layout -->
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
                  <button id="ytbDmBtn" class="ytb-icon-btn ytb-btn-dm" type="button" aria-label="弹幕开关">${DM_ON_SVG}</button>
                  <button id="ytbVolBtn" class="ytb-icon-btn ytb-btn-vol" type="button" aria-label="音量">${VOL_ON_SVG}</button>
                </div>
                <div class="ytb-right-actions">
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
              <button id="ytbWinVolBtn" class="ytb-icon-btn ytb-btn-vol" type="button" aria-label="音量">${VOL_ON_SVG}</button>
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
        unmutePill: shadow.getElementById("ytbUnmutePill"),
        returnPill: shadow.getElementById("ytbReturnPill"),
        playFlash: shadow.getElementById("ytbPlayFlash"),
        gestureHud: shadow.getElementById("ytbGestureHud"),
        hudMain: shadow.getElementById("ytbHudMain"),
        hudSub: shadow.getElementById("ytbHudSub"),
        hudVolRow: shadow.getElementById("ytbHudVolRow"),
        hudVolFill: shadow.getElementById("ytbHudVolFill"),
        scrubPreview: shadow.getElementById("ytbScrubPreview"),
        scrubThumb: shadow.getElementById("ytbScrubThumb"),
        scrubCanvas: shadow.getElementById("ytbScrubCanvas"),
        scrubThumbTime: shadow.getElementById("ytbScrubThumbTime"),
        scrubMeta: shadow.getElementById("ytbScrubMeta"),
        scrubTime: shadow.getElementById("ytbScrubTime"),
        scrubDelta: shadow.getElementById("ytbScrubDelta"),
        miniProgress: shadow.getElementById("ytbMiniProgress"),
        miniProgressFill: shadow.getElementById("ytbMiniProgressFill"),
        miniToast: shadow.getElementById("ytbMiniToast"),
        winTop: shadow.getElementById("ytbWinTop"),
        winDmBtn: shadow.getElementById("ytbWinDmBtn"),
        winNativeBtn: shadow.getElementById("ytbWinNativeBtn"),
        topBar: shadow.getElementById("ytbTopBar"),
        backBtn: shadow.getElementById("ytbBackBtn"),
        title: shadow.getElementById("ytbTitle"),
        syncBadge: shadow.getElementById("ytbSyncBadge"),
        nativeBtn: shadow.getElementById("ytbNativeBtn"),
        volPopover: shadow.getElementById("ytbVolPopover"),
        volPct: shadow.getElementById("ytbVolPct"),
        volTrack: shadow.getElementById("ytbVolTrack"),
        volFill: shadow.getElementById("ytbVolFill"),
        volThumb: shadow.getElementById("ytbVolThumb"),
        speedDrawer: shadow.getElementById("ytbSpeedDrawer"),
        bottomBar: shadow.getElementById("ytbBottomBar"),
        timeText: shadow.getElementById("ytbTime"),
        progressWrap: shadow.getElementById("ytbProgressWrap"),
        progressFill: shadow.getElementById("ytbProgressFill"),
        progressThumb: shadow.getElementById("ytbProgressThumb"),
        playBtn: shadow.getElementById("ytbPlayBtn"),
        dmBtn: shadow.getElementById("ytbDmBtn"),
        volBtn: shadow.getElementById("ytbVolBtn"),
        speedBtn: shadow.getElementById("ytbSpeedBtn"),
        fullBtn: shadow.getElementById("ytbFullBtn"),
        winPlayBtn: shadow.getElementById("ytbWinPlayBtn"),
        winProgressWrap: shadow.getElementById("ytbWinProgressWrap"),
        winProgressFill: shadow.getElementById("ytbWinProgressFill"),
        winProgressThumb: shadow.getElementById("ytbWinProgressThumb"),
        winTime: shadow.getElementById("ytbWinTime"),
        winVolBtn: shadow.getElementById("ytbWinVolBtn"),
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
      clearTimeout(mountRetryTimer);
      mountRetryTimer = null;
      createUiDom();
      currentContainer = container;
      if (host.parentNode !== container) {
        container.appendChild(host);
      }
      bindContainerShield(container);
      bindContainerObserver(container);
      bindVideoEvents(video);
      syncScale();
      syncHtmlClass();
      syncEndingState();
      syncPlaybackUi();
      syncVolumeUi();
      syncDanmakuUi();
      syncRateUi();
      syncTopBar();
      scheduleVideoshotPreload(1200);
      return true;
    }

    function scheduleMountRetry(attempt = 0) {
      clearTimeout(mountRetryTimer);
      mountRetryTimer = null;
      if (!enabled || (host && host.isConnected) || attempt >= 12) return;
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

    function enable({ startNative = false } = {}) {
      if (typeof location !== "undefined" && location?.hostname && location.hostname !== "www.bilibili.com") {
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
        releaseBoost();
      }
      enabled = false;
      nativeBarMode = false;
      hudVisible = false;
      speedDrawerOpen = false;
      volumePopoverOpen = false;
      endingPassthrough = false;
      userMuted = false;
      draggingSeek = false;
      draggingVolume = false;
      activeScrubPointerId = null;
      activeVolPointerId = null;
      activeScrubWrap = null;
      activeScrubContext = null;
      lastDrawnFrameKey = "";
      lastPaintedVideoKey = "";
      hasPaintedScrubFrame = false;
      activePointerId = null;
      gestureMode = "idle";
      clearTimers();
      clearDecodedSheets();
      unbindScrubWindowEvents();
      unbindVolWindowEvents();
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
        els.root.classList.remove("is-hud-open", "is-native-mode", "is-fullscreen", "is-ending-passthrough");
      }
      if (els.unmutePill) els.unmutePill.classList.remove("is-visible");
      if (els.boostChip) els.boostChip.classList.remove("is-visible");
      if (els.miniToast) els.miniToast.classList.remove("is-visible");
      if (els.playFlash) els.playFlash.classList.remove("is-visible");
      if (els.volPopover) els.volPopover.classList.remove("is-open");
      if (els.gestureHud) els.gestureHud.classList.remove("is-visible");
      if (els.scrubPreview) els.scrubPreview.classList.remove("is-visible");
    }

    function updateRate(rate) {
      if (typeof rate !== "number" || !Number.isFinite(rate)) return;
      baseRate = rate;
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
      updateRate,
      setActiveCount,
      isActive: () => enabled,
      isNativeBarMode: () => nativeBarMode,
    };
  }

  root.createBiliTouchPlayer = createBiliTouchPlayer;
})();
