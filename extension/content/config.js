(() => {
  const root = (window.YTSync = window.YTSync || {});
  root.CONFIG = {
    SERVER_HTTP: "https://yt-sync.your-subdomain.workers.dev",
    SERVER_WS: "wss://yt-sync.your-subdomain.workers.dev",
    DEFAULT_CODE: "YT-8899",
    PING_INTERVAL_MS: 5000,
    HEARTBEAT_INTERVAL_MS: 5000,
    PONG_WATCHDOG_MS: 12000,
    PROBE_TIMEOUT_MS: 2000,
    ECHO_TTL_MS: 400,
    SEEK_DEBOUNCE_MS: 200,
  };
})();
