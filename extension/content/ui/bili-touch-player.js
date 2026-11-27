(() => {
  const root = (window.YTSync = window.YTSync || {});
  const DM_STYLE_ID = "yt-sync-bili-dm-style";
  const DM_STORAGE_KEY = "ytSyncBiliDmSettings";
  const VIDEOSHOT_RETRY_COOLDOWN_MS = 15000;
  const MAX_DECODED_SHEETS = 4;

  const DM_SIZE_OPTIONS = [
    { label: "小", value: 0.75 },
    { label: "中", value: 1.0 },
    { label: "大", value: 1.25 },
  ];
  const DM_AREA_OPTIONS = [
    { label: "1/3屏", value: "34" },
    { label: "半屏", value: "50" },
    { label: "防挡", value: "82" },
    { label: "满屏", value: "100" },
  ];
  const DM_OPACITY_OPTIONS = [
    { label: "100%", value: 1.0 },
    { label: "75%", value: 0.75 },
    { label: "50%", value: 0.5 },
    { label: "25%", value: 0.25 },
  ];

  function normalizeThumbUrl(raw, suffix = "@160w_100h_1c.webp") {
    const s = String(raw || "").trim();
    if (!s) return "";
    const httpsUrl = s.startsWith("//")
      ? `https:${s}`
      : s.startsWith("http://")
        ? `https://${s.slice(7)}`
        : s;
    if (!suffix || httpsUrl.includes("@")) return httpsUrl;
    return `${httpsUrl}${suffix}`;
  }

  function getBpxScreenMode() {
    return document.querySelector?.(".bpx-player-container")?.getAttribute?.("data-screen") || "";
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

  function findNativeWebFullscreenButton() {
    return document.querySelector(".bpx-player-ctrl-web, .bpx-player-ctrl-btn.bpx-player-ctrl-web");
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

  function buildBiliGlobalCss({ activeHtmlClass, nativeHtmlClass, webMaxHtmlClass }) {
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
        `html.${activeHtmlClass} #bilibili-player ${sel}`,
        `html.${activeHtmlClass} .bpx-player-container ${sel}`,
      ]);
    return `
      ${toSelectors(softHiddenTargets).join(",\n      ")} {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      ${toSelectors(hardHiddenTargets).join(",\n      ")} {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      html.${nativeHtmlClass} .bpx-player-top-right,
      html.${nativeHtmlClass} .bpx-player-top-wrap {
        padding-right: 78px !important;
        box-sizing: border-box !important;
      }
      html.${webMaxHtmlClass},
      html.${webMaxHtmlClass} body {
        overflow: hidden !important;
      }
      html.${webMaxHtmlClass} #biliMainHeader,
      html.${webMaxHtmlClass} .bili-header,
      html.${webMaxHtmlClass} .international-header,
      html.${webMaxHtmlClass} .fixed-nav,
      html.${webMaxHtmlClass} .bili-mini-header,
      html.${webMaxHtmlClass} .bpx-player-sending-area {
        display: none !important;
      }
      html.${webMaxHtmlClass} #mirror-vdcon,
      html.${webMaxHtmlClass} .left-container,
      html.${webMaxHtmlClass} .left-container-under-player,
      html.${webMaxHtmlClass} #playerWrap,
      html.${webMaxHtmlClass} .player-wrap,
      html.${webMaxHtmlClass} #bilibili-player,
      html.${webMaxHtmlClass} .main-container,
      html.${webMaxHtmlClass} .plp-l {
        transform: none !important;
        filter: none !important;
        contain: none !important;
        perspective: none !important;
        overflow: visible !important;
      }
      html.${webMaxHtmlClass} .bpx-player-container {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 2147483000 !important;
        background: #000000 !important;
      }
      html.${webMaxHtmlClass} .bpx-player-container .bpx-player-primary-area,
      html.${webMaxHtmlClass} .bpx-player-container .bpx-player-video-area,
      html.${webMaxHtmlClass} .bpx-player-container .bpx-player-video-perch,
      html.${webMaxHtmlClass} .bpx-player-container .bpx-player-video-wrap {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        inset: auto !important;
        transform: none !important;
      }
      html.${webMaxHtmlClass} .bpx-player-container .bpx-player-video-wrap video,
      html.${webMaxHtmlClass} .bpx-player-container .bpx-player-video-wrap bwp-video {
        width: 100% !important;
        height: 100% !important;
        left: 0 !important;
        top: 0 !important;
        object-fit: contain !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
  }

  function loadStoredDmSettings() {
    const defaults = { scale: 1.0, area: "100", opacity: 1.0 };
    try {
      if (typeof localStorage === "undefined") return defaults;
      const raw = localStorage.getItem(DM_STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return {
        scale: Number(parsed?.scale) || 1.0,
        area: String(parsed?.area || "100"),
        opacity: Number.isFinite(Number(parsed?.opacity)) ? Number(parsed.opacity) : 1.0,
      };
    } catch {
      return defaults;
    }
  }

  function saveStoredDmSettings(settings) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(DM_STORAGE_KEY, JSON.stringify(settings));
      }
    } catch {}
  }

  function createBiliTouchPlayer({ adapter, engine, onNavigateVideo, onToggleSync } = {}) {
    const touch = root.touch;
    const { ASSETS, UTILS, THEMES, createTouchPlayerShell } = touch;
    const { formatTime, formatQualityShortLabel } = UTILS;

    let webMaximized = false;
    let episodeDrawerOpen = false;
    let dmDrawerOpen = false;
    let dmFallbackEnabled = true;
    let dmSettings = loadStoredDmSettings();

    let currentEpisodeData = null;
    let lastEpisodeRefKey = "";
    let lastEpisodeRenderKey = "";
    let lastActiveEpBtn = null;
    const episodeCache = new Map();
    const episodePending = new Map();

    const videoshotCache = new Map();
    const videoshotPending = new Map();
    const videoshotFailedAt = new Map();
    const decodedShotImages = new Map();
    const loadingShotUrls = new Set();
    const multiSheetTimers = new Set();
    let videoshotPreloadTimer = null;
    let activeScrubContext = null;
    let scrubDrawRafId = null;
    let pendingDrawPayload = null;
    let lastDrawnFrameKey = "";
    let lastPaintedVideoKey = "";
    let hasPaintedScrubFrame = false;
    let screenObserver = null;

    function isDmCustomized() {
      return (
        Math.abs((dmSettings.scale || 1) - 1) > 0.02 ||
        String(dmSettings.area || "100") !== "100" ||
        Math.abs((dmSettings.opacity ?? 1) - 1) > 0.02
      );
    }

    function applyDmSettingsStyle() {
      let style = document.getElementById?.(DM_STYLE_ID) || null;
      if (!style) {
        if (!isDmCustomized() || typeof document?.createElement !== "function") return;
        style = document.createElement("style");
        style.id = DM_STYLE_ID;
        (document.head || document.documentElement)?.appendChild?.(style);
      }
      if (!style) return;
      const areaVal = String(dmSettings.area || "100");
      const scaleVal = Number(dmSettings.scale) || 1.0;
      const opVal = Number.isFinite(Number(dmSettings.opacity)) ? Number(dmSettings.opacity) : 1.0;
      const areaCss =
        areaVal !== "100"
          ? `max-height: ${areaVal}% !important; overflow: hidden !important;`
          : "";
      const fontCss =
        Math.abs(scaleVal - 1.0) > 0.02 ? `zoom: ${scaleVal};` : "";
      style.textContent = `
        .bpx-player-row-dm-wrap,
        .bpx-player-dm-wrap {
          opacity: ${opVal} !important;
          ${areaCss}
        }
        ${fontCss ? `.bili-danmaku-x-dm, .b-danmaku { ${fontCss} }` : ""}
      `;
    }

    function syncDmSettingsUi(api) {
      const els = api.getEls();
      [els.dmSetBtn, els.winDmSetBtn].forEach((btn) => {
        btn?.classList.toggle("is-on", dmDrawerOpen);
      });
      if (!els.dmDrawer) return;
      const btns = els.dmDrawer.querySelectorAll?.(".ytb-dm-opt") || [];
      btns.forEach((btn) => {
        const k = btn.dataset?.dmKey;
        const v = btn.dataset?.dmVal;
        const active =
          (k === "scale" && Math.abs(Number(v) - dmSettings.scale) < 0.02) ||
          (k === "area" && String(v) === String(dmSettings.area)) ||
          (k === "opacity" && Math.abs(Number(v) - dmSettings.opacity) < 0.02);
        btn.classList.toggle("is-active", active);
      });
    }

    function renderDmSettingsDrawer(api) {
      const els = api.getEls();
      if (!els.dmDrawer) return;
      els.dmDrawer.textContent = "";
      const groups = [
        { key: "scale", label: "弹幕字号", options: DM_SIZE_OPTIONS },
        { key: "area", label: "显示区域", options: DM_AREA_OPTIONS },
        { key: "opacity", label: "不透明度", options: DM_OPACITY_OPTIONS },
      ];
      groups.forEach((g) => {
        const row = document.createElement("div");
        row.className = "ytb-dm-row";
        const lbl = document.createElement("div");
        lbl.className = "ytb-dm-label";
        lbl.textContent = g.label;
        const optsWrap = document.createElement("div");
        optsWrap.className = "ytb-dm-opts";
        g.options.forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ytb-dm-opt";
          btn.dataset.dmKey = g.key;
          btn.dataset.dmVal = String(opt.value);
          btn.textContent = opt.label;
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (g.key === "scale") dmSettings.scale = Number(opt.value);
            else if (g.key === "area") dmSettings.area = String(opt.value);
            else if (g.key === "opacity") dmSettings.opacity = Number(opt.value);
            saveStoredDmSettings(dmSettings);
            applyDmSettingsStyle();
            syncDmSettingsUi(api);
            api.showMiniToast(`${g.label}: ${opt.label}`, api.MINI_TOAST_MS);
            api.scheduleHudHide(api.HUD_BAR_HIDE_MS);
          });
          optsWrap.appendChild(btn);
        });
        row.appendChild(lbl);
        row.appendChild(optsWrap);
        els.dmDrawer.appendChild(row);
      });
      syncDmSettingsUi(api);
    }

    function syncNativeDmSettingIcon(api) {
      const els = api.getEls();
      const nativeSvg = document.querySelector?.(".bpx-player-dm-setting svg");
      if (!nativeSvg || typeof nativeSvg.cloneNode !== "function") return;
      const vb = nativeSvg.getAttribute?.("viewBox");
      if (!vb || !String(nativeSvg.innerHTML || "").trim()) return;
      [els.dmSetBtn, els.winDmSetBtn].forEach((btn) => {
        if (!btn || btn.dataset?.nativeDmIcon === "1") return;
        const clone = nativeSvg.cloneNode(true);
        clone.removeAttribute?.("width");
        clone.removeAttribute?.("height");
        clone.setAttribute?.("fill", "currentColor");
        clone.setAttribute?.("aria-hidden", "true");
        clone.querySelectorAll?.("[fill]")?.forEach((node) => {
          const f = String(node.getAttribute?.("fill") || "").trim().toLowerCase();
          if (f && f !== "none" && f !== "currentcolor") {
            node.setAttribute("fill", "currentColor");
          }
        });
        btn.textContent = "";
        btn.appendChild?.(clone);
        if (btn.dataset) btn.dataset.nativeDmIcon = "1";
      });
    }

    function setDmDrawerOpen(open, api) {
      const els = api.getEls();
      dmDrawerOpen = Boolean(open);
      if (dmDrawerOpen) {
        api.setSpeedDrawerOpen(false);
        api.setQualityDrawerOpen(false);
        setEpisodeDrawerOpen(false, api);
      }
      syncDmSettingsUi(api);
      els.dmDrawer?.classList.toggle("is-open", dmDrawerOpen);
      api.scheduleHudHide(api.HUD_BAR_HIDE_MS);
    }

    function getDanmakuState() {
      const cb = findDanmakuCheckbox();
      if (cb && typeof cb.checked === "boolean") {
        dmFallbackEnabled = cb.checked;
        return cb.checked;
      }
      return dmFallbackEnabled;
    }

    function toggleDanmaku(api) {
      const cb = findDanmakuCheckbox();
      if (cb) {
        api.runNativeClick(cb);
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
        const target = api.getCurrentContainer() || document;
        target.dispatchEvent(downEv);
        target.dispatchEvent(upEv);
      }
      syncDanmakuUi(api);
      api.showMiniToast(dmFallbackEnabled ? "弹幕已开" : "弹幕已关", api.MINI_TOAST_MS);
    }

    function syncDanmakuUi(api) {
      const els = api.getEls();
      const on = getDanmakuState();
      const svg = on ? ASSETS.DM_ON_SVG : ASSETS.DM_OFF_SVG;
      const label = on ? "弹幕已开" : "弹幕已关";
      [els.dmBtn, els.winDmBtn].forEach((btn) => {
        if (!btn) return;
        btn.innerHTML = svg;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", String(on));
        btn.setAttribute("aria-label", label);
      });
    }

    function readNativeQualityState({ wakeMenu = false } = {}) {
      if (typeof document?.querySelector !== "function") {
        return { available: false, currentLabel: "", shortLabel: "画质", items: [] };
      }
      const ctrl = document.querySelector(".bpx-player-ctrl-quality");
      const resultEl = document.querySelector(".bpx-player-ctrl-quality-result");
      let itemEls = Array.from(document.querySelectorAll?.(".bpx-player-ctrl-quality-menu-item") || []);
      if (wakeMenu && itemEls.length === 0 && ctrl && typeof ctrl.dispatchEvent === "function") {
        try {
          const EvCtor = typeof MouseEvent === "function" ? MouseEvent : Event;
          ctrl.dispatchEvent(new EvCtor("mouseenter", { bubbles: true }));
        } catch {}
        itemEls = Array.from(document.querySelectorAll?.(".bpx-player-ctrl-quality-menu-item") || []);
      }

      const items = itemEls
        .map((el) => {
          const badgeEl = el.querySelector?.(
            ".bpx-player-ctrl-quality-badge, .bpx-player-ctrl-quality-badge-bigvip, .bpx-player-ctrl-quality-badge-login"
          );
          const badge = (badgeEl?.textContent || "").trim();
          const textEl = el.querySelector?.(".bpx-player-ctrl-quality-text");
          let rawText = (textEl?.textContent || el.textContent || "").replace(/\s+/g, " ").trim();
          if (!textEl && badge && rawText.endsWith(badge)) {
            rawText = rawText.slice(0, rawText.length - badge.length).trim();
          } else if (!textEl && badge && rawText.startsWith(badge)) {
            rawText = rawText.slice(badge.length).trim();
          }
          const isActive = Boolean(el.classList?.contains("bpx-state-active"));
          const value = el.getAttribute?.("data-value") || "";
          return {
            el,
            rawText: rawText || "画质",
            shortLabel: formatQualityShortLabel(rawText),
            badge,
            isActive,
            value,
          };
        })
        .filter((x) => x.rawText);

      const activeItem = items.find((x) => x.isActive) || null;
      const rawResult = (resultEl?.textContent || "").replace(/\s+/g, " ").trim();
      const currentLabel = rawResult || activeItem?.rawText || "";
      return {
        available: Boolean(ctrl || items.length > 0),
        currentLabel,
        shortLabel: formatQualityShortLabel(currentLabel),
        items,
      };
    }

    function syncQualityUi(api) {
      const els = api.getEls();
      const state = readNativeQualityState({ wakeMenu: false });
      [els.qualityBtn, els.winQualityBtn].forEach((btn) => {
        if (!btn) return;
        btn.classList.toggle("is-hidden", !state.available);
        btn.textContent = state.shortLabel || "画质";
      });
    }

    function renderQualityDrawer(api) {
      const els = api.getEls();
      if (!els.qualityDrawer) return;
      const state = readNativeQualityState({ wakeMenu: true });
      els.qualityDrawer.textContent = "";
      if (!state.items.length) {
        const empty = document.createElement("div");
        empty.className = "ytb-quality-opt is-empty";
        empty.textContent = "暂无可选画质";
        els.qualityDrawer.appendChild(empty);
        return;
      }
      state.items.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `ytb-quality-opt${item.isActive ? " is-active" : ""}`;
        const labelSpan = document.createElement("span");
        labelSpan.className = "ytb-quality-label";
        labelSpan.textContent = item.rawText;
        btn.appendChild(labelSpan);
        if (item.badge) {
          const badgeSpan = document.createElement("span");
          badgeSpan.className = "ytb-quality-badge";
          badgeSpan.textContent = item.badge;
          btn.appendChild(badgeSpan);
        }
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          api.runNativeClick(item.el);
          api.setQualityDrawerOpen(false);
          api.scheduleHudHide(api.HUD_BAR_HIDE_MS);
          api.showMiniToast(`画质 ${item.shortLabel}`, api.MINI_TOAST_MS);
          api.scheduleQualitySync(() => syncQualityUi(api), 160);
        });
        els.qualityDrawer.appendChild(btn);
      });
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

    function preloadShotSheet(url, onReady, api) {
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
        if (!shell.isActive()) {
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
          const curApi = api || shell;
          if (curApi.isActive() && activeScrubContext && (curApi.isDraggingSeek() || curApi.getGestureMode() === "seek")) {
            curApi.renderScrubPreview(activeScrubContext);
          }
        }
      };
      img.onerror = () => {
        loadingShotUrls.delete(url);
      };
      img.src = url;
    }

    function preloadAllShotSheets(images, api) {
      if (!Array.isArray(images) || images.length === 0) return;
      const limit = Math.min(images.length, MAX_DECODED_SHEETS);
      const loadAt = (idx) => {
        if (!shell.isActive() || idx >= limit) return;
        preloadShotSheet(
          images[idx],
          () => {
            if (!shell.isActive() || idx + 1 >= limit) return;
            const timer = setTimeout(() => {
              multiSheetTimers.delete(timer);
              loadAt(idx + 1);
            }, 400);
            multiSheetTimers.add(timer);
          },
          api
        );
      };
      loadAt(0);
    }

    function scheduleVideoshotPreload(delayMs = 1200, api) {
      if (!shell.isActive()) return;
      const ref = parseBiliVideoRef();
      if (!ref) return;
      if (videoshotCache.has(ref.key)) {
        const cached = videoshotCache.get(ref.key);
        if (cached?.images?.length) preloadAllShotSheets(cached.images, api);
        return;
      }
      if (videoshotPending.has(ref.key) || videoshotPreloadTimer) return;
      videoshotPreloadTimer = setTimeout(() => {
        videoshotPreloadTimer = null;
        if (shell.isActive()) ensureVideoshotLoaded(api);
      }, delayMs);
    }

    function ensureVideoshotLoaded(api) {
      const ref = parseBiliVideoRef();
      if (!ref || typeof fetch !== "function") return null;
      if (videoshotCache.has(ref.key)) {
        const cached = videoshotCache.get(ref.key);
        if (cached?.images?.length) preloadAllShotSheets(cached.images, api);
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
          preloadAllShotSheets(parsed.images, api);
          const curApi = api || shell;
          if (curApi.isActive() && activeScrubContext && (curApi.isDraggingSeek() || curApi.getGestureMode() === "seek")) {
            curApi.renderScrubPreview(activeScrubContext);
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

    function paintCanvasNow(sheetSource, frame, frameKey, els) {
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

    function drawScrubCanvasFrame(sheetSource, frame, frameKey, els) {
      if (!els.scrubCanvas || !sheetSource || !frame) return;
      if (lastDrawnFrameKey === frameKey && hasPaintedScrubFrame) return;
      pendingDrawPayload = { img: sheetSource, frame, frameKey, els };
      if (typeof requestAnimationFrame !== "function") {
        const payload = pendingDrawPayload;
        pendingDrawPayload = null;
        paintCanvasNow(payload.img, payload.frame, payload.frameKey, payload.els);
        return;
      }
      if (scrubDrawRafId !== null) return;
      scrubDrawRafId = requestAnimationFrame(() => {
        scrubDrawRafId = null;
        const payload = pendingDrawPayload;
        pendingDrawPayload = null;
        if (payload) {
          paintCanvasNow(payload.img, payload.frame, payload.frameKey, payload.els);
        }
      });
    }

    function resolveCurrentEpisodeIndex(epData, ref) {
      if (!epData || !Array.isArray(epData.items) || epData.items.length === 0 || !ref) return -1;
      if (epData.kind === "bangumi") {
        if (ref.epId) {
          const i = epData.items.findIndex((item) => String(item.epId) === String(ref.epId));
          if (i >= 0) return i;
        }
        return 0;
      }
      if (epData.kind === "pages") {
        const i = epData.items.findIndex((item) => item.page === (ref.pageNum || 1));
        return i >= 0 ? i : 0;
      }
      if (epData.kind === "season") {
        if (ref.bvid) {
          const targetBv = ref.bvid.toLowerCase();
          const i = epData.items.findIndex((item) => String(item.bvid || "").toLowerCase() === targetBv);
          if (i >= 0) return i;
        }
        if (ref.aid) {
          const targetAid = String(ref.aid);
          const i = epData.items.findIndex((item) => String(item.aid || "") === targetAid);
          if (i >= 0) return i;
        }
        return 0;
      }
      return -1;
    }

    function switchToEpisode(item, api) {
      if (!item || !item.videoId) return;
      if (adapter?.getVideoId?.() === item.videoId) {
        setEpisodeDrawerOpen(false, api);
        return;
      }
      setEpisodeDrawerOpen(false, api);
      api.wakeHud(api.HUD_BAR_HIDE_MS);
      api.showMiniToast(`切换至 ${item.shortLabel || item.title || "下一集"}`, 1200);
      if (typeof onNavigateVideo === "function") {
        onNavigateVideo(item.videoId, item.title || "");
      } else {
        adapter?.navigateTo?.(item.videoId);
      }
    }

    function scrollActiveEpisodeIntoView(api) {
      const list = api.getEls().epList;
      if (!list) return;
      const active = lastActiveEpBtn || list.querySelector?.(".ytb-ep-item.is-active");
      if (!active) return;
      const listH = Number(list.clientHeight) || 0;
      if (listH <= 0) return;
      const btnTop = Number(active.offsetTop) || 0;
      const btnH = Number(active.offsetHeight) || 0;
      list.scrollTop = Math.max(0, btnTop - Math.max(0, (listH - btnH) / 2));
    }

    function renderEpisodeDrawer(api) {
      const els = api.getEls();
      if (!els.epList) return;
      const ref = parseBiliVideoRef();
      const epData = currentEpisodeData;
      const items = Array.isArray(epData?.items) ? epData.items : [];
      const curIdx = resolveCurrentEpisodeIndex(epData, ref);

      if (els.epDrawerTitle) {
        els.epDrawerTitle.textContent =
          epData?.kind === "bangumi" ? "选集（番剧）" : epData?.kind === "pages" ? "分P列表" : "合集选集";
      }
      if (els.epDrawerSub) {
        els.epDrawerSub.textContent = items.length > 1 && curIdx >= 0 ? `${curIdx + 1}/${items.length}` : "";
      }

      const isGrid = epData?.layout === "grid";
      const renderKey = `${epData?.kind || "none"}|${epData?.layout || ""}|${curIdx}|${items.length}|${items[0]?.videoId || ""}|${items[items.length - 1]?.videoId || ""}`;
      if (renderKey === lastEpisodeRenderKey && els.epList.children.length === items.length) {
        return;
      }

      els.epList.classList.toggle("is-grid", Boolean(isGrid));
      els.epList.textContent = "";

      let activeBtn = null;
      items.forEach((item, idx) => {
        const isActive = idx === curIdx;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `ytb-ep-item ${isGrid ? "ytb-ep-grid-item" : "ytb-ep-list-item"}${isActive ? " is-active" : ""}`;
        btn.dataset.epIndex = String(idx);
        if (isGrid) {
          const numSpan = document.createElement("span");
          numSpan.textContent = item.short || String(idx + 1);
          btn.appendChild(numSpan);
          if (item.badge) {
            const badgeEl = document.createElement("span");
            badgeEl.className = "ytb-ep-badge";
            badgeEl.textContent = item.badge;
            btn.appendChild(badgeEl);
          }
        } else {
          if (item.pic) {
            const thumb = document.createElement("img");
            thumb.className = "ytb-ep-thumb";
            thumb.src = item.pic;
            thumb.alt = "";
            thumb.loading = "lazy";
            thumb.referrerPolicy = "no-referrer";
            thumb.addEventListener?.("error", () => {
              thumb.style.display = "none";
            });
            btn.appendChild(thumb);
          }
          const body = document.createElement("div");
          body.className = "ytb-ep-list-body";
          const topRow = document.createElement("div");
          topRow.className = "ytb-ep-list-top";
          const labelSpan = document.createElement("span");
          labelSpan.textContent = `${item.shortLabel || `P${idx + 1}`}${isActive ? " · 播放中" : ""}`;
          const durSpan = document.createElement("span");
          durSpan.textContent = item.duration > 0 ? formatTime(item.duration) : "";
          topRow.appendChild(labelSpan);
          topRow.appendChild(durSpan);

          const titleEl = document.createElement("div");
          titleEl.className = "ytb-ep-list-title";
          titleEl.textContent = item.title || item.shortLabel || `第 ${idx + 1} 集`;
          body.appendChild(topRow);
          body.appendChild(titleEl);
          btn.appendChild(body);
        }
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          switchToEpisode(item, api);
        });
        if (isActive) activeBtn = btn;
        els.epList.appendChild(btn);
      });

      lastEpisodeRenderKey = renderKey;
      lastActiveEpBtn = activeBtn;
    }

    function syncEpisodeUi(api) {
      const els = api.getEls();
      const ref = parseBiliVideoRef();
      const epData = currentEpisodeData;
      const items = Array.isArray(epData?.items) ? epData.items : [];
      const curIdx = resolveCurrentEpisodeIndex(epData, ref);
      const hasMulti = items.length > 1 && curIdx >= 0;
      const hasPrev = hasMulti && curIdx > 0;
      const hasNext = hasMulti && curIdx < items.length - 1;

      els.prevBtn?.classList.toggle("is-hidden", !hasPrev);
      els.nextBtn?.classList.toggle("is-hidden", !hasNext);
      els.epBtn?.classList.toggle("is-hidden", !hasMulti);
      els.winEpBtn?.classList.toggle("is-hidden", !hasMulti);

      if (!hasMulti && episodeDrawerOpen) {
        setEpisodeDrawerOpen(false, api);
      }
      renderEpisodeDrawer(api);
    }

    function setEpisodeDrawerOpen(open, api) {
      const els = api.getEls();
      episodeDrawerOpen = Boolean(open);
      if (episodeDrawerOpen) {
        api.setSpeedDrawerOpen(false);
        api.setQualityDrawerOpen(false);
        dmDrawerOpen = false;
        els.dmDrawer?.classList.remove("is-open");
        syncDmSettingsUi(api);
      }
      els.epDrawer?.classList.toggle("is-open", episodeDrawerOpen);
      els.root?.classList.toggle("is-ep-open", episodeDrawerOpen);
      if (episodeDrawerOpen) {
        renderEpisodeDrawer(api);
        scrollActiveEpisodeIntoView(api);
      }
      api.scheduleHudHide(api.HUD_BAR_HIDE_MS);
    }

    function ensureEpisodeDataLoaded(api) {
      const ref = parseBiliVideoRef();
      if (!ref || typeof fetch !== "function") {
        currentEpisodeData = null;
        syncEpisodeUi(api);
        return null;
      }
      if (episodeCache.has(ref.key)) {
        currentEpisodeData = episodeCache.get(ref.key);
        syncEpisodeUi(api);
        return Promise.resolve(currentEpisodeData);
      }
      if (episodePending.has(ref.key)) return episodePending.get(ref.key);

      const promise = (async () => {
        try {
          let parsed = null;
          if (ref.kind === "bangumi") {
            const pgcQuery = ref.epId
              ? `ep_id=${encodeURIComponent(ref.epId)}`
              : `season_id=${encodeURIComponent(ref.seasonId)}`;
            const json = await fetchJsonWithFallback(
              `https://api.bilibili.com/pgc/view/web/season?${pgcQuery}`
            );
            const episodes = Array.isArray(json?.result?.episodes) ? json.result.episodes : [];
            if (episodes.length > 1) {
              parsed = {
                kind: "bangumi",
                layout: "grid",
                items: episodes.map((ep, i) => ({
                  epId: ep?.id ? String(ep.id) : null,
                  bvid: ep?.bvid || null,
                  short: String(ep?.title || i + 1),
                  shortLabel: `第${ep?.title || i + 1}话`,
                  title: ep?.long_title || ep?.share_copy || `第${ep?.title || i + 1}话`,
                  badge: ep?.badge || "",
                  duration: Math.round((Number(ep?.duration) || 0) / 1000),
                  videoId: ep?.id ? `bili:bangumi/play/ep${ep.id}` : null,
                })).filter((x) => x.videoId),
              };
            }
          } else if (ref.bvid || ref.aid) {
            const idQuery = ref.bvid
              ? `bvid=${encodeURIComponent(ref.bvid)}`
              : `aid=${encodeURIComponent(ref.aid)}`;
            const json = await fetchJsonWithFallback(
              `https://api.bilibili.com/x/web-interface/view?${idQuery}`
            );
            const data = json?.code === 0 ? json?.data : null;
            if (data) {
              const ownerBvid = data.bvid || ref.bvid || `av${data.aid || ref.aid}`;
              if (Array.isArray(data.pages) && data.pages.length > 1) {
                parsed = {
                  kind: "pages",
                  layout: "list",
                  items: data.pages.map((p, i) => {
                    const page = Number(p?.page) || i + 1;
                    return {
                      bvid: ownerBvid,
                      cid: p?.cid || null,
                      page,
                      short: `P${page}`,
                      shortLabel: `P${page}`,
                      title: p?.part || `P${page}`,
                      pic: normalizeThumbUrl(p?.first_frame || ""),
                      duration: Number(p?.duration) || 0,
                      videoId: page > 1 ? `bili:video/${ownerBvid}?p=${page}` : `bili:video/${ownerBvid}`,
                    };
                  }),
                };
              } else if (Array.isArray(data.ugc_season?.sections) && data.ugc_season.sections.length > 0) {
                const flatEps = [];
                data.ugc_season.sections.forEach((sec) => {
                  if (Array.isArray(sec?.episodes)) flatEps.push(...sec.episodes);
                });
                if (flatEps.length > 1) {
                  parsed = {
                    kind: "season",
                    layout: "list",
                    items: flatEps
                      .map((ep, i) => {
                        const epBvid = ep?.bvid || ep?.arc?.bvid || "";
                        const epAid = ep?.aid || ep?.arc?.aid || "";
                        const epKeyId = epBvid || (epAid ? `av${epAid}` : "");
                        if (!epKeyId) return null;
                        return {
                          bvid: epBvid || null,
                          aid: epAid ? String(epAid) : null,
                          short: `${i + 1}`,
                          shortLabel: `第${i + 1}集`,
                          title: ep.title || ep.arc?.title || `第${i + 1}集`,
                          pic: normalizeThumbUrl(ep.arc?.pic || ep.pic || ""),
                          duration: Number(ep.arc?.duration) || Number(ep.page?.duration) || 0,
                          videoId: `bili:video/${epKeyId}`,
                        };
                      })
                      .filter(Boolean),
                  };
                }
              }
            }
          }

          if (!parsed) {
            parsed = { kind: "single", layout: "list", items: [] };
          }
          episodeCache.set(ref.key, parsed);
          if (parsed.items.length > 1) {
            parsed.items.forEach((item) => {
              if (parsed.kind === "bangumi" && item.epId) {
                episodeCache.set(`ep${item.epId}`, parsed);
              } else if (parsed.kind === "pages" && item.bvid) {
                episodeCache.set(`${item.bvid}?p=${item.page}`, parsed);
              } else if (parsed.kind === "season" && item.bvid) {
                episodeCache.set(`${item.bvid}?p=1`, parsed);
              }
            });
          }
          if (api.isActive() && parseBiliVideoRef()?.key === ref.key) {
            currentEpisodeData = parsed;
            lastEpisodeRenderKey = "";
            syncEpisodeUi(api);
          }
          return parsed;
        } catch {
          return null;
        } finally {
          episodePending.delete(ref.key);
        }
      })();

      episodePending.set(ref.key, promise);
      return promise;
    }

    const shell = createTouchPlayerShell({
      adapter,
      engine,
      onToggleSync,
      hostId: "yt-sync-bili-touch-host",
      styleId: "yt-sync-bili-touch-style",
      activeHtmlClass: "yt-sync-bili-touch-active",
      nativeHtmlClass: "yt-sync-bili-native-mode",
      webMaxHtmlClass: "yt-sync-bili-web-max",
      allowedHosts: ["www.bilibili.com"],
      theme: THEMES.bilibili,
      hostZIndex: 1005,
      scrubThumbHtml: '<canvas id="ytbScrubCanvas" class="ytb-scrub-canvas" width="320" height="180"></canvas>',
      winTopExtraHtml: `
        <button id="ytbWinEpBtn" class="ytb-ghost-btn is-hidden" type="button">选集</button>
        <button id="ytbWinDmBtn" class="ytb-icon-btn ytb-btn-dm ytb-btn-dm-win" type="button" aria-label="弹幕开关">${ASSETS.DM_ON_SVG}</button>
        <button id="ytbWinDmSetBtn" class="ytb-icon-btn ytb-btn-dm-set ytb-btn-dm-win" type="button" aria-label="弹幕设置">${ASSETS.DM_SET_SVG}</button>
      `,
      fsLeftExtraHtml: `
        <button id="ytbPrevBtn" class="ytb-icon-btn ytb-btn-prev is-hidden" type="button" aria-label="上一集">${ASSETS.PREV_SVG}</button>
        <button id="ytbPlayBtn" class="ytb-icon-btn ytb-btn-play" type="button" aria-label="播放">${ASSETS.PLAY_SVG}</button>
        <button id="ytbNextBtn" class="ytb-icon-btn ytb-btn-next is-hidden" type="button" aria-label="下一集">${ASSETS.NEXT_SVG}</button>
        <button id="ytbDmBtn" class="ytb-icon-btn ytb-btn-dm" type="button" aria-label="弹幕开关">${ASSETS.DM_ON_SVG}</button>
        <button id="ytbDmSetBtn" class="ytb-icon-btn ytb-btn-dm-set" type="button" aria-label="弹幕设置">${ASSETS.DM_SET_SVG}</button>
      `,
      fsRightExtraHtml: '<button id="ytbEpBtn" class="ytb-icon-btn ytb-btn-ep is-hidden" type="button">选集</button>',
      extraDrawersHtml: `
        <div id="ytbDmDrawer" class="ytb-dm-drawer"></div>
        <div id="ytbEpDrawer" class="ytb-ep-drawer">
          <div class="ytb-ep-header">
            <span id="ytbEpDrawerTitle" class="ytb-ep-drawer-title">选集</span>
            <span id="ytbEpDrawerSub" class="ytb-ep-drawer-sub"></span>
          </div>
          <div id="ytbEpList" class="ytb-ep-scroll"></div>
        </div>
      `,
      includeBiliExtras: true,
      buildGlobalCss: buildBiliGlobalCss,
      findContainer: findPlayerContainer,
      getVolSplitRatio: () => 0.5,
      isEndingTarget: (target) =>
        Boolean(target?.closest?.(".bpx-player-ending-wrap, .bpx-player-ending-panel")),
      checkPassthrough: ({ video }) => {
        if (video?.ended) return true;
        const endingEl = document.querySelector?.(".bpx-player-ending-wrap");
        if (endingEl && typeof getComputedStyle === "function") {
          const cs = getComputedStyle(endingEl);
          if (cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity || 0) > 0.05) {
            return true;
          }
        }
        return false;
      },
      fullscreenConfig: {
        isWebMax: () => webMaximized || getBpxScreenMode() === "web",
        isExtraSystemFull: () => getBpxScreenMode() === "full",
        enterWebMax: () => {
          webMaximized = true;
          return true;
        },
        exitWebMax: () => {
          webMaximized = false;
          if (getBpxScreenMode() === "web") {
            const webBtn = findNativeWebFullscreenButton();
            if (webBtn && typeof webBtn.click === "function") {
              shell.runNativeClick(webBtn);
            }
          }
        },
        exitNativeFallback: () => {
          const fullBtn = findNativeFullscreenButton();
          if (fullBtn && typeof fullBtn.click === "function") {
            shell.runNativeClick(fullBtn);
            return true;
          }
          return false;
        },
        enterDomFallback: () => {
          const fullBtn = findNativeFullscreenButton();
          if (fullBtn && typeof fullBtn.click === "function") {
            shell.runNativeClick(fullBtn);
            return;
          }
          const container = shell.getCurrentContainer();
          const target =
            document.querySelector(".bpx-player-container") ||
            container?.closest?.(".bpx-player-container") ||
            document.querySelector("#bilibili-player") ||
            container ||
            adapter?.getVideoElement?.() ||
            document.documentElement;
          try {
            (target?.requestFullscreen || target?.webkitRequestFullscreen)?.call(target)?.catch?.(() => {});
          } catch {}
        },
      },
      onBindContainerExtra: (container, api) => {
        if (screenObserver) {
          screenObserver.disconnect();
          screenObserver = null;
        }
        const bpxContainer =
          container?.closest?.(".bpx-player-container") ||
          document.querySelector?.(".bpx-player-container") ||
          null;
        if (bpxContainer && typeof MutationObserver === "function") {
          let lastScreen = bpxContainer.getAttribute?.("data-screen") || "";
          screenObserver = new MutationObserver(() => {
            const nextScreen = bpxContainer.getAttribute?.("data-screen") || "";
            if (nextScreen !== lastScreen) {
              lastScreen = nextScreen;
              api.triggerFullscreenChange();
            }
          });
          screenObserver.observe(bpxContainer, {
            attributes: true,
            attributeFilter: ["data-screen"],
          });
        }
      },
      onUnbindContainerExtra: () => {
        if (screenObserver) {
          screenObserver.disconnect();
          screenObserver = null;
        }
      },
      onBindShadowControls: (api) => {
        const els = api.getEls();
        const shadow = api.getShadow();
        [
          ["winEpBtn", "ytbWinEpBtn"],
          ["winDmBtn", "ytbWinDmBtn"],
          ["winDmSetBtn", "ytbWinDmSetBtn"],
          ["prevBtn", "ytbPrevBtn"],
          ["nextBtn", "ytbNextBtn"],
          ["dmBtn", "ytbDmBtn"],
          ["dmSetBtn", "ytbDmSetBtn"],
          ["epBtn", "ytbEpBtn"],
          ["dmDrawer", "ytbDmDrawer"],
          ["epDrawer", "ytbEpDrawer"],
          ["epDrawerTitle", "ytbEpDrawerTitle"],
          ["epDrawerSub", "ytbEpDrawerSub"],
          ["epList", "ytbEpList"],
        ].forEach(([k, id]) => {
          els[k] = shadow.getElementById(id);
        });

        renderDmSettingsDrawer(api);
        applyDmSettingsStyle();
        syncNativeDmSettingIcon(api);

        [els.dmBtn, els.winDmBtn].forEach((btn) => {
          btn?.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleDanmaku(api);
            api.wakeHud(api.HUD_BAR_HIDE_MS);
          });
        });

        [els.dmSetBtn, els.winDmSetBtn].forEach((btn) => {
          btn?.addEventListener("click", (e) => {
            e.stopPropagation();
            if (api.isScreenLocked()) {
              api.wakeLockBtn(api.LOCK_AWAKE_MS);
              return;
            }
            if (!api.isHudVisible()) api.wakeHud(api.HUD_BAR_HIDE_MS);
            setDmDrawerOpen(!dmDrawerOpen, api);
          });
        });

        els.prevBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          const ref = parseBiliVideoRef();
          const items = Array.isArray(currentEpisodeData?.items) ? currentEpisodeData.items : [];
          const curIdx = resolveCurrentEpisodeIndex(currentEpisodeData, ref);
          if (curIdx > 0) switchToEpisode(items[curIdx - 1], api);
        });
        els.nextBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          const ref = parseBiliVideoRef();
          const items = Array.isArray(currentEpisodeData?.items) ? currentEpisodeData.items : [];
          const curIdx = resolveCurrentEpisodeIndex(currentEpisodeData, ref);
          if (curIdx >= 0 && curIdx < items.length - 1) switchToEpisode(items[curIdx + 1], api);
        });

        [els.epBtn, els.winEpBtn].forEach((btn) => {
          btn?.addEventListener("click", (e) => {
            e.stopPropagation();
            if (api.isScreenLocked()) {
              api.wakeLockBtn(api.LOCK_AWAKE_MS);
              return;
            }
            if (!api.isHudVisible()) api.wakeHud(api.HUD_BAR_HIDE_MS);
            setEpisodeDrawerOpen(!episodeDrawerOpen, api);
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
            api.setQualityDrawerOpen(!isOpen, () => renderQualityDrawer(api));
          });
        });
      },
      onHideDrawers: (except) => {
        const els = shell.getEls();
        if (except !== "episode") {
          episodeDrawerOpen = false;
          els.epDrawer?.classList.remove("is-open");
          els.root?.classList.remove("is-ep-open");
        }
        if (except !== "dm") {
          dmDrawerOpen = false;
          els.dmDrawer?.classList.remove("is-open");
          syncDmSettingsUi(shell);
        }
      },
      hasOpenExtraDrawers: () => Boolean(episodeDrawerOpen || dmDrawerOpen),
      onScrubStart: (api) => {
        ensureVideoshotLoaded(api);
      },
      onRenderScrub: (ctx, api) => {
        activeScrubContext = ctx;
        const els = api.getEls();
        const { mode, previewSec, durSec, ratio, wrapEl } = ctx;
        const isTrack = mode === "track";

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
          drawScrubCanvasFrame(decodedImg, frame, frameKey, els);
          hasPaintedScrubFrame = true;
          thumbShown = true;
          els.scrubPreview?.classList.add("has-thumb");
        } else if (frame && hasPaintedScrubFrame) {
          preloadShotSheet(frame.imageUrl, null, api);
          thumbShown = true;
          els.scrubPreview?.classList.add("has-thumb");
        } else {
          if (frame) preloadShotSheet(frame.imageUrl, null, api);
          els.scrubPreview?.classList.remove("has-thumb");
        }

        if (isTrack && els.scrubPreview) {
          const rootRect = els.root?.getBoundingClientRect?.();
          const wrapRect = wrapEl?.getBoundingClientRect?.();
          const host = api.getHost();
          const scale = Number(host?.style?.getPropertyValue?.("--ytb-s")) || 1;
          const baseWidth = thumbShown ? (api.isFullscreenNow() ? 160 : 128) : 96;
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
        }
        return thumbShown;
      },
      onHideScrub: () => {
        activeScrubContext = null;
        hasPaintedScrubFrame = false;
        lastDrawnFrameKey = "";
      },
      onLoadedMetadata: (api) => {
        scheduleVideoshotPreload(1200, api);
      },
      onRefreshContext: (api) => {
        const ref = parseBiliVideoRef();
        const nextKey = ref?.key || "";
        if (nextKey !== lastEpisodeRefKey) {
          api.clearLockedBoostSpeed({ restore: false });
          lastEpisodeRefKey = nextKey;
          lastEpisodeRenderKey = "";
          currentEpisodeData = episodeCache.get(nextKey) || null;
          syncEpisodeUi(api);
          ensureEpisodeDataLoaded(api);
          scheduleVideoshotPreload(1200, api);
        } else {
          syncEpisodeUi(api);
        }
        syncDanmakuUi(api);
        syncQualityUi(api);
      },
      onWakeHud: (api) => {
        syncDanmakuUi(api);
        syncQualityUi(api);
      },
      onFullscreenSync: (api) => {
        syncQualityUi(api);
      },
      onDisable: () => {
        webMaximized = false;
        episodeDrawerOpen = false;
        dmDrawerOpen = false;
        activeScrubContext = null;
        lastDrawnFrameKey = "";
        lastPaintedVideoKey = "";
        hasPaintedScrubFrame = false;
        lastEpisodeRefKey = "";
        lastEpisodeRenderKey = "";
        lastActiveEpBtn = null;
        currentEpisodeData = null;
        clearTimeout(videoshotPreloadTimer);
        videoshotPreloadTimer = null;
        multiSheetTimers.forEach((t) => clearTimeout(t));
        multiSheetTimers.clear();
        if (scrubDrawRafId !== null && typeof cancelAnimationFrame === "function") {
          cancelAnimationFrame(scrubDrawRafId);
        }
        scrubDrawRafId = null;
        pendingDrawPayload = null;
        clearDecodedSheets();
      },
    });

    return shell;
  }

  root.createBiliTouchPlayer = createBiliTouchPlayer;
})();
