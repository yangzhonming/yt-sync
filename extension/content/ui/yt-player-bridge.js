(() => {
  if (window.__ytSyncYtBridgeInstalled) return;
  window.__ytSyncYtBridgeInstalled = true;

  const QUALITY_LABELS = {
    highres: "8K",
    hd2160: "2160p 4K",
    hd1440: "1440p HD",
    hd1080: "1080p HD",
    hd720: "720p",
    large: "480p",
    medium: "360p",
    small: "240p",
    tiny: "144p",
    auto: "自动",
  };

  function getMoviePlayer() {
    return (
      document.querySelector("#player-container-id #movie_player") ||
      document.querySelector("#player-container #movie_player") ||
      document.querySelector("#movie_player") ||
      document.querySelector(".html5-video-player")
    );
  }

  function readQualityState() {
    const player = getMoviePlayer();
    if (!player) {
      return { available: false, currentQuality: "auto", currentLabel: "自动", items: [] };
    }

    const rawData =
      typeof player.getAvailableQualityData === "function"
        ? player.getAvailableQualityData()
        : null;
    const rawLevels =
      typeof player.getAvailableQualityLevels === "function"
        ? player.getAvailableQualityLevels()
        : [];

    const seen = new Set();
    const items = [];

    if (Array.isArray(rawData) && rawData.length > 0) {
      rawData.forEach((entry) => {
        const quality = String(entry?.quality || "").trim();
        if (!quality || seen.has(quality)) return;
        if (entry?.isPlayable === false) return;
        seen.add(quality);
        const label =
          String(entry?.qualityLabel || QUALITY_LABELS[quality] || quality).trim() || quality;
        items.push({ quality, label });
      });
    } else if (Array.isArray(rawLevels) && rawLevels.length > 0) {
      rawLevels.forEach((q) => {
        const quality = String(q || "").trim();
        if (!quality || seen.has(quality)) return;
        seen.add(quality);
        items.push({ quality, label: QUALITY_LABELS[quality] || quality });
      });
    }

    if (items.length > 0 && !seen.has("auto")) {
      items.push({ quality: "auto", label: "自动" });
    }

    const currentQuality =
      (typeof player.getPlaybackQuality === "function" && player.getPlaybackQuality()) || "auto";
    const matchedCurrent = items.find((x) => x.quality === currentQuality) || null;
    const currentLabel =
      (typeof player.getPlaybackQualityLabel === "function" &&
        player.getPlaybackQualityLabel()) ||
      matchedCurrent?.label ||
      QUALITY_LABELS[currentQuality] ||
      "自动";

    return {
      available: items.length > 0,
      currentQuality,
      currentLabel: String(currentLabel || "自动"),
      items,
    };
  }

  function applyQuality(quality) {
    const player = getMoviePlayer();
    const q = String(quality || "").trim();
    if (!player || !q) return readQualityState();

    try {
      if (q === "auto") {
        player.setPlaybackQualityRange?.("tiny", "highres");
        player.setPlaybackQuality?.("default");
      } else {
        player.setPlaybackQualityRange?.(q, q);
        player.setPlaybackQuality?.(q);
      }
    } catch {}

    return readQualityState();
  }

  function parseStoryboardSpec(spec, videoId = "") {
    if (typeof spec !== "string" || !spec.includes("|")) {
      return { available: false, videoId };
    }
    const parts = spec.split("|");
    const baseUrl = String(parts[0] || "").trim();
    if (!baseUrl) {
      return { available: false, videoId };
    }

    const candidates = [];
    for (let i = 1; i < parts.length; i++) {
      const segs = String(parts[i] || "").split("#");
      if (segs.length < 7) continue;
      const width = Number(segs[0]) || 0;
      const height = Number(segs[1]) || 0;
      const totalCount = Number(segs[2]) || 0;
      const cols = Number(segs[3]) || 0;
      const rows = Number(segs[4]) || 0;
      const intervalMs = Math.max(0, Number(segs[5]) || 0);
      const nameTemplate = String(segs[6] || "").trim();
      const sigh = segs.slice(7).join("#").trim();
      if (width > 0 && height > 0 && totalCount > 0 && cols > 0 && rows > 0 && nameTemplate) {
        candidates.push({
          level: i - 1,
          width,
          height,
          totalCount,
          cols,
          rows,
          intervalMs,
          nameTemplate,
          sigh,
        });
      }
    }

    if (!candidates.length) {
      return { available: false, videoId };
    }

    const mid = candidates.filter((c) => c.width <= 320);
    const pool = mid.length ? mid : candidates;
    pool.sort((a, b) => b.width - a.width || b.level - a.level);
    const best = pool[0];

    return {
      available: true,
      videoId,
      baseUrl,
      ...best,
    };
  }

  function readStoryboardState() {
    const player = getMoviePlayer();
    let searchVid = "";
    try {
      searchVid = new URLSearchParams(location?.search || "").get("v") || "";
    } catch {}
    const videoId = String(player?.getVideoData?.()?.video_id || searchVid || "");

    let spec = "";
    try {
      spec = player?.getPlayerResponse?.()?.storyboards?.playerStoryboardSpecRenderer?.spec || "";
    } catch {}

    if (!spec) {
      try {
        const initResp = window.ytInitialPlayerResponse;
        const initVid = String(initResp?.videoDetails?.videoId || "");
        if (initResp?.storyboards?.playerStoryboardSpecRenderer?.spec && (!videoId || !initVid || initVid === videoId)) {
          spec = initResp.storyboards.playerStoryboardSpecRenderer.spec;
        }
      } catch {}
    }

    if (!spec && typeof player?.getStoryboardFormat === "function") {
      try {
        const fmt = player.getStoryboardFormat();
        if (typeof fmt === "string" && fmt.includes("|")) {
          spec = fmt;
        }
      } catch {}
    }

    return parseStoryboardSpec(spec, videoId);
  }

  function extractTrackLabel(t) {
    if (!t || typeof t !== "object") return "";
    if (typeof t.displayName === "string" && t.displayName.trim()) return t.displayName.trim();
    if (typeof t.name === "string" && t.name.trim()) return t.name.trim();
    if (typeof t.name?.simpleText === "string" && t.name.simpleText.trim()) return t.name.simpleText.trim();
    if (Array.isArray(t.name?.runs)) {
      const joined = t.name.runs.map((r) => r?.text || "").join("").trim();
      if (joined) return joined;
    }
    if (typeof t.languageName === "string" && t.languageName.trim()) return t.languageName.trim();
    return String(t.languageCode || "").trim();
  }

  function getRawCaptionTracks(player, videoId) {
    let list = null;
    try {
      const opt = player?.getOption?.("captions", "tracklist");
      if (Array.isArray(opt) && opt.length > 0) list = opt;
    } catch {}

    if (!list) {
      try {
        const pr = player?.getPlayerResponse?.();
        const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(tracks) && tracks.length > 0) list = tracks;
      } catch {}
    }

    if (!list) {
      try {
        const initResp = window.ytInitialPlayerResponse;
        const initVid = String(initResp?.videoDetails?.videoId || "");
        const tracks = initResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(tracks) && tracks.length > 0 && (!videoId || !initVid || initVid === videoId)) {
          list = tracks;
        }
      } catch {}
    }

    return Array.isArray(list) ? list : [];
  }

  function readCaptionsState() {
    const player = getMoviePlayer();
    if (!player) {
      return { available: false, on: false, activeLanguageCode: "", activeVssId: "", items: [] };
    }
    let searchVid = "";
    try {
      searchVid = new URLSearchParams(location?.search || "").get("v") || "";
    } catch {}
    const videoId = String(player?.getVideoData?.()?.video_id || searchVid || "");

    const rawTracks = getRawCaptionTracks(player, videoId);
    const seen = new Set();
    const items = [];
    rawTracks.forEach((t) => {
      const languageCode = String(t?.languageCode || "").trim();
      const vssId = String(t?.vssId || "").trim();
      const key = vssId || languageCode;
      if (!languageCode && !vssId) return;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        languageCode,
        vssId,
        kind: String(t?.kind || "").trim(),
        label: extractTrackLabel(t) || languageCode || vssId,
      });
    });

    let activeTrack = null;
    try {
      const cur = player?.getOption?.("captions", "track");
      if (cur && typeof cur === "object" && (cur.languageCode || cur.vssId)) {
        activeTrack = cur;
      }
    } catch {}

    const activeLanguageCode = String(activeTrack?.languageCode || "").trim();
    const activeVssId = String(activeTrack?.vssId || "").trim();
    return {
      available: items.length > 0,
      on: Boolean(activeLanguageCode || activeVssId),
      activeLanguageCode,
      activeVssId,
      items,
    };
  }

  function applyCaption(payload = {}) {
    const player = getMoviePlayer();
    if (!player) return readCaptionsState();

    if (payload.off) {
      try {
        player.setOption?.("captions", "track", {});
      } catch {}
      try {
        player.unloadModule?.("captions");
      } catch {}
      return readCaptionsState();
    }

    try {
      player.loadModule?.("captions");
    } catch {}

    const st = readCaptionsState();
    const reqVss = String(payload.vssId || "").trim();
    const reqLang = String(payload.languageCode || "").trim();
    const matched =
      st.items.find((x) => (reqVss && x.vssId === reqVss) || (reqLang && x.languageCode === reqLang)) ||
      st.items[0] ||
      null;

    if (matched) {
      const trackObj = { languageCode: matched.languageCode };
      if (matched.vssId) trackObj.vssId = matched.vssId;
      if (matched.kind) trackObj.kind = matched.kind;
      try {
        player.setOption?.("captions", "track", trackObj);
      } catch {}
    }

    return readCaptionsState();
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const data = e.data;
    if (!data || data.__ytSyncBridge !== "req") return;

    let state = null;
    let ok = true;
    try {
      if (data.cmd === "get_quality") {
        state = readQualityState();
      } else if (data.cmd === "set_quality") {
        state = applyQuality(data.quality);
      } else if (data.cmd === "get_storyboard") {
        state = readStoryboardState();
      } else if (data.cmd === "get_captions") {
        state = readCaptionsState();
      } else if (data.cmd === "set_caption") {
        state = applyCaption(data);
      } else {
        ok = false;
      }
    } catch {
      ok = false;
    }

    try {
      window.postMessage(
        {
          __ytSyncBridge: "res",
          id: data.id,
          ok,
          state,
        },
        "*"
      );
    } catch {}
  });
})();
