const DEFAULT_CODE = "YT-8899";

const ICONS = {
  key: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>`,
  lock: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`,
  dice: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
  copy: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
  check: `<svg width="14" height="14" fill="none" stroke="#34d399" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
  play: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
};

const $ = (id) => document.getElementById(id);

let currentSession = {
  activeTabId: null,
  code: DEFAULT_CODE,
  uiState: "idle",
  latencyMs: null,
  activeCount: 1,
  conflict: null,
  errorText: "",
};
let currentTabId = null;
let copyTimer = null;

function normalizeCode(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  return cleaned || DEFAULT_CODE;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getEffectiveState() {
  const st = currentSession.uiState || "idle";
  if (
    ["waiting", "synced", "solo", "reconnecting", "conflict"].includes(st) &&
    currentSession.activeTabId !== null &&
    currentTabId !== null &&
    currentSession.activeTabId !== currentTabId
  ) {
    return "other_tab";
  }
  return st;
}

function renderStatusBar(st) {
  const badge = $("statusBadge");
  const latEl = $("latencyBadge");
  const count = Math.max(2, Number(currentSession.activeCount) || 2);

  const metaMap = {
    idle: { dot: "dot-gray", label: "未连接", pulse: false },
    waiting: { dot: "dot-amber", label: "等待成员加入", pulse: true },
    synced: { dot: "dot-green", label: `已同步 · ${count}人`, pulse: true },
    solo: { dot: "dot-amber", label: "先看模式中", pulse: false },
    conflict: { dot: "dot-amber", label: "发现不同视频", pulse: false },
    reconnecting: { dot: "dot-orange", label: "断线重连中…", pulse: true },
    full: { dot: "dot-red", label: currentSession.errorText || "连接已达上限", pulse: false },
    other_tab: { dot: "dot-blue", label: "同步在其他标签页", pulse: false },
  };

  const info = metaMap[st] || metaMap.idle;
  badge.className = `status-badge is-${st}`;
  badge.innerHTML = `<span class="dot ${info.dot}${info.pulse ? " dot-pulse" : ""}"></span><span>${escapeHtml(info.label)}</span>`;

  const rtt = currentSession.latencyMs;
  if (typeof rtt === "number" && ["synced", "solo", "other_tab"].includes(st)) {
    const tier = rtt < 80 ? "lat-good" : rtt <= 180 ? "lat-mid" : "lat-high";
    latEl.className = `latency-badge ${tier}`;
    latEl.textContent = `${rtt}ms`;
  } else {
    latEl.className = "latency-badge is-hidden";
    latEl.textContent = "";
  }
}

function render() {
  const st = getEffectiveState();
  const locked = ["waiting", "synced", "solo", "other_tab", "reconnecting", "conflict"].includes(st);

  renderStatusBar(st);

  const keyWell = $("keyWell");
  keyWell.classList.toggle("is-locked", locked);
  $("keyIcon").innerHTML = locked ? ICONS.lock : ICONS.key;

  const codeInput = $("codeInput");
  codeInput.readOnly = locked;
  if (document.activeElement !== codeInput || locked) {
    codeInput.value = currentSession.code || DEFAULT_CODE;
  }

  $("randBtn").classList.toggle("is-hidden", locked);
  if (!$("copyBtn").dataset.copied) {
    $("copyBtn").innerHTML = ICONS.copy;
  }

  const area = $("actionArea");

  if (st === "idle") {
    area.innerHTML = `<button id="mainBtn" class="btn btn-primary" type="button">${ICONS.play}<span>开始同步</span></button>`;
    $("mainBtn").onclick = handleConnect;
    return;
  }

  if (st === "waiting") {
    area.innerHTML = `<button id="mainBtn" class="btn btn-waiting" type="button">取消等待</button>`;
    $("mainBtn").onclick = handleDisconnect;
    return;
  }

  if (st === "synced") {
    area.innerHTML = `
      <div class="split-row split-action">
        <button id="soloBtn" class="btn btn-glass" type="button">先看模式</button>
        <button id="dropBtn" class="btn btn-compact btn-danger-soft" type="button">断开</button>
      </div>`;
    $("soloBtn").onclick = async () => {
      await chrome.runtime.sendMessage({ type: "BG_SET_SOLO", enabled: true });
      window.close();
    };
    $("dropBtn").onclick = handleDisconnect;
    return;
  }

  if (st === "solo") {
    area.innerHTML = `
      <div class="split-row split-action">
        <button id="exitSoloBtn" class="btn btn-primary" type="button">回到同步</button>
        <button id="dropSoloBtn" class="btn btn-compact btn-danger-soft" type="button">断开</button>
      </div>`;
    $("exitSoloBtn").onclick = async () => {
      await chrome.runtime.sendMessage({ type: "BG_SET_SOLO", enabled: false });
      window.close();
    };
    $("dropSoloBtn").onclick = handleDisconnect;
    return;
  }

  if (st === "other_tab") {
    area.innerHTML = `
      <div class="split-row split-action">
        <button id="focusTabBtn" class="btn btn-glass" type="button">↗ 回到同步页</button>
        <button id="dropTabBtn" class="btn btn-compact btn-danger-soft" type="button">断开</button>
      </div>`;
    $("focusTabBtn").onclick = async () => {
      await chrome.runtime.sendMessage({ type: "BG_FOCUS_SYNC_TAB" });
      window.close();
    };
    $("dropTabBtn").onclick = handleDisconnect;
    return;
  }

  if (st === "reconnecting") {
    area.innerHTML = `<button id="mainBtn" class="btn btn-reconnecting" type="button">放弃重连</button>`;
    $("mainBtn").onclick = handleDisconnect;
    return;
  }

  if (st === "full") {
    const retryLabel = (currentSession.errorText || "").includes("上限") ? "换码重试" : "重试";
    area.innerHTML = `<button id="mainBtn" class="btn btn-full" type="button">${retryLabel}</button>`;
    $("mainBtn").onclick = handleConnect;
    return;
  }

  if (st === "conflict") {
    const title = currentSession.conflict?.peerVideoTitle || currentSession.conflict?.peerVideoId || "另一部视频";
    const safeTitle = escapeHtml(`对方正在看《${title}》`);
    area.innerHTML = `
      <div class="marquee-wrap" title="${safeTitle}">
        <span id="marqueeTrack" class="marquee-track">${safeTitle}</span>
      </div>
      <div class="split-row split-even">
        <button id="followBtn" class="btn btn-primary" type="button">跟着走</button>
        <button id="pullBtn" class="btn btn-glass" type="button">拉进来</button>
      </div>`;

    requestAnimationFrame(() => {
      const wrap = area.querySelector(".marquee-wrap");
      const track = $("marqueeTrack");
      if (wrap && track && track.scrollWidth > wrap.clientWidth) {
        track.classList.add("is-scrolling");
      }
    });

    $("followBtn").onclick = () => sendConflictDecision("FOLLOW_PEER");
    $("pullBtn").onclick = () => sendConflictDecision("PULL_PEER");
  }
}

async function handleConnect() {
  const code = normalizeCode($("codeInput").value);
  $("codeInput").value = code;
  currentSession.code = code;
  currentSession.uiState = "waiting";
  currentSession.errorText = "";
  render();

  let res;
  try {
    res = await chrome.runtime.sendMessage({ type: "BG_CONNECT", code });
  } catch {
    res = { ok: false, error: "扩展后台无响应，请重试" };
  }
  if (!res || !res.ok) {
    currentSession.uiState = "full";
    currentSession.errorText = res?.full
      ? "连接已达上限"
      : res?.error || "连接失败，请刷新视频页重试";
    render();
  }
}

async function handleDisconnect() {
  await chrome.runtime.sendMessage({ type: "BG_DISCONNECT" });
  currentSession.activeTabId = null;
  currentSession.uiState = "idle";
  currentSession.conflict = null;
  render();
}

async function sendConflictDecision(decision) {
  await chrome.runtime.sendMessage({ type: "BG_CONFLICT_DECISION", decision });
  currentSession.uiState = "waiting";
  currentSession.conflict = null;
  render();
}

async function refreshState() {
  const res = await chrome.runtime.sendMessage({ type: "BG_GET_STATE" });
  if (res) {
    currentSession = res.session || currentSession;
    if (res.code && currentSession.uiState === "idle") {
      currentSession.code = res.code;
    }
    currentTabId = res.currentTabId ?? null;
    render();
  }
}

$("randBtn").innerHTML = ICONS.dice;
$("copyBtn").innerHTML = ICONS.copy;

$("codeInput").addEventListener("focus", (e) => {
  if (!e.target.readOnly) {
    e.target.select();
  }
});

$("codeInput").addEventListener("input", async (e) => {
  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  e.target.value = val;
  currentSession.code = val || DEFAULT_CODE;
  await chrome.storage.local.set({ pairingCode: currentSession.code });
});

$("randBtn").addEventListener("click", async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "YT-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  $("codeInput").value = code;
  currentSession.code = code;
  await chrome.storage.local.set({ pairingCode: code });
});

$("copyBtn").addEventListener("click", async () => {
  const code = normalizeCode($("codeInput").value);
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    // Ignore clipboard fallback errors.
  }
  const btn = $("copyBtn");
  btn.dataset.copied = "1";
  btn.innerHTML = ICONS.check;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    delete btn.dataset.copied;
    btn.innerHTML = ICONS.copy;
  }, 1000);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.ytSyncSession?.newValue) {
    const prevState = currentSession.uiState;
    currentSession = changes.ytSyncSession.newValue;
    render();
    if (prevState !== "synced" && currentSession.uiState === "synced") {
      setTimeout(() => window.close(), 350);
    }
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "POPUP_CLOSE") {
    window.close();
  }
});

let debugToastTimer = null;
function setDebugBtnLabel(text, durationMs = 2000) {
  const btn = $("exportLogBtn");
  if (!btn) return;
  btn.textContent = text;
  clearTimeout(debugToastTimer);
  debugToastTimer = setTimeout(() => {
    btn.textContent = "导出排障日志";
  }, durationMs);
}

$("exportLogBtn")?.addEventListener("click", async () => {
  const btn = $("exportLogBtn");
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = "打包三端日志…";
  try {
    const res = await chrome.runtime.sendMessage({ type: "BG_EXPORT_DEBUG" });
    if (!res?.ok || !res.json) {
      setDebugBtnLabel("导出失败");
      return;
    }
    try {
      const blob = new Blob([res.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename || "yt-sync-debug.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Ignore file download error on restricted mobile browsers.
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(res.json);
      copied = true;
    } catch {
      // Clipboard fallback optional.
    }
    setDebugBtnLabel(copied ? "已下载并复制" : "已下载日志");
  } catch {
    setDebugBtnLabel("导出失败");
  } finally {
    btn.disabled = false;
  }
});

$("clearLogBtn")?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "BG_CLEAR_DEBUG" }).catch(() => {});
  setDebugBtnLabel("已清空本地日志", 1600);
});

refreshState();
