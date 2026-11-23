(() => {
  const root = (window.YTSync = window.YTSync || {});

  function createYouTubeAdapter() {
    function getVideoId(urlStr = location.href) {
      try {
        const u = new URL(urlStr);
        if (u.pathname === "/watch") {
          const v = u.searchParams.get("v");
          return v ? `yt:${v}` : null;
        }
        const shorts = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{6,})/);
        if (shorts) return `yt:${shorts[1]}`;
        return null;
      } catch {
        return null;
      }
    }

    function getSearchInfo(urlStr = location.href) {
      try {
        const u = new URL(urlStr);
        if (u.pathname === "/results") {
          const q = (u.searchParams.get("search_query") || "").trim();
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
        "h1.ytd-watch-metadata yt-formatted-string",
        "#title h1 yt-formatted-string",
        ".slim-video-information-title .yt-core-attributed-string",
        "h2.slim-video-information-title",
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const txt = el?.textContent?.trim();
        if (txt) return txt;
      }
      return document.title
        .replace(/^\(\d+\)\s*/, "")
        .replace(/\s*-\s*YouTube$/i, "")
        .trim();
    }

    function getVideoElement() {
      return (
        document.querySelector("video.html5-main-video") ||
        document.querySelector("video")
      );
    }

    function isAdPlaying() {
      const player =
        document.querySelector("#movie_player") ||
        document.querySelector(".html5-video-player");
      if (!player) return false;
      return (
        player.classList.contains("ad-showing") ||
        player.classList.contains("ad-interrupting")
      );
    }

    function navigateTo(videoId) {
      if (!videoId || getVideoId() === videoId) return;
      if (videoId.startsWith("bili:")) {
        window.location.assign(`https://www.bilibili.com/${videoId.slice(5)}`);
        return;
      }
      const rawId = videoId.startsWith("yt:") ? videoId.slice(3) : videoId;
      const expectedFullId = `yt:${rawId}`;
      const targetPath = `/watch?v=${encodeURIComponent(rawId)}`;
      const fullUrl = `${location.origin}${targetPath}`;

      // Try YouTube desktop SPA router first to preserve WebSocket connection.
      const ytdApp = document.querySelector("ytd-app");
      if (ytdApp) {
        const a = document.createElement("a");
        a.href = targetPath;
        a.style.display = "none";
        ytdApp.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => {
          if (getVideoId() !== expectedFullId) {
            window.location.assign(fullUrl);
          }
        }, 800);
        return;
      }

      // Mobile m.youtube.com or fallback: full navigation (SW auto-resumes via activeTabId).
      window.location.assign(fullUrl);
    }

    function waitVideoReady(timeoutMs = 15000) {
      return new Promise((resolve) => {
        const start = Date.now();

        function check() {
          const video = getVideoElement();
          if (video && video.readyState >= 1) {
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
          // Give YouTube DOM a brief moment to update h1 title on SPA switch.
          setTimeout(() => {
            onChange({
              videoId: nextVideoId,
              prevVideoId,
              videoTitle: getVideoTitle(),
            });
          }, 250);
        }
      };

      window.addEventListener("yt-navigate-finish", emitIfChanged);
      window.addEventListener("popstate", emitIfChanged);
      const poll = setInterval(emitIfChanged, 800);

      return () => {
        window.removeEventListener("yt-navigate-finish", emitIfChanged);
        window.removeEventListener("popstate", emitIfChanged);
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

  root.createYouTubeAdapter = createYouTubeAdapter;
})();
