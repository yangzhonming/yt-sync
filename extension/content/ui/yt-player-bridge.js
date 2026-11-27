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
