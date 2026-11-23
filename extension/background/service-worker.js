const SERVER_HTTP = "https://yt-sync.your-subdomain.workers.dev";
const DEFAULT_CODE = "YT-8899";
const SESSION_KEY = "ytSyncSession";
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const LAST_CLOSED_KEY = "ytSyncLastClosed";
const LAST_CLOSED_TTL_MS = 60 * 1000;

const CONTENT_FILES = [
  "content/config.js",
  "content/ui/overlay.js",
  "content/adapters/youtube.js",
  "content/adapters/bilibili.js",
  "content/transport/ws-client.js",
  "content/sync/engine.js",
  "content/main.js",
];

const sessionStore = chrome.storage.local;

function normalizeCode(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  return cleaned || DEFAULT_CODE;
}

async function getOrCreateClientId() {
  const { ytSyncClientId } = await chrome.storage.local.get("ytSyncClientId");
  if (ytSyncClientId) return ytSyncClientId;
  const fresh = `dev_${crypto.randomUUID().slice(0, 12)}`;
  await chrome.storage.local.set({ ytSyncClientId: fresh });
  return fresh;
}

function isUnconfiguredServer() {
  return SERVER_HTTP.includes("your-subdomain");
}

function isSupportedSiteUrl(url) {
  return /^https:\/\/((www|m)\.(youtube|bilibili)|search\.bilibili)\.com\//i.test(url || "");
}

function buildTargetUrl(videoId) {
  if (!videoId) return "https://www.youtube.com/";
  if (videoId.startsWith("bili:")) {
    return `https://www.bilibili.com/${videoId.slice(5)}`;
  }
  const ytId = videoId.startsWith("yt:") ? videoId.slice(3) : videoId;
  return `https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}`;
}

function defaultSession(code = DEFAULT_CODE) {
  return {
    activeTabId: null,
    code,
    uiState: "idle",
    latencyMs: null,
    activeCount: 1,
    lastVideoId: null,
    conflict: null,
    errorText: "",
    updatedAt: 0,
  };
}

async function getSession() {
  const res = await sessionStore.get(SESSION_KEY);
  const stored = res[SESSION_KEY];
  if (!stored) return defaultSession();
  if (
    stored.uiState !== "idle" &&
    stored.updatedAt &&
    Date.now() - stored.updatedAt > SESSION_TTL_MS
  ) {
    return await clearSession(stored.code);
  }
  return stored;
}

async function setSession(patch) {
  const prev = await getSession();
  const next = { ...prev, ...patch, updatedAt: Date.now() };
  await sessionStore.set({ [SESSION_KEY]: next });
  return next;
}

async function clearSession(keepCode) {
  const prev = (await sessionStore.get(SESSION_KEY))[SESSION_KEY];
  const next = defaultSession(keepCode || prev?.code || DEFAULT_CODE);
  await sessionStore.set({ [SESSION_KEY]: next });
  return next;
}

async function sendToTabWithFallback(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: CONTENT_FILES,
    });
    return await chrome.tabs.sendMessage(tabId, message);
  }
}

