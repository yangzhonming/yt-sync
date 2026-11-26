(() => {
  const root = (window.YTSync = window.YTSync || {});

  const STORAGE_KEY = "ytSyncDebugLog";
  const MAX_EVENTS = 400;
  const TTL_MS = 24 * 60 * 60 * 1000;
  const SAVE_DEBOUNCE_MS = 1500;
  const MAX_WIRE_BYTES = 48 * 1024;

  function maskVideoId(vid) {
    if (!vid || typeof vid !== "string") return null;
    if (vid.startsWith("yt:")) return `yt:****${vid.slice(-4)}`;
    if (vid.startsWith("bili:")) return `bili:****${vid.slice(-4)}`;
    return `****${vid.slice(-4)}`;
  }

  function maskCode(code) {
    const s = String(code || "").trim().toUpperCase();
    if (!s) return "";
    if (s.length <= 4) return "****";
    return `${s.slice(0, 2)}**${s.slice(-2)}`;
  }

  function sanitizeText(val) {
    return String(val || "")
      .replace(/https?:\/\/[^/\s"']*workers\.dev/gi, "<worker>")
      .replace(/wss?:\/\/[^/\s"']*workers\.dev/gi, "<worker>")
      .slice(0, 160);
  }

  function sanitizeData(data) {
    if (!data || typeof data !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      if (k === "videoTitle" || k === "title" || k === "query" || k === "searchUrl") continue;
      if (k === "videoId" || k === "vid" || k === "expected" || k === "actual") {
        out[k] = maskVideoId(v);
      } else if (typeof v === "string") {
        out[k] = sanitizeText(v);
      } else if (typeof v === "number") {
        out[k] = Number.isFinite(v) ? Number(v.toFixed(3)) : null;
      } else if (typeof v === "boolean" || v === null) {
        out[k] = v;
      }
    }
    return out;
  }

  function createDebugRecorder({ getSnapshot, getPlatform } = {}) {
    let seq = 0;
    let events = [];
    let saveTimer = null;
    let errorListenersBound = false;

    async function loadFromStorage() {
      try {
        if (!chrome?.storage?.local) return;
        const res = await chrome.storage.local.get(STORAGE_KEY);
        const stored = res?.[STORAGE_KEY];
        if (!stored || !Array.isArray(stored.events)) return;
        const cutoff = Date.now() - TTL_MS;
        const fresh = stored.events.filter((e) => e && typeof e.ts === "number" && e.ts >= cutoff);
        const merged = [...fresh, ...events];
        events = merged.slice(-MAX_EVENTS);
        const maxSeq = events.reduce((m, e) => (typeof e.seq === "number" && e.seq > m ? e.seq : m), seq);
        seq = maxSeq;
      } catch {
        // Ignore storage read errors.
      }
    }

    function scheduleSave() {
      if (saveTimer || !chrome?.storage?.local) return;
      saveTimer = setTimeout(() => {
        saveTimer = null;
        flushNow();
      }, SAVE_DEBOUNCE_MS);
    }

    function flushNow() {
      clearTimeout(saveTimer);
      saveTimer = null;
      try {
        if (!chrome?.storage?.local) return Promise.resolve();
        const cutoff = Date.now() - TTL_MS;
        events = events.filter((e) => e && e.ts >= cutoff).slice(-MAX_EVENTS);
        return chrome.storage.local.set({
          [STORAGE_KEY]: { updatedAt: Date.now(), events },
        });
      } catch {
        return Promise.resolve();
      }
    }

    function newTraceId() {
      const rand = Math.random().toString(36).slice(2, 6);
      const tail = ((seq + 1) % 1296).toString(36).padStart(2, "0");
      return `${rand}${tail}`;
    }

    function log(cat, ev, data = {}) {
      seq += 1;
      const mono =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? Math.round(performance.now())
          : 0;
      const entry = {
        seq,
        ts: Date.now(),
        mono,
        cat: String(cat || "sys"),
        ev: String(ev || "event"),
        ...sanitizeData(data),
      };
      events.push(entry);
      if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
      }
      scheduleSave();
      return entry;
    }

    async function clear() {
      clearTimeout(saveTimer);
      saveTimer = null;
      events = [];
      try {
        await chrome?.storage?.local?.remove?.(STORAGE_KEY);
      } catch {
        // Ignore storage errors.
      }
    }

    function getCompactDump(limit = 200) {
      let slice = events.slice(-Math.max(1, limit));
      const snap = getSnapshot?.() || null;
      const platform = getPlatform?.() || "unknown";
      let payload = {
        clientNow: Date.now(),
        platform,
        snapshot: snap,
        events: slice,
      };
      let raw = JSON.stringify(payload);
      while (raw.length > MAX_WIRE_BYTES && slice.length > 20) {
        slice = slice.slice(Math.ceil(slice.length / 4));
        payload = { clientNow: payload.clientNow, platform, snapshot: snap, events: slice };
        raw = JSON.stringify(payload);
      }
      return payload;
    }

    function buildExportPayload({
      code = "",
      serverDump = null,
      peerDump = null,
      peerStatus = null,
      serverStatus = null,
    } = {}) {
      return {
        schema: "yt-sync-debug-v1",
        exportedAt: new Date().toISOString(),
        roomCode: maskCode(code),
        clockHint: {
          peerANow: Date.now(),
          serverNow: serverDump?.serverNow || null,
          peerBNow: peerDump?.clientNow || null,
        },
        peerA: {
          platform: getPlatform?.() || "unknown",
          snapshot: getSnapshot?.() || null,
          events: [...events],
        },
        peerB: peerDump
          ? { status: "ok", ...peerDump }
          : { status: peerStatus || "offline_or_timeout" },
        server: serverDump
          ? {
              status: "ok",
              stats: serverDump.stats || {},
              logs: Array.isArray(serverDump.logs) ? serverDump.logs : [],
            }
          : { status: serverStatus || "offline" },
      };
    }

    function bindGlobalErrors() {
      if (errorListenersBound || typeof window === "undefined") return;
      errorListenersBound = true;
      window.addEventListener("error", (e) => {
        if (!e?.message || e.message === "Script error.") return;
        log("err", "window_error", { msg: e.message });
      });
      window.addEventListener("unhandledrejection", (e) => {
        const msg = e?.reason?.message || String(e?.reason || "unhandledrejection");
        log("err", "unhandled_rejection", { msg });
      });
    }

    bindGlobalErrors();
    const readyPromise = loadFromStorage();

    return {
      ready: readyPromise,
      log,
      flushNow,
      clear,
      newTraceId,
      getCompactDump,
      buildExportPayload,
      maskVideoId,
      maskCode,
    };
  }

  root.createDebugRecorder = createDebugRecorder;
})();
