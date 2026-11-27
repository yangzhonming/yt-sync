(() => {
  const root = (window.YTSync = window.YTSync || {});

  const RATE_OPTIONS = [2.0, 1.5, 1.25, 1.0, 0.75, 0.5];
  const HUD_QUICK_HIDE_MS = 1000;
  const HUD_BAR_HIDE_MS = 2000;
  const RETURN_PILL_HIDE_MS = 2400;
  const LOCK_AWAKE_MS = 1400;
  const BOOST_LOCKED_FADE_MS = 2500;
  const VIDEOSHOT_RETRY_COOLDOWN_MS = 15000;
  const MAX_DECODED_SHEETS = 4;
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

  const HOST_ID = "yt-sync-bili-touch-host";
  const STYLE_ID = "yt-sync-bili-touch-style";
  const ACTIVE_HTML_CLASS = "yt-sync-bili-touch-active";
  const NATIVE_HTML_CLASS = "yt-sync-bili-native-mode";
  const CUSTOM_THUMB_DATA_URI =
    "data:image/png;base64,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";

  // Authentic SVG icons reused from Bilibili Web player (.bpx-player-ctrl-* & .bui-danmaku-switch-*)
  const PLAY_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true"><g transform="translate(14.6 14)"><path d="M-7.031-10.875c0 0-1.297-.375-2.391.406-.688.562-.578 2.477-.578 2.477V8.016s-.125 2.226 1 2.976c1.125.75 4-.961 4-.961L7.969 1.875S9 1.062 9 0s-1.031-1.938-1.031-1.938L-7.031-10.875z"/></g></svg>';
  const PAUSE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true"><g transform="translate(14 14)"><path d="M-5.484-10C-7.953-10-8-7.984-8-7.984l-.008 15.968S-7.984 9.992-5.5 9.992c2.484 0 2.496-1.996 2.496-1.996L-2.984-8S-3.015-10-5.484-10z"/></g><g transform="translate(24.812 14)"><path d="M-5.484-10C-7.953-10-8-7.984-8-7.984l-.008 15.968S-7.984 9.992-5.5 9.992c2.484 0 2.496-1.996 2.496-1.996L-2.984-8S-3.015-10-5.484-10z"/></g></svg>';
  const NEXT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true"><path d="M16 5a1 1 0 0 0-1 1v4.615a1.431 1.431 0 0 0-.615-.829L7.21 5.23A1.439 1.439 0 0 0 5 6.445v9.11a1.44 1.44 0 0 0 2.21 1.215l7.175-4.555a1.436 1.436 0 0 0 .616-.828V16a1 1 0 0 0 2 0V6c0-.552-.448-1-1-1z"/></svg>';
  const PREV_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true"><g transform="translate(22 0) scale(-1 1)"><path d="M16 5a1 1 0 0 0-1 1v4.615a1.431 1.431 0 0 0-.615-.829L7.21 5.23A1.439 1.439 0 0 0 5 6.445v9.11a1.44 1.44 0 0 0 2.21 1.215l7.175-4.555a1.436 1.436 0 0 0 .616-.828V16a1 1 0 0 0 2 0V6c0-.552-.448-1-1-1z"/></g></svg>';
  const BACK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  const FULL_ENTER_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  const FULL_EXIT_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
  const VOL_ON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88" fill="currentColor" aria-hidden="true"><g transform="translate(44 44)"><path d="M-.44-25.096c.29.36.44.8.44 1.25v47.68c0 1.1-.9 2-2 2-.45 0-.89-.16-1.25-.44l-16.75-13.4h-4c-4.42 0-8-3.58-8-8v-8c0-4.42 3.58-8 8-8h4l16.75-13.4c.86-.69 2.12-.55 2.81.31zM13.778-28.896C24.818-23.616 31.998-12.456 31.998-.006c0 12.46-7.19 23.63-18.25 28.9-1.99.95-4.38.11-5.33-1.89-.95-1.99-.1-4.38 1.89-5.33 8.3-3.95 13.69-12.33 13.69-21.68 0-9.34-5.38-17.71-13.66-21.67-2-.95-2.84-3.34-1.89-5.33.95-2 3.34-2.84 5.33-1.89zM8-13.866c4.78 2.77 8 7.94 8 13.86s-3.22 11.09-8 13.86v-27.72z"/></g></svg>';
  const VOL_MUTE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88" fill="currentColor" aria-hidden="true"><g transform="translate(44 44)"><path d="M-.44-25.096c.29.36.44.8.44 1.25v47.68c0 1.1-.9 2-2 2-.45 0-.89-.16-1.25-.44l-16.75-13.4h-4c-4.42 0-8-3.58-8-8v-8c0-4.42 3.58-8 8-8h4l16.75-13.4c.86-.69 2.12-.55 2.81.31z" opacity="0.72"/><path d="M-33.94-28.28a4 4 0 0 1 5.66-5.66l62.22 62.22a4 4 0 0 1-5.66 5.66L-33.94-28.28z" fill="#fb7299"/></g></svg>';
  const DM_ON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.989 4.828c-.47 0-.975.004-1.515.012l-1.71-2.566a1.008 1.008 0 0 0-1.678 1.118l.999 1.5c-.681.018-1.403.04-2.164.068a4.013 4.013 0 0 0-3.83 3.44c-.165 1.15-.245 2.545-.245 4.185 0 1.965.115 3.67.35 5.116a4.012 4.012 0 0 0 3.763 3.363l.906.046c1.205.063 1.808.095 3.607.095a.988.988 0 0 0 0-1.975c-1.758 0-2.339-.03-3.501-.092l-.915-.047a2.037 2.037 0 0 1-1.91-1.708c-.216-1.324-.325-2.924-.325-4.798 0-1.563.076-2.864.225-3.904.14-.977.96-1.713 1.945-1.747 2.444-.087 4.465-.13 6.063-.131 1.598 0 3.62.044 6.064.13.96.034 1.71.81 1.855 1.814.075.524.113 1.962.141 3.065v.002c.01.342.017.65.025.88a.987.987 0 1 0 1.974-.068c-.008-.226-.016-.523-.025-.856v-.027c-.03-1.118-.073-2.663-.16-3.276-.273-1.906-1.783-3.438-3.74-3.507-.9-.032-1.743-.058-2.531-.078l1.05-1.46a1.008 1.008 0 0 0-1.638-1.177l-1.862 2.59c-.38-.004-.744-.007-1.088-.007h-.13Zm.521 4.775h-1.32v4.631h2.222v.847h-2.618v1.078h2.618l.003.678c.36.026.714.163 1.01.407h.11v-1.085h2.694v-1.078h-2.695v-.847H16.8v-4.63h-1.276a8.59 8.59 0 0 0 .748-1.42L15.183 7.8a14.232 14.232 0 0 1-.814 1.804h-1.518l.693-.308a8.862 8.862 0 0 0-.814-1.408l-1.045.352c.297.396.572.847.825 1.364Zm-4.18 3.564.154-1.485h1.98V8.294h-3.2v.98H9.33v1.43H7.472l-.308 3.453h2.277c0 1.166-.044 1.925-.12 2.277-.078.352-.386.528-.936.528-.308 0-.616-.022-.902-.055l.297 1.067.062.005c.285.02.551.04.818.04 1.001-.067 1.562-.419 1.694-1.057.11-.638.176-1.903.176-3.795h-2.2Zm7.458.11v-.858h-1.254v.858h1.254Zm-2.376-.858v.858h-1.199v-.858h1.2Zm-1.199-.946h1.2v-.902h-1.2v.902Zm2.321 0v-.902h1.254v.902h-1.254Z"/><path fill="#fb7299" fill-rule="evenodd" clip-rule="evenodd" d="M22.846 14.627a1 1 0 0 0-1.412.075l-5.091 5.703-2.216-2.275-.097-.086-.008-.005a1 1 0 0 0-1.322 1.493l2.963 3.041.093.083.007.005c.407.315 1 .27 1.354-.124l5.81-6.505.08-.102.005-.008a1 1 0 0 0-.166-1.295Z"/></svg>';
  const DM_OFF_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" opacity="0.72" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="m8.085 4.891-.999-1.499a1.008 1.008 0 0 1 1.679-1.118l1.709 2.566c.54-.008 1.045-.012 1.515-.012h.13c.345 0 .707.003 1.088.007l1.862-2.59a1.008 1.008 0 0 1 1.637 1.177l-1.049 1.46c.788.02 1.631.046 2.53.078 1.958.069 3.468 1.6 3.74 3.507.088.613.13 2.158.16 3.276l.001.027c.01.333.017.63.025.856a.987.987 0 0 1-1.974.069c-.008-.23-.016-.539-.025-.881v-.002c-.028-1.103-.066-2.541-.142-3.065-.143-1.004-.895-1.78-1.854-1.813-2.444-.087-4.466-.13-6.064-.131-1.598 0-3.619.044-6.063.13a2.037 2.037 0 0 0-1.945 1.748c-.15 1.04-.225 2.341-.225 3.904 0 1.874.11 3.474.325 4.798.154.949.95 1.66 1.91 1.708a97.58 97.58 0 0 0 5.416.139.988.988 0 0 1 0 1.975c-2.196 0-3.61-.047-5.513-.141A4.012 4.012 0 0 1 2.197 17.7c-.236-1.446-.351-3.151-.351-5.116 0-1.64.08-3.035.245-4.184A4.013 4.013 0 0 1 5.92 4.96c.761-.027 1.483-.05 2.164-.069Zm4.436 4.707h-1.32v4.63h2.222v.848h-2.618v1.078h2.431a5.01 5.01 0 0 1 3.575-3.115V9.598h-1.276a8.59 8.59 0 0 0 .748-1.42l-1.089-.384a14.232 14.232 0 0 1-.814 1.804h-1.518l.693-.308a8.862 8.862 0 0 0-.814-1.408l-1.045.352c.297.396.572.847.825 1.364Zm-4.18 3.564.154-1.485h1.98V8.289h-3.2v.979h2.067v1.43H7.483l-.308 3.454h2.277c0 1.166-.044 1.925-.12 2.277-.078.352-.386.528-.936.528-.308 0-.616-.022-.902-.055l.297 1.067.062.004c.285.02.551.04.818.04 1.001-.066 1.562-.418 1.694-1.056.11-.638.176-1.903.176-3.795h-2.2Zm7.458.11v-.858h-1.254v.858H15.8Zm-2.376-.858v.858h-1.199v-.858h1.2Zm-1.199-.946h1.2v-.902h-1.2v.902Zm2.321 0v-.902H15.8v.902h-1.254Zm3.517 10.594a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-.002-1.502a2.5 2.5 0 0 1-2.217-3.657l3.326 3.398a2.49 2.49 0 0 1-1.109.259Zm2.5-2.5c0 .42-.103.815-.286 1.162l-3.328-3.401a2.5 2.5 0 0 1 3.614 2.239Z"/></svg>';
  const LOCK_CLOSED_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z"/></svg>';
  const LOCK_OPEN_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-9.9-1h2.06A3.01 3.01 0 0 1 15 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>';

  function normalizeThumbUrl(raw, suffix = "@160w_100h_1c.webp") {
    const s = String(raw || "").trim();
    if (!s) return "";
    const httpsUrl = s.startsWith("//")
      ? `https:${s}`
      : s.startsWith("http://")
        ? `https://${s.slice(7)}`
        : s;
    if (!httpsUrl.startsWith("https://")) return "";
    if (suffix && httpsUrl.includes("hdslb.com") && !httpsUrl.includes("@")) {
      return `${httpsUrl}${suffix}`;
    }
    return httpsUrl;
  }

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

  function getBpxScreenMode() {
    return document.querySelector?.(".bpx-player-container")?.getAttribute?.("data-screen") || "";
  }

  function isSystemFullscreenNow() {
    return Boolean(
      document.fullscreenElement ||
        document.webkitFullscreenElement ||
        getBpxScreenMode() === "full"
    );
  }

  function isWebFullscreenNow() {
    return getBpxScreenMode() === "web";
  }

  function isFullscreenNow() {
    return isSystemFullscreenNow() || isWebFullscreenNow();
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

  function createBiliTouchPlayer({ adapter, engine, onNavigateVideo } = {}) {
    let enabled = false;
    let nativeBarMode = false;
    let hadSystemFullscreen = false;
    let hudVisible = false;
    let speedDrawerOpen = false;
    let qualityDrawerOpen = false;
    let episodeDrawerOpen = false;
    let screenLocked = false;
    let lockAwake = false;
    let speedLockedByBoost = false;
    let speedLockRestoreRate = 1;
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
    let lockAwakeTimer = null;
    let boostLockedFadeTimer = null;
    let gestureHudTimer = null;
    let scrubPreviewTimer = null;
    let videoshotPreloadTimer = null;
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
    let activeScrubContext = null;
    let lastVideoPaused = null;

    let activePointerId = null;
    let gestureMode = "idle"; // idle | pending | seek | volume | boost | scroll_yield | locked_block
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
    let scrubDrawRafId = null;
    let pendingDrawPayload = null;
    let lastDrawnFrameKey = "";
    let lastPaintedVideoKey = "";
    let hasPaintedScrubFrame = false;

    let globalEventsBound = false;
    let boostGlobalBound = false;
    let scrubWindowBound = false;
    let unbindScrubWindowEvents = () => {};
    let containerShieldEl = null;
    let outerShieldEl = null;
    let resizeObserver = null;
    let screenObserver = null;

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
        html.${NATIVE_HTML_CLASS} .bpx-player-top-right,
        html.${NATIVE_HTML_CLASS} .bpx-player-top-wrap {
          padding-right: 78px !important;
          box-sizing: border-box !important;
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
      rootEl.classList.toggle(ACTIVE_HTML_CLASS, Boolean(enabled && !nativeBarMode));
      rootEl.classList.toggle(NATIVE_HTML_CLASS, Boolean(enabled && nativeBarMode));
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
      clearTimeout(videoshotPreloadTimer);
      videoshotPreloadTimer = null;
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
      const sysFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (sysFull) {
        hadSystemFullscreen = true;
      } else if (hadSystemFullscreen) {
        hadSystemFullscreen = false;
        if (isWebFullscreenNow()) {
          const webBtn = findNativeWebFullscreenButton();
          if (webBtn && typeof webBtn.click === "function") {
            runNativeClick(webBtn);
          }
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
      syncQualityUi();
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
          const restore = Number.isFinite(preBoostRate) ? preBoostRate : 1;
          engine?.setPlaybackRate?.(restore, { showToast: false });
          syncRateUi();
        }
      } else if (!speedLockedByBoost) {
        els.boostChip?.classList.remove("is-visible", "is-locked-speed", "is-locked-compact");
        if (els.boostText) els.boostText.textContent = "2.0x 倍速播放中";
        if (els.boostHint) els.boostHint.textContent = "上滑锁定";
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
      if (container && typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(() => {
          if (enabled) syncScale();
        });
        resizeObserver.observe(container);
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
            onFullscreenChange();
          }
        });
        screenObserver.observe(bpxContainer, {
          attributes: true,
          attributeFilter: ["data-screen"],
        });
      }
    }

    function unbindContainerObserver() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (screenObserver) {
        screenObserver.disconnect();
        screenObserver = null;
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
      refreshVideoContext();
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

    function requestDocFullscreenWithOrientation() {
      try {
        const rootEl = document.documentElement;
        (rootEl?.requestFullscreen || rootEl?.webkitRequestFullscreen)?.call(rootEl)?.catch?.(() => {});
      } catch {}
      try {
        screen?.orientation?.lock?.("landscape")?.catch?.(() => {});
      } catch {}
    }

    function exitDocFullscreenWithOrientation() {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        try {
          (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
        } catch {}
      }
      try {
        screen?.orientation?.unlock?.();
      } catch {}
    }

    function toggleFullscreen() {
      if (isWebFullscreenNow()) {
        const webBtn = findNativeWebFullscreenButton();
        if (webBtn && typeof webBtn.click === "function") {
          runNativeClick(webBtn);
        }
        exitDocFullscreenWithOrientation();
        Promise.resolve().then(() => onFullscreenChange());
        return;
      }
      if (isSystemFullscreenNow()) {
        const fullBtn = findNativeFullscreenButton();
        if (fullBtn && typeof fullBtn.click === "function") {
          runNativeClick(fullBtn);
          exitDocFullscreenWithOrientation();
          return;
        }
        toggleDomFullscreenFallback(true);
        return;
      }
      const webBtn = findNativeWebFullscreenButton();
      if (webBtn && typeof webBtn.click === "function") {
        runNativeClick(webBtn);
        requestDocFullscreenWithOrientation();
        Promise.resolve().then(() => onFullscreenChange());
        return;
      }
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

    function formatQualityShortLabel(raw) {
      const s = String(raw || "").replace(/\s+/g, " ").trim();
      if (!s) return "画质";
      if (/8K/i.test(s)) return "8K";
      if (/4K/i.test(s)) return "4K";
      if (/杜比/i.test(s)) return "杜比";
      if (/HDR/i.test(s)) return "HDR";
      if (/1080P.*60/i.test(s)) return "1080P60";
      if (/1080P.*高码|1080P\+/i.test(s)) return "1080P+";
      if (/1080P/i.test(s)) return "1080P";
      if (/720P.*60/i.test(s)) return "720P60";
      if (/720P/i.test(s)) return "720P";
      if (/480P/i.test(s)) return "480P";
      if (/360P/i.test(s)) return "360P";
      if (/自动/i.test(s)) return "自动";
      const token = s.split(/\s+/)[0] || s;
      return token.slice(0, 6) || "画质";
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

    function syncQualityUi() {
      const state = readNativeQualityState({ wakeMenu: false });
      [els.qualityBtn, els.winQualityBtn].forEach((btn) => {
        if (!btn) return;
        btn.classList.toggle("is-hidden", !state.available);
        btn.textContent = state.shortLabel || "画质";
      });
    }

    function positionQualityPopover() {
      if (!els.qualityDrawer) return;
      const btn = isFullscreenNow() ? els.qualityBtn : els.winQualityBtn;
      const rootRect = els.root?.getBoundingClientRect?.();
      const btnRect = btn?.getBoundingClientRect?.();
      const scale = Number(host?.style?.getPropertyValue?.("--ytb-s")) || 1;
      if (rootRect && rootRect.width > 0 && btnRect && btnRect.width > 0) {
        const centerX = btnRect.left - rootRect.left + btnRect.width / 2;
        const halfW = 62 * scale;
        const clampedX = Math.max(halfW + 8, Math.min(rootRect.width - halfW - 8, centerX));
        els.qualityDrawer.style.left = `${clampedX}px`;
      } else {
        els.qualityDrawer.style.left = "";
      }
    }

    function renderQualityDrawer() {
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
          runNativeClick(item.el);
          setQualityDrawerOpen(false);
          scheduleHudHide(HUD_BAR_HIDE_MS);
          showMiniToast(`画质 ${item.shortLabel}`, MINI_TOAST_MS);
          clearTimeout(qualitySyncTimer);
          qualitySyncTimer = setTimeout(() => {
            qualitySyncTimer = null;
            if (enabled) syncQualityUi();
          }, 160);
        });
        els.qualityDrawer.appendChild(btn);
      });
    }

    function setQualityDrawerOpen(open) {
      qualityDrawerOpen = Boolean(open);
      if (qualityDrawerOpen) {
        speedDrawerOpen = false;
        episodeDrawerOpen = false;
        els.speedDrawer?.classList.remove("is-open");
        els.epDrawer?.classList.remove("is-open");
        els.root?.classList.remove("is-ep-open");
        renderQualityDrawer();
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
        episodeDrawerOpen = false;
        els.speedDrawer?.classList.remove("is-open");
        els.epDrawer?.classList.remove("is-open");
        els.root?.classList.remove("is-ep-open", "is-hud-open");
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

    function switchToEpisode(item) {
      if (!item || !item.videoId) return;
      if (adapter?.getVideoId?.() === item.videoId) {
        setEpisodeDrawerOpen(false);
        return;
      }
      setEpisodeDrawerOpen(false);
      wakeHud(HUD_BAR_HIDE_MS);
      showMiniToast(`切换至 ${item.shortLabel || item.title || "下一集"}`, 1200);
      if (typeof onNavigateVideo === "function") {
        onNavigateVideo(item.videoId, item.title || "");
      } else {
        adapter?.navigateTo?.(item.videoId);
      }
    }

    function scrollActiveEpisodeIntoView() {
      const list = els.epList;
      if (!list) return;
      const active = lastActiveEpBtn || list.querySelector?.(".ytb-ep-item.is-active");
      if (!active) return;
      const listH = Number(list.clientHeight) || 0;
      if (listH <= 0) return;
      const btnTop = Number(active.offsetTop) || 0;
      const btnH = Number(active.offsetHeight) || 0;
      list.scrollTop = Math.max(0, btnTop - Math.max(0, (listH - btnH) / 2));
    }

    function renderEpisodeDrawer() {
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
          switchToEpisode(item);
        });
        if (isActive) activeBtn = btn;
        els.epList.appendChild(btn);
      });

      lastEpisodeRenderKey = renderKey;
      lastActiveEpBtn = activeBtn;
    }

    function syncEpisodeUi() {
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
        setEpisodeDrawerOpen(false);
      }
      renderEpisodeDrawer();
    }

    function ensureEpisodeDataLoaded() {
      const ref = parseBiliVideoRef();
      if (!ref || typeof fetch !== "function") {
        currentEpisodeData = null;
        syncEpisodeUi();
        return null;
      }
      if (episodeCache.has(ref.key)) {
        currentEpisodeData = episodeCache.get(ref.key);
        syncEpisodeUi();
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
          if (enabled && parseBiliVideoRef()?.key === ref.key) {
            currentEpisodeData = parsed;
            lastEpisodeRenderKey = "";
            syncEpisodeUi();
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

    function refreshVideoContext({ skipAlive = false } = {}) {
      if (!enabled) return;
      if (!skipAlive) ensureAlive();
      const ref = parseBiliVideoRef();
      const nextKey = ref?.key || "";
      if (nextKey !== lastEpisodeRefKey) {
        clearLockedBoostSpeed({ restore: false });
        lastEpisodeRefKey = nextKey;
        lastEpisodeRenderKey = "";
        currentEpisodeData = episodeCache.get(nextKey) || null;
        syncEpisodeUi();
        ensureEpisodeDataLoaded();
        scheduleVideoshotPreload(1200);
      } else {
        syncEpisodeUi();
      }
      syncQualityUi();
      syncTopBar();
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
        episodeDrawerOpen = false;
        els.qualityDrawer?.classList.remove("is-open");
        els.epDrawer?.classList.remove("is-open");
        els.root?.classList.remove("is-ep-open");
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

    function setEpisodeDrawerOpen(open) {
      episodeDrawerOpen = Boolean(open);
      if (episodeDrawerOpen) {
        speedDrawerOpen = false;
        qualityDrawerOpen = false;
        els.speedDrawer?.classList.remove("is-open");
        els.qualityDrawer?.classList.remove("is-open");
      }
      els.epDrawer?.classList.toggle("is-open", episodeDrawerOpen);
      els.root?.classList.toggle("is-ep-open", episodeDrawerOpen);
      if (episodeDrawerOpen) {
        renderEpisodeDrawer();
        scrollActiveEpisodeIntoView();
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
      setEpisodeDrawerOpen(false);
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
        episodeDrawerOpen ||
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
      if (!enabled || nativeBarMode || endingPassthrough) return;
      if (screenLocked) {
        wakeLockBtn(LOCK_AWAKE_MS);
        return;
      }
      hudVisible = true;
      els.root?.classList.add("is-hud-open");
      syncPlaybackUi();
      syncVolumeUi();
      syncDanmakuUi();
      syncQualityUi();
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

      els.lockBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        setScreenLocked(!screenLocked);
      });

      els.prevBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (screenLocked) {
          wakeLockBtn(LOCK_AWAKE_MS);
          return;
        }
        const ref = parseBiliVideoRef();
        const idx = resolveCurrentEpisodeIndex(currentEpisodeData, ref);
        if (idx > 0 && currentEpisodeData?.items?.[idx - 1]) {
          switchToEpisode(currentEpisodeData.items[idx - 1]);
        }
      });

      els.nextBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (screenLocked) {
          wakeLockBtn(LOCK_AWAKE_MS);
          return;
        }
        const ref = parseBiliVideoRef();
        const idx = resolveCurrentEpisodeIndex(currentEpisodeData, ref);
        const items = currentEpisodeData?.items || [];
        if (idx >= 0 && idx < items.length - 1 && items[idx + 1]) {
          switchToEpisode(items[idx + 1]);
        }
      });

      [els.epBtn, els.winEpBtn].forEach((btn) => {
        btn?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (screenLocked) {
            wakeLockBtn(LOCK_AWAKE_MS);
            return;
          }
          if (!hudVisible) wakeHud(HUD_BAR_HIDE_MS);
          setEpisodeDrawerOpen(!episodeDrawerOpen);
        });
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
          if (qualityDrawerOpen) setQualityDrawerOpen(false);
          if (episodeDrawerOpen) setEpisodeDrawerOpen(false);
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

        const handleSingleTap = () => {
          singleTapTimer = null;
          if (!enabled || nativeBarMode || endingPassthrough) return;
          if (screenLocked) {
            if (lockAwake) hideLockBtn();
            else wakeLockBtn(LOCK_AWAKE_MS);
            return;
          }
          if (speedDrawerOpen || qualityDrawerOpen || episodeDrawerOpen) {
            setSpeedDrawerOpen(false);
            setQualityDrawerOpen(false);
            setEpisodeDrawerOpen(false);
            scheduleHudHide(HUD_BAR_HIDE_MS);
          } else if (hudVisible) {
            hideHud();
          } else {
            wakeHud(HUD_BAR_HIDE_MS);
          }
        };

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
          boostLockArmed = false;
          const video = currentVideo || adapter?.getVideoElement?.();
          gestureStartTimeSec = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
          gestureStartVol = Number.isFinite(video?.volume) ? video.volume : 1;
          gesturePendingSeekSec = gestureStartTimeSec;

          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            if (!enabled || nativeBarMode || endingPassthrough || gestureMode !== "pending") return;
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
          const dist = Math.hypot(dx, dy);
          gestureMaxDist = Math.max(gestureMaxDist, dist);

          if (gestureMode === "boost") {
            if (!boostLockArmed && dy <= -BOOST_LOCK_SLIDE_PX) {
              boostLockArmed = true;
              els.boostChip?.classList.add("is-lock-armed");
              if (els.boostText) els.boostText.textContent = "松手锁定 2.0x 倍速";
              if (els.boostHint) els.boostHint.textContent = "已到位";
            } else if (boostLockArmed && dy > -BOOST_LOCK_SLIDE_PX * 0.65) {
              boostLockArmed = false;
              els.boostChip?.classList.remove("is-lock-armed");
              if (els.boostText) els.boostText.textContent = "2.0x 倍速播放中";
              if (els.boostHint) els.boostHint.textContent = "上滑锁定";
            }
            return;
          }

          if (dist > TAP_MOVE_LIMIT_PX) {
            if (longPressTimer) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
            }
            clearTimeout(singleTapTimer);
            singleTapTimer = null;
            lastTapAt = 0;
          }

          if (gestureMode === "pending") {
            if (screenLocked && dist > DRAG_THRESHOLD_PX) {
              gestureMode = "locked_block";
              wakeLockBtn(LOCK_AWAKE_MS);
              pulseLockBtn();
              showMiniToast("已锁屏，点击锁图标解锁", 1100);
              return;
            }
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
          if (gestureMode === "boost") {
            releaseBoost({ cancelLock: true });
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
            releaseBoost({ cancelLock: false });
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
                if (episodeDrawerOpen) setEpisodeDrawerOpen(false);
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
          .ytb-root.is-locked .ytb-quality-drawer,
          .ytb-root.is-locked .ytb-ep-drawer {
            display: none !important;
            pointer-events: none !important;
          }
          .ytb-root.is-ep-open .ytb-lock-btn {
            opacity: 0 !important;
            pointer-events: none !important;
          }
          .ytb-icon-btn.is-hidden,
          .ytb-ghost-btn.is-hidden {
            display: none !important;
          }

          /* Screen Lock Floating Button (Fullscreen Right Center, Native App Style) */
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
            border-color: rgba(251, 114, 153, 0.72);
            color: #fb7299;
          }
          .ytb-lock-btn.is-pulse {
            animation: ytbLockPulse 0.34s ease;
          }
          @keyframes ytbLockPulse {
            0%, 100% { transform: translateY(-50%) scale(1); }
            45% { transform: translateY(-50%) scale(1.16); }
          }

          /* Top-Center 2.0x Boost Chip (with Slide-Up Lock State) */
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
            background: rgba(251, 114, 153, 0.9);
            border-color: rgba(255, 255, 255, 0.4);
          }
          .ytb-boost-chip.is-locked-speed {
            pointer-events: auto;
            cursor: pointer;
            background: rgba(20, 20, 26, 0.84);
            border-color: rgba(251, 114, 153, 0.55);
            transition: opacity 0.25s ease, background 0.15s ease, padding 0.2s ease;
          }
          .ytb-boost-chip.is-locked-speed:active {
            background: rgba(251, 114, 153, 0.35);
          }
          .ytb-boost-chip.is-locked-compact {
            opacity: 0.62;
            padding: calc(3px * var(--ytb-s, 1)) calc(9px * var(--ytb-s, 1));
          }
          .ytb-boost-arrows {
            color: #fb7299;
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
            right: calc(10px * var(--ytb-s, 1));
            z-index: 20;
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
            opacity: 0.55;
            pointer-events: auto;
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
            bottom: calc(54px * var(--ytb-s, 1));
          }
          .ytb-root.is-fullscreen .ytb-scrub-preview.is-track-mode {
            top: 46%;
            left: 50% !important;
            bottom: auto;
            transform: translate(-50%, -50%);
          }
          .ytb-scrub-preview.is-swipe-mode {
            top: 46%;
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
            filter: drop-shadow(0 0 4px rgba(251, 114, 153, 0.9));
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
          .ytb-btn-speed,
          .ytb-btn-quality {
            font-weight: 600;
          }
          .ytb-btn-speed.is-active-rate {
            color: #fb7299;
          }

          /* Floating Compact Speed Popover Anchored Above 倍速 Button */
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
            color: #fb7299;
            font-weight: 700;
          }

          /* Floating Compact Quality Popover Anchored Above 画质 Button */
          .ytb-quality-drawer {
            position: absolute;
            bottom: calc(58px * var(--ytb-s, 1));
            left: 74%;
            transform: translateX(-50%);
            width: calc(126px * var(--ytb-s, 1));
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
            justify-content: space-between;
            gap: calc(6px * var(--ytb-s, 1));
            text-align: left;
            flex-shrink: 0;
          }
          .ytb-quality-opt:active {
            background: rgba(255, 255, 255, 0.1);
          }
          .ytb-quality-opt.is-active {
            color: #fb7299;
            font-weight: 700;
          }
          .ytb-quality-opt.is-empty {
            justify-content: center;
            color: rgba(255, 255, 255, 0.55);
            cursor: default;
          }
          .ytb-quality-badge {
            font-size: calc(9.5px * var(--ytb-s, 1));
            line-height: 1.3;
            padding: 0 calc(4px * var(--ytb-s, 1));
            border-radius: calc(3px * var(--ytb-s, 1));
            background: rgba(251, 114, 153, 0.22);
            color: #fb7299;
            font-weight: 600;
            flex-shrink: 0;
          }

          /* Right-Side Episode Selector Drawer (Crisp Instant Toggle, Zero Reflow Wobble) */
          .ytb-ep-drawer {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: min(82%, calc(272px * var(--ytb-s, 1)));
            z-index: 10;
            padding: calc(12px * var(--ytb-s, 1));
            background: rgba(16, 17, 23, 0.93);
            backdrop-filter: blur(12px);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            display: none;
            flex-direction: column;
            gap: calc(8px * var(--ytb-s, 1));
            pointer-events: auto;
          }
          .ytb-ep-drawer.is-open {
            display: flex;
          }
          .ytb-ep-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: calc(6px * var(--ytb-s, 1));
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
          }
          .ytb-ep-drawer-title {
            font-size: calc(12.5px * var(--ytb-s, 1));
            font-weight: 700;
            color: #ffffff;
          }
          .ytb-ep-drawer-sub {
            font-size: calc(11px * var(--ytb-s, 1));
            color: rgba(255, 255, 255, 0.62);
          }
          .ytb-ep-scroll {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: calc(6px * var(--ytb-s, 1));
            overscroll-behavior: contain;
          }
          .ytb-ep-scroll.is-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            align-content: start;
            gap: calc(6px * var(--ytb-s, 1));
          }
          .ytb-ep-item {
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            color: #e4e4e7;
            border-radius: calc(7px * var(--ytb-s, 1));
            cursor: pointer;
            text-align: left;
            flex-shrink: 0;
          }
          .ytb-ep-item.is-active {
            background: rgba(251, 114, 153, 0.2);
            border-color: rgba(251, 114, 153, 0.7);
            color: #ffffff;
          }
          .ytb-ep-list-item {
            padding: calc(6px * var(--ytb-s, 1)) calc(8px * var(--ytb-s, 1));
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: calc(8px * var(--ytb-s, 1));
          }
          .ytb-ep-thumb {
            width: calc(76px * var(--ytb-s, 1));
            height: calc(43px * var(--ytb-s, 1));
            border-radius: calc(5px * var(--ytb-s, 1));
            object-fit: cover;
            flex-shrink: 0;
            background: rgba(255, 255, 255, 0.08);
          }
          .ytb-ep-list-body {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: calc(2px * var(--ytb-s, 1));
          }
          .ytb-ep-list-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: calc(10.5px * var(--ytb-s, 1));
            color: rgba(255, 255, 255, 0.62);
          }
          .ytb-ep-item.is-active .ytb-ep-list-top {
            color: #fb7299;
            font-weight: 700;
          }
          .ytb-ep-list-title {
            font-size: calc(11.5px * var(--ytb-s, 1));
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .ytb-ep-grid-item {
            height: calc(38px * var(--ytb-s, 1));
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            font-size: calc(12.5px * var(--ytb-s, 1));
            font-weight: 600;
            text-align: center;
          }
          .ytb-ep-item.is-active.ytb-ep-grid-item {
            color: #fb7299;
          }
          .ytb-ep-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 9px;
            padding: 0 3px;
            border-radius: 3px;
            background: #fb7299;
            color: #ffffff;
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
            <button id="ytbWinEpBtn" class="ytb-ghost-btn is-hidden" type="button">选集</button>
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

          <div id="ytbSpeedDrawer" class="ytb-speed-drawer"></div>
          <div id="ytbQualityDrawer" class="ytb-quality-drawer"></div>

          <div id="ytbEpDrawer" class="ytb-ep-drawer">
            <div class="ytb-ep-header">
              <span id="ytbEpDrawerTitle" class="ytb-ep-drawer-title">选集</span>
              <span id="ytbEpDrawerSub" class="ytb-ep-drawer-sub"></span>
            </div>
            <div id="ytbEpList" class="ytb-ep-scroll"></div>
          </div>

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
                  <button id="ytbPrevBtn" class="ytb-icon-btn ytb-btn-prev is-hidden" type="button" aria-label="上一集">${PREV_SVG}</button>
                  <button id="ytbPlayBtn" class="ytb-icon-btn ytb-btn-play" type="button" aria-label="播放">${PLAY_SVG}</button>
                  <button id="ytbNextBtn" class="ytb-icon-btn ytb-btn-next is-hidden" type="button" aria-label="下一集">${NEXT_SVG}</button>
                  <button id="ytbDmBtn" class="ytb-icon-btn ytb-btn-dm" type="button" aria-label="弹幕开关">${DM_ON_SVG}</button>
                </div>
                <div class="ytb-right-actions">
                  <button id="ytbEpBtn" class="ytb-icon-btn ytb-btn-ep is-hidden" type="button">选集</button>
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
        scrubCanvas: shadow.getElementById("ytbScrubCanvas"),
        scrubThumbTime: shadow.getElementById("ytbScrubThumbTime"),
        scrubMeta: shadow.getElementById("ytbScrubMeta"),
        scrubTime: shadow.getElementById("ytbScrubTime"),
        scrubDelta: shadow.getElementById("ytbScrubDelta"),
        miniProgress: shadow.getElementById("ytbMiniProgress"),
        miniProgressFill: shadow.getElementById("ytbMiniProgressFill"),
        miniToast: shadow.getElementById("ytbMiniToast"),
        winTop: shadow.getElementById("ytbWinTop"),
        winEpBtn: shadow.getElementById("ytbWinEpBtn"),
        winDmBtn: shadow.getElementById("ytbWinDmBtn"),
        winNativeBtn: shadow.getElementById("ytbWinNativeBtn"),
        topBar: shadow.getElementById("ytbTopBar"),
        backBtn: shadow.getElementById("ytbBackBtn"),
        title: shadow.getElementById("ytbTitle"),
        syncBadge: shadow.getElementById("ytbSyncBadge"),
        nativeBtn: shadow.getElementById("ytbNativeBtn"),
        speedDrawer: shadow.getElementById("ytbSpeedDrawer"),
        qualityDrawer: shadow.getElementById("ytbQualityDrawer"),
        epDrawer: shadow.getElementById("ytbEpDrawer"),
        epDrawerTitle: shadow.getElementById("ytbEpDrawerTitle"),
        epDrawerSub: shadow.getElementById("ytbEpDrawerSub"),
        epList: shadow.getElementById("ytbEpList"),
        bottomBar: shadow.getElementById("ytbBottomBar"),
        timeText: shadow.getElementById("ytbTime"),
        progressWrap: shadow.getElementById("ytbProgressWrap"),
        progressFill: shadow.getElementById("ytbProgressFill"),
        progressThumb: shadow.getElementById("ytbProgressThumb"),
        prevBtn: shadow.getElementById("ytbPrevBtn"),
        playBtn: shadow.getElementById("ytbPlayBtn"),
        nextBtn: shadow.getElementById("ytbNextBtn"),
        dmBtn: shadow.getElementById("ytbDmBtn"),
        epBtn: shadow.getElementById("ytbEpBtn"),
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
      syncQualityUi();
      syncRateUi();
      syncTopBar();
      refreshVideoContext({ skipAlive: true });
      scheduleVideoshotPreload(1200);
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
      if (!detached) return true;
      if (ensureMounted()) {
        setNativeBarMode(nativeBarMode);
        return true;
      }
      scheduleMountRetry(0);
      return false;
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
        releaseBoost({ cancelLock: true });
      }
      clearLockedBoostSpeed({ restore: false });
      enabled = false;
      nativeBarMode = false;
      hadSystemFullscreen = false;
      exitDocFullscreenWithOrientation();
      hudVisible = false;
      speedDrawerOpen = false;
      qualityDrawerOpen = false;
      episodeDrawerOpen = false;
      screenLocked = false;
      lockAwake = false;
      boostLockArmed = false;
      endingPassthrough = false;
      userMuted = false;
      draggingSeek = false;
      activeScrubPointerId = null;
      activeScrubWrap = null;
      activeScrubContext = null;
      lastDrawnFrameKey = "";
      lastPaintedVideoKey = "";
      hasPaintedScrubFrame = false;
      activePointerId = null;
      gestureMode = "idle";
      lastEpisodeRefKey = "";
      lastEpisodeRenderKey = "";
      lastActiveEpBtn = null;
      currentEpisodeData = null;
      clearTimers();
      clearDecodedSheets();
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
          "is-lock-awake",
          "is-ep-open"
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
      if (els.epDrawer) els.epDrawer.classList.remove("is-open");
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

  root.createBiliTouchPlayer = createBiliTouchPlayer;
})();