chrome.runtime.onStartup.addListener(async () => {
  await getSession();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const session = await getSession();
  if (session.activeTabId === tabId) {
    if (
      session.uiState !== "idle" &&
      session.uiState !== "full" &&
      session.code &&
      session.lastVideoId
    ) {
      await sessionStore.set({
        [LAST_CLOSED_KEY]: {
          code: session.code,
          videoId: session.lastVideoId,
          closedAt: Date.now(),
        },
      });
    }
    await clearSession(session.code);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  const url = tab?.url || changeInfo.url || "";
  if (!isSupportedSiteUrl(url)) return;
  const session = await getSession();
  if (session.activeTabId === tabId && session.uiState === "waiting") {
    sendToTabWithFallback(tabId, {
      type: "CS_CONNECT",
      code: session.code,
      source: "auto",
    }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
      case "BG_GET_STATE": {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const session = await getSession();
        const saved = await chrome.storage.local.get("pairingCode");
        const code = session.uiState !== "idle" ? session.code : (saved.pairingCode || session.code || DEFAULT_CODE);

        // Guard against stale tabId if browser closed tab silently.
        if (session.activeTabId !== null) {
          try {
            await chrome.tabs.get(session.activeTabId);
          } catch {
            const reset = await clearSession(code);
            sendResponse({ session: reset, currentTabId: tab?.id || null, code });
            return;
          }
        }

        sendResponse({
          session,
          currentTabId: tab?.id || null,
          code,
        });
        return;
      }

      case "BG_CONNECT": {
        const code = normalizeCode(message.code);
        await chrome.storage.local.set({ pairingCode: code });
        await sessionStore.remove(LAST_CLOSED_KEY);

        if (isUnconfiguredServer()) {
          await setSession({
            activeTabId: null,
            code,
            uiState: "full",
            conflict: null,
            errorText: "未配置后端域名，请使用个人包",
          });
          sendResponse({ ok: false, error: "未配置后端域名，请使用个人包" });
          return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          sendResponse({ ok: false, error: "未找到当前标签页" });
          return;
        }

        let session = await getSession();
        if (
          session.activeTabId !== null &&
          session.activeTabId !== tab.id &&
          session.uiState !== "idle" &&
          session.uiState !== "full"
        ) {
          try {
            await chrome.tabs.get(session.activeTabId);
            sendResponse({ ok: false, error: "已在其他标签页同步中" });
            return;
          } catch {
            session = await clearSession(code);
          }
        }

        if (isSupportedSiteUrl(tab.url)) {
          await setSession({
            activeTabId: tab.id,
            code,
            uiState: "waiting",
            latencyMs: null,
            activeCount: 1,
            conflict: null,
            errorText: "",
          });
          try {
            await sendToTabWithFallback(tab.id, { type: "CS_CONNECT", code, source: "user" });
          } catch {
            await clearSession(code);
            sendResponse({ ok: false, error: "无法连接当前页，请刷新视频页后重试" });
            return;
          }
          sendResponse({ ok: true, mode: "current_tab" });
          return;
        }

        // Not on a supported video site: peek room first before opening a new tab.
        let peek;
        try {
          const clientId = await getOrCreateClientId();
          const resp = await fetch(
            `${SERVER_HTTP}/room/${encodeURIComponent(code)}/peek?clientId=${encodeURIComponent(clientId)}`
          );
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          peek = await resp.json();
        } catch {
          await setSession({
            activeTabId: null,
            code,
            uiState: "full",
            errorText: "服务器连接失败，请重试",
          });
          sendResponse({ ok: false, error: "服务器连接失败" });
          return;
        }

        if (peek.full) {
          await setSession({
            activeTabId: null,
            code,
            uiState: "full",
            conflict: null,
            errorText: "房间已满（仅支持双人）",
          });
          sendResponse({ ok: false, full: true });
          return;
        }

        const targetUrl = buildTargetUrl(peek.videoId);

        const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
        await setSession({
          activeTabId: newTab.id,
          code,
          uiState: "waiting",
          latencyMs: null,
          activeCount: 1,
          conflict: null,
          errorText: "",
        });
        chrome.tabs
          .sendMessage(newTab.id, { type: "CS_CONNECT", code, source: "auto" })
          .catch(() => {});
        sendResponse({ ok: true, mode: "new_tab", tabId: newTab.id });
        return;
      }

      case "BG_DISCONNECT": {
        await sessionStore.remove(LAST_CLOSED_KEY);
        const session = await getSession();
        if (session.activeTabId !== null) {
          try {
            await chrome.tabs.sendMessage(session.activeTabId, { type: "CS_DISCONNECT" });
          } catch {
            // Tab might already be closed or reloading.
          }
        }
        const reset = await clearSession(session.code);
        sendResponse({ ok: true, session: reset });
        return;
      }

      case "BG_CONFLICT_DECISION": {
        const session = await getSession();
        if (session.activeTabId !== null) {
          try {
            await chrome.tabs.sendMessage(session.activeTabId, {
              type: "CS_CONFLICT_DECISION",
              decision: message.decision,
            });
          } catch {
            // Ignore if tab gone.
          }
        }
        sendResponse({ ok: true });
        return;
      }

      case "BG_SET_SOLO": {
        const session = await getSession();
        if (session.activeTabId !== null) {
          try {
            await chrome.tabs.sendMessage(session.activeTabId, {
              type: "CS_SET_SOLO",
              enabled: Boolean(message.enabled),
            });
          } catch {
            // Ignore if tab gone.
          }
        }
        sendResponse({ ok: true });
        return;
      }

      case "BG_FOCUS_SYNC_TAB": {
        const session = await getSession();
        if (session.activeTabId !== null) {
          try {
            const tab = await chrome.tabs.update(session.activeTabId, { active: true });
            if (tab?.windowId && chrome.windows?.update) {
              await chrome.windows.update(tab.windowId, { focused: true });
            }
          } catch {
            await clearSession(session.code);
          }
        }
        sendResponse({ ok: true });
        return;
      }

      case "BG_GET_TAB_SYNC": {
        const tabId = sender.tab?.id;
        const session = await getSession();
        const shouldSync =
          Boolean(tabId) &&
          session.activeTabId === tabId &&
          session.uiState !== "idle" &&
          session.uiState !== "full";
        sendResponse({
          shouldSync,
          code: session.code,
          uiState: session.uiState,
        });
        return;
      }

      case "BG_RECLAIM_TAB": {
        const tabId = sender.tab?.id;
        if (!tabId) {
          sendResponse({ ok: false });
          return;
        }
        const session = await getSession();
        const code = normalizeCode(message.code || session.code);
        await setSession({
          activeTabId: tabId,
          code,
          uiState:
            session.uiState !== "idle" && session.uiState !== "full"
              ? session.uiState
              : "waiting",
          errorText: "",
        });
        sendResponse({ ok: true, code });
        return;
      }

      case "BG_UPDATE_STATE": {
        const tabId = sender.tab?.id;
        const session = await getSession();
        if (tabId && session.activeTabId !== null && session.activeTabId !== tabId) {
          sendResponse({ ok: false });
          return;
        }
        const nextUiState = message.uiState || session.uiState;
        if (nextUiState === "idle") {
          await clearSession(session.code);
        } else {
          await setSession({
            activeTabId: nextUiState === "full" ? null : (tabId || session.activeTabId),
            uiState: nextUiState,
            latencyMs: message.latencyMs !== undefined ? message.latencyMs : session.latencyMs,
            activeCount: message.activeCount !== undefined ? message.activeCount : session.activeCount,
            lastVideoId: message.videoId !== undefined ? message.videoId : session.lastVideoId,
            conflict: message.conflict !== undefined ? message.conflict : session.conflict,
            errorText: message.errorText !== undefined ? message.errorText : session.errorText,
          });
        }
        if (message.closePopup) {
          chrome.runtime.sendMessage({ type: "POPUP_CLOSE" }).catch(() => {});
        }
        sendResponse({ ok: true });
        return;
      }

      case "BG_CHECK_RECENT_CLOSE": {
        if (isUnconfiguredServer() || !message.videoId) {
          sendResponse({ canReconnect: false });
          return;
        }
        const session = await getSession();
        if (
          session.activeTabId !== null &&
          session.uiState !== "idle" &&
          session.uiState !== "full"
        ) {
          sendResponse({ canReconnect: false });
          return;
        }
        const data = await sessionStore.get(LAST_CLOSED_KEY);
        const closed = data[LAST_CLOSED_KEY];
        if (
          !closed ||
          !closed.code ||
          closed.videoId !== message.videoId ||
          !closed.closedAt ||
          Date.now() - closed.closedAt > LAST_CLOSED_TTL_MS
        ) {
          if (closed && (!closed.closedAt || Date.now() - closed.closedAt > LAST_CLOSED_TTL_MS)) {
            await sessionStore.remove(LAST_CLOSED_KEY);
          }
          sendResponse({ canReconnect: false });
          return;
        }
        try {
          const clientId = await getOrCreateClientId();
          const resp = await fetch(
            `${SERVER_HTTP}/room/${encodeURIComponent(closed.code)}/peek?clientId=${encodeURIComponent(clientId)}`
          );
          if (!resp.ok) {
            sendResponse({ canReconnect: false });
            return;
          }
          const peek = await resp.json();
          if (!peek.full && Number(peek.peerCount) >= 1) {
            sendResponse({
              canReconnect: true,
              code: closed.code,
              peerCount: Number(peek.peerCount),
            });
            return;
          }
        } catch {
          // Network failure: skip reconnect pill.
        }
        sendResponse({ canReconnect: false });
        return;
      }

      case "BG_CLEAR_RECENT_CLOSE": {
        await sessionStore.remove(LAST_CLOSED_KEY);
        sendResponse({ ok: true });
        return;
      }

      default:
        sendResponse({ ok: false });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err?.message || "后台通信异常，请重试" });
    }
  })();

  return true;
});
