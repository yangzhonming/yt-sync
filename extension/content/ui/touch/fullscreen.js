(() => {
  const root = (window.YTSync = window.YTSync || {});
  const touch = (root.touch = root.touch || {});

  function createFullscreenController({
    isWebMax,
    enterWebMax,
    exitWebMax,
    isExtraSystemFull,
    exitNativeFallback,
    enterDomFallback,
    onSyncChange,
  } = {}) {
    let hadSystemFullscreen = false;
    let settleResizeTimer = null;

    function isSystemFullscreenNow() {
      return Boolean(
        document.fullscreenElement ||
          document.webkitFullscreenElement ||
          (typeof isExtraSystemFull === "function" && isExtraSystemFull())
      );
    }

    function isFullscreenNow() {
      return Boolean((typeof isWebMax === "function" && isWebMax()) || isSystemFullscreenNow());
    }

    function scheduleSettleResize() {
      clearTimeout(settleResizeTimer);
      settleResizeTimer = setTimeout(() => {
        settleResizeTimer = null;
        try {
          window.dispatchEvent?.(new Event("resize"));
        } catch {}
      }, 160);
    }

    function lockLandscape() {
      try {
        if (typeof screen !== "undefined") {
          screen?.orientation?.lock?.("landscape")?.catch?.(() => {});
        }
      } catch {}
    }

    function requestDocFullscreen() {
      let pending = null;
      try {
        const rootEl = document.documentElement;
        pending = (rootEl?.requestFullscreen || rootEl?.webkitRequestFullscreen)?.call(rootEl);
      } catch {}
      if (pending && typeof pending.then === "function") {
        pending.then(() => {
          lockLandscape();
          scheduleSettleResize();
        }, () => {});
      } else {
        lockLandscape();
        scheduleSettleResize();
      }
    }

    function exitDocFullscreen() {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        try {
          (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
        } catch {}
      }
      try {
        if (typeof screen !== "undefined") {
          screen?.orientation?.unlock?.();
        }
      } catch {}
      scheduleSettleResize();
    }

    function toggle() {
      if (typeof isWebMax === "function" && isWebMax()) {
        exitWebMax?.();
        exitDocFullscreen();
        onSyncChange?.();
        try {
          window.dispatchEvent?.(new Event("resize"));
        } catch {}
        return;
      }
      if (isSystemFullscreenNow()) {
        if (typeof exitNativeFallback === "function" && exitNativeFallback()) {
          exitDocFullscreen();
          return;
        }
        exitDocFullscreen();
        onSyncChange?.();
        return;
      }
      const enteredWeb = typeof enterWebMax === "function" ? enterWebMax() : true;
      if (enteredWeb) {
        requestDocFullscreen();
        onSyncChange?.();
        try {
          window.dispatchEvent?.(new Event("resize"));
        } catch {}
        return;
      }
      enterDomFallback?.();
    }

    function handleFullscreenChange() {
      const sysFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (sysFull) {
        hadSystemFullscreen = true;
      } else if (hadSystemFullscreen) {
        hadSystemFullscreen = false;
        if (typeof isWebMax === "function" && isWebMax()) {
          exitWebMax?.();
        }
      }
      scheduleSettleResize();
    }

    function reset({ exitSystem = false } = {}) {
      hadSystemFullscreen = false;
      clearTimeout(settleResizeTimer);
      settleResizeTimer = null;
      if (exitSystem) {
        exitDocFullscreen();
      }
    }

    return {
      isSystemFullscreenNow,
      isFullscreenNow,
      requestDocFullscreen,
      exitDocFullscreen,
      toggle,
      handleFullscreenChange,
      reset,
    };
  }

  touch.createFullscreenController = createFullscreenController;
})();
