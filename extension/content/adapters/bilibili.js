(() => {
  const root = (window.YTSync = window.YTSync || {});

  function createBilibiliAdapter() {
    function getVideoId(urlStr = location.href) {
      try {
        const u = new URL(urlStr);
        const videoMatch = u.pathname.match(/^\/video\/(BV[0-9A-Za-z]+|av\d+)\/?/i);
        if (videoMatch) {
          const id = videoMatch[1];
          const p = u.searchParams.get("p");
          if (p && p !== "1" && /^\d+$/.test(p)) {
            return `bili:video/${id}?p=${p}`;
          }
          return `bili:video/${id}`;
        }

        const bangumiMatch = u.pathname.match(/^\/bangumi\/play\/(ep\d+|ss\d+)\/?/i);
        if (bangumiMatch) {
          return `bili:bangumi/play/${bangumiMatch[1]}`;
        }
        return null;
      } catch {
        return null;
      }
    }

    function getSearchInfo(urlStr = location.href) {
      try {
        const u = new URL(urlStr);
        if (u.hostname === "search.bilibili.com" || u.pathname.startsWith("/search")) {
          const q = (u.searchParams.get("keyword") || "").trim();
          if (q) return { query: q, url: u.href };
        }
        return null;
      } catch {
        return null;
      }
    }

    function getVideoTitle() {
      if (!getVideoId()) return "";
      const selectors = [
        "h1.video-title",
        ".video-title",
        '[class*="mediainfo_mediaTitle"]',
        ".media-title",
        ".ep-title",
        ".video-info-title",
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const txt = el?.textContent?.trim();
        if (txt) return txt;
      }
      return document.title
        .replace(/([_-]\s*(哔哩哔哩|bilibili).*)$/i, "")
        .trim();
    }

    function getVideoElement() {
      return document.querySelector(
        ".bpx-player-video-wrap video, .bpx-player-video-wrap bwp-video, video, bwp-video"
      );
    }

    function isAdPlaying() {
      return false;
    }

    function navigateTo(videoId) {
      if (!videoId || getVideoId() === videoId) return;
      if (videoId.startsWith("bili:")) {
        const path = videoId.slice(5);
        window.location.assign(`${location.origin}/${path}`);
        return;
      }
      if (videoId.startsWith("yt:")) {
        const ytId = videoId.slice(3);
        window.location.assign(`https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}`);
      }
    }

    function waitVideoReady(timeoutMs = 15000) {
      return new Promise((resolve) => {
        const start = Date.now();

        function check() {
          const video = getVideoElement();
          if (video && (video.readyState >= 1 || video.duration > 0)) {
            resolve(video);
            return true;
          }
          if (Date.now() - start >= timeoutMs) {
            resolve(video || null);
            return true;
          }
          return false;
        }

        if (check()) return;
        const timer = setInterval(() => {
          if (check()) clearInterval(timer);
        }, 120);
      });
    }

    function watchNavigation(onChange) {
      let lastVideoId = getVideoId();
      let lastHref = location.href;

      const emitIfChanged = () => {
        const nextVideoId = getVideoId();
        const nextHref = location.href;
        if (nextVideoId !== lastVideoId || nextHref !== lastHref) {
          const prevVideoId = lastVideoId;
          lastVideoId = nextVideoId;
          lastHref = nextHref;
          setTimeout(() => {
            onChange({
              videoId: nextVideoId,
              prevVideoId,
              videoTitle: getVideoTitle(),
            });
          }, 250);
        }
      };

      window.addEventListener("popstate", emitIfChanged);
      window.addEventListener("hashchange", emitIfChanged);
      const poll = setInterval(emitIfChanged, 700);

      return () => {
        window.removeEventListener("popstate", emitIfChanged);
        window.removeEventListener("hashchange", emitIfChanged);
        clearInterval(poll);
      };
    }

    return {
      getVideoId,
      getVideoTitle,
      getVideoElement,
      getSearchInfo,
      isAdPlaying,
      navigateTo,
      waitVideoReady,
      watchNavigation,
    };
  }

  root.createBilibiliAdapter = createBilibiliAdapter;
})();
