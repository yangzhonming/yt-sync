(() => {
  const root = (window.YTSync = window.YTSync || {});

  function fallbackFormatTime(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
  }

  function createOverlay() {
    let host = null;
    let shadow = null;
    let els = {};
    let toastTimer = null;
    let resumeTickTimer = null;

    function clearResumeTicker() {
      if (resumeTickTimer) {
        clearInterval(resumeTickTimer);
        resumeTickTimer = null;
      }
    }

    function isAnyModalOpen() {
      return Boolean(
        els.resumeModal?.classList.contains("is-visible") ||
          els.disconnectModal?.classList.contains("is-visible") ||
          els.unlockModal?.classList.contains("is-visible") ||
          els.conflictModal?.classList.contains("is-visible")
      );
    }

    function ensureMounted() {
      const mountTarget = document.fullscreenElement || document.documentElement;
      if (!host) {
        host = document.createElement("div");
        host.id = "yt-sync-overlay-host";
        host.style.cssText =
          "position:fixed;inset:0;pointer-events:none;z-index:2147483647;";
        shadow = host.attachShadow({ mode: "open" });
        const siteAccent =
          window.YTSync?.touch?.getSiteTheme?.()?.accent || "#ff0033";
        shadow.innerHTML = `
          <style>
            :host { color-scheme: dark; forced-color-adjust: none; }
            * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; }
            .top-right {
              position: fixed;
              top: 16px;
              right: 16px;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 8px;
              pointer-events: none;
              z-index: 2;
            }
            .pill {
              display: none;
              padding: 6px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 500;
              background: rgba(17, 17, 20, 0.88);
              color: #e4e4e7;
              border: 1px solid rgba(255, 255, 255, 0.14);
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.42);
              pointer-events: none;
            }
            .pill.is-visible { display: inline-flex; align-items: center; gap: 7px; }
            .pill.is-interactive { pointer-events: auto; }
            .pill.tone-amber { border-color: rgba(245, 158, 11, 0.36); color: #fcd34d; }
            .pill.tone-orange { border-color: rgba(249, 115, 22, 0.4); color: #fdba74; }
            .pill.tone-green { border-color: rgba(34, 197, 94, 0.36); color: #86efac; }
            .pill-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #fbbf24;
              flex-shrink: 0;
              animation: pulseLive 1.5s ease-in-out infinite;
            }
            .pill.tone-orange .pill-dot { background: #fb923c; }
            .pill.tone-green .pill-dot { background: #34d399; }
            progress.pill-spinner:indeterminate::-webkit-progress-bar {
              display: none;
              background: none;
            }
            progress.pill-spinner:indeterminate::-webkit-progress-value {
              display: none;
              background: none;
            }
            progress.pill-spinner:indeterminate::-moz-progress-bar {
              display: none;
              background: none;
            }
            progress.pill-spinner:indeterminate::slider-fill {
              display: none;
              background: none;
            }
            progress.pill-spinner:indeterminate {
              --size: 12px;
              --thickness: 2px;
              --spinner-color: #fbbf24;
              --track-color: rgba(251, 191, 36, 0.22);
              --_used-spinner-duration: 1.1s;
              flex-shrink: 0;
              width: var(--size);
              height: var(--size);
              border-radius: 50%;
              appearance: none;
              margin: 0;
              padding: 0;
              border: 0;
              background: conic-gradient(
                  from 90deg,
                  var(--spinner-color) 210deg,
                  transparent 0
                )
                var(--track-color);
              animation: progress-spin var(--_used-spinner-duration) linear infinite;
            }
            @supports (background-clip: border-area) {
              progress.pill-spinner:indeterminate {
                background-clip: border-area;
                border: var(--thickness) solid transparent;
                background-origin: border-box;
              }
            }
            @supports not (background-clip: border-area) {
              progress.pill-spinner:indeterminate {
                --clip-boundary: calc(100% - var(--thickness));
                mask-image: radial-gradient(
                  farthest-side,
                  transparent var(--clip-boundary),
                  black var(--clip-boundary)
                );
                border: 0;
              }
            }
            @media (forced-colors: active) {
              progress.pill-spinner:indeterminate {
                forced-color-adjust: none;
                --spinner-color: CanvasText;
                --track-color: Canvas;
              }
            }
            .pill.tone-orange progress.pill-spinner:indeterminate {
              --spinner-color: #fb923c;
              --track-color: rgba(251, 146, 60, 0.22);
            }
            .pill.tone-green progress.pill-spinner:indeterminate {
              --spinner-color: #34d399;
              --track-color: rgba(52, 211, 153, 0.22);
            }
            @keyframes progress-spin {
              to { rotate: 1turn; }
            }
            .pill-action {
              margin-left: 4px;
              padding: 2px 9px;
              border-radius: 9999px;
              border: none;
              background: ${siteAccent};
              color: #ffffff;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
              transition: filter 0.15s ease;
            }
            .pill-action:hover { filter: brightness(1.12); }
            .toast {
              display: none;
              padding: 7px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 500;
              background: rgba(17, 17, 20, 0.90);
              color: #f4f4f5;
              border: 1px solid rgba(255, 255, 255, 0.14);
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
              animation: fadeIn 0.18s ease-out;
            }
            .toast.is-visible { display: inline-flex; align-items: center; gap: 7px; }
            .toast.tone-warn { border-color: rgba(245, 158, 11, 0.38); }
            .toast.tone-danger { border-color: rgba(239, 68, 68, 0.42); }
            .toast.tone-success { border-color: rgba(52, 211, 153, 0.34); }
            .toast-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.72);
              flex-shrink: 0;
            }
            .toast.tone-success .toast-dot { background: #34d399; }
            .toast.tone-warn .toast-dot { background: #fbbf24; }
            .toast.tone-danger .toast-dot { background: #f87171; }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-6px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulseLive {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.42; transform: scale(0.8); }
            }
            .modal-backdrop {
              display: none;
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.64);
              backdrop-filter: blur(4px);
              align-items: center;
              justify-content: center;
              padding: 16px;
              pointer-events: auto;
              overscroll-behavior: contain;
              z-index: 3;
            }
            .modal-backdrop.is-visible { display: flex; }
            .card {
              width: 100%;
              max-width: 304px;
              border-radius: 16px;
              padding: 16px;
              background: #141418;
              border: 1px solid rgba(255, 255, 255, 0.13);
              color: #f4f4f5;
              box-shadow: 0 22px 54px rgba(0, 0, 0, 0.68);
              text-align: center;
              display: flex;
              flex-direction: column;
              gap: 13px;
              overscroll-behavior: contain;
            }
            .card-title { font-size: 13px; font-weight: 600; color: #ffffff; }
            .card-sub { font-size: 12px; color: #a1a1aa; margin-top: 4px; }
            .time-compare {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin-top: 8px;
              font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
              font-variant-numeric: tabular-nums;
              font-size: 12px;
            }
            .time-chip {
              padding: 4px 9px;
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #e4e4e7;
              display: inline-flex;
              align-items: center;
              gap: 5px;
            }
            .time-chip.is-peer {
              background: rgba(16, 185, 129, 0.12);
              border-color: rgba(52, 211, 153, 0.3);
              color: #34d399;
            }
            .arrow-sep { color: #71717a; }
            .btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .btn {
              height: 40px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
              border: 1px solid transparent;
              transition: filter 0.15s ease;
              white-space: nowrap;
            }
            .btn:hover { filter: brightness(1.1); }
            .btn-wait {
              background: rgba(245, 158, 11, 0.16);
              border-color: rgba(245, 158, 11, 0.38);
              color: #fbbf24;
            }
            .btn-quit {
              background: rgba(255, 255, 255, 0.09);
              border-color: rgba(255, 255, 255, 0.15);
              color: #e4e4e7;
            }
            .btn-primary {
              background: #ff0033;
              color: #ffffff;
              font-weight: 600;
            }
            .btn-link {
              background: transparent;
              border: none;
              color: rgba(255, 255, 255, 0.58);
              font-size: 12px;
              cursor: pointer;
              padding: 2px 8px;
              align-self: center;
            }
            .btn-link:hover { color: rgba(255, 255, 255, 0.9); }
            .conflict-sub {
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              word-break: break-word;
            }
            .mono-line {
              font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
              font-variant-numeric: tabular-nums;
            }
            .live-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #34d399;
              display: inline-block;
              animation: pulseLive 1.4s ease-in-out infinite;
            }
            .unlock-btn {
              padding: 10px 20px;
              border-radius: 9999px;
              border: none;
              background: #ff0033;
              color: #ffffff;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 10px 30px rgba(255, 0, 51, 0.45);
              display: inline-flex;
              align-items: center;
              gap: 6px;
            }
            .unlock-hint { font-size: 12px; color: rgba(255, 255, 255, 0.82); }
            .unlock-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
            @media (prefers-reduced-motion: reduce) {
              .toast, .live-dot, .pill-dot { animation: none !important; transition: none !important; }
              progress.pill-spinner:indeterminate { --_used-spinner-duration: 6s; }
            }
          </style>
          <div class="top-right" role="region" aria-label="同步通知" aria-live="polite">
            <div id="pill" class="pill"></div>
            <div id="toast" class="toast">
              <span class="toast-dot"></span>
              <span id="toastText"></span>
            </div>
          </div>
          <div id="disconnectModal" class="modal-backdrop">
            <div class="card">
              <div>
                <div class="card-title">对方已断开连接，视频已暂停</div>
                <div class="card-sub">对方可能关闭了同步标签页</div>
              </div>
              <div class="btn-row">
                <button id="keepWaitBtn" class="btn btn-wait" type="button">继续等待</button>
                <button id="quitSyncBtn" class="btn btn-quit" type="button">断开退出</button>
              </div>
            </div>
          </div>
          <div id="unlockModal" class="modal-backdrop">
            <div class="unlock-wrap">
              <button id="unlockBtn" class="unlock-btn" type="button">▶ 点击屏幕同步播放</button>
              <div class="unlock-hint">浏览器拦截了自动播放，轻点一下即可解锁并追齐</div>
            </div>
          </div>
          <div id="resumeModal" class="modal-backdrop">
            <div class="card">
              <div>
                <div class="card-title">你离开期间对方继续观看了</div>
                <div id="resumeSub" class="time-compare"></div>
              </div>
              <div class="btn-row">
                <button id="followCurrentBtn" class="btn btn-primary mono-line" type="button"></button>
                <button id="pullBackBtn" class="btn btn-quit mono-line" type="button"></button>
              </div>
            </div>
          </div>
          <div id="conflictModal" class="modal-backdrop">
            <div class="card">
              <div>
                <div class="card-title">发现不同视频</div>
                <div id="conflictSub" class="card-sub conflict-sub"></div>
              </div>
              <div class="btn-row">
                <button id="conflictFollowBtn" class="btn btn-primary" type="button">跟着走</button>
                <button id="conflictPullBtn" class="btn btn-wait" type="button">拉进来</button>
              </div>
              <button id="conflictCancelBtn" class="btn-link" type="button">取消同步</button>
            </div>
          </div>
        `;
        els = {
          pill: shadow.getElementById("pill"),
          toast: shadow.getElementById("toast"),
          toastText: shadow.getElementById("toastText"),
          disconnectModal: shadow.getElementById("disconnectModal"),
          keepWaitBtn: shadow.getElementById("keepWaitBtn"),
          quitSyncBtn: shadow.getElementById("quitSyncBtn"),
          unlockModal: shadow.getElementById("unlockModal"),
          unlockBtn: shadow.getElementById("unlockBtn"),
          resumeModal: shadow.getElementById("resumeModal"),
          resumeSub: shadow.getElementById("resumeSub"),
          followCurrentBtn: shadow.getElementById("followCurrentBtn"),
          pullBackBtn: shadow.getElementById("pullBackBtn"),
          conflictModal: shadow.getElementById("conflictModal"),
          conflictSub: shadow.getElementById("conflictSub"),
          conflictFollowBtn: shadow.getElementById("conflictFollowBtn"),
          conflictPullBtn: shadow.getElementById("conflictPullBtn"),
          conflictCancelBtn: shadow.getElementById("conflictCancelBtn"),
        };
      }
      if (host.parentNode !== mountTarget) {
        mountTarget.appendChild(host);
      }
    }

    document.addEventListener("fullscreenchange", () => {
      if (host) ensureMounted();
    });

    return {
      showToast(text, durationMs = 1800, tone = "info") {
        ensureMounted();
        if (isAnyModalOpen()) return;
        els.toastText.textContent = text;
        els.toast.className = `toast is-visible tone-${tone}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          els.toast.classList.remove("is-visible");
        }, durationMs);
      },

      setPill(text, { tone = "amber", spinner = false } = {}) {
        ensureMounted();
        els.pill.textContent = "";
        if (!text) {
          els.pill.className = "pill";
          return;
        }
        const indicator = spinner
          ? document.createElement("progress")
          : document.createElement("span");
        if (spinner) {
          indicator.className = "pill-spinner";
          indicator.setAttribute("aria-label", text);
        } else {
          indicator.className = "pill-dot";
        }
        const span = document.createElement("span");
        span.textContent = text;
        els.pill.append(indicator, span);
        els.pill.className = `pill is-visible tone-${tone}`;
      },

      setActionPill({ text, actionLabel, onAction }) {
        ensureMounted();
        els.pill.textContent = "";
        const dot = document.createElement("span");
        dot.className = "pill-dot";
        const span = document.createElement("span");
        span.textContent = text;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pill-action";
        btn.textContent = actionLabel || "一起挑片";
        btn.onclick = () => {
          this.setPill("");
          onAction?.();
        };
        els.pill.append(dot, span, btn);
        els.pill.className = "pill is-visible is-interactive tone-amber";
      },

      showDisconnectCard({ onKeepWaiting, onQuit }) {
        ensureMounted();
        this.hideUnlock();
        this.hideResumeCard();
        this.hideConflictCard();
        els.toast.classList.remove("is-visible");
        els.disconnectModal.classList.add("is-visible");
        els.keepWaitBtn.onclick = () => {
          this.hideDisconnectCard();
          onKeepWaiting?.();
        };
        els.quitSyncBtn.onclick = () => {
          this.hideDisconnectCard();
          onQuit?.();
        };
      },

      hideDisconnectCard() {
        if (els.disconnectModal) {
          els.disconnectModal.classList.remove("is-visible");
        }
      },

      showUnlock(onUnlock) {
        ensureMounted();
        this.hideDisconnectCard();
        this.hideResumeCard();
        this.hideConflictCard();
        els.toast.classList.remove("is-visible");
        els.unlockModal.classList.add("is-visible");
        els.unlockBtn.onclick = () => {
          this.hideUnlock();
          onUnlock?.();
        };
      },

      hideUnlock() {
        if (els.unlockModal) {
          els.unlockModal.classList.remove("is-visible");
        }
      },

      showResumeCard({
        awayTimeSec,
        peerTimeSec,
        peerPlaying,
        peerRate,
        formatTime,
        onFollowCurrent,
        onPullBack,
      }) {
        ensureMounted();
        clearResumeTicker();
        this.hideDisconnectCard();
        this.hideUnlock();
        this.hideConflictCard();
        els.toast.classList.remove("is-visible");

        const fmt = typeof formatTime === "function" ? formatTime : fallbackFormatTime;
        const baseAwaySec = Math.max(0, Number(awayTimeSec) || 0);
        const basePeerSec = Math.max(0, Number(peerTimeSec) || 0);
        const rate = Number(peerRate) || 1;
        const openedAt = Date.now();
        const awayText = fmt(baseAwaySec);

        els.resumeSub.textContent = "";
        const awayChip = document.createElement("span");
        awayChip.className = "time-chip";
        awayChip.textContent = `离开 ${awayText}`;

        const arrow = document.createElement("span");
        arrow.className = "arrow-sep";
        arrow.textContent = "→";

        const peerChip = document.createElement("span");
        peerChip.className = "time-chip is-peer";
        if (peerPlaying) {
          const dot = document.createElement("span");
          dot.className = "live-dot";
          peerChip.appendChild(dot);
        }
        const liveTextNode = document.createTextNode(`对方 ${fmt(basePeerSec)}`);
        peerChip.appendChild(liveTextNode);

        els.resumeSub.append(awayChip, arrow, peerChip);

        els.followCurrentBtn.textContent = `跟随 ${fmt(basePeerSec)}`;
        els.pullBackBtn.textContent = `拉回 ${awayText}`;
        els.resumeModal.classList.add("is-visible");

        if (peerPlaying) {
          resumeTickTimer = setInterval(() => {
            const elapsedSec = Math.max(0, (Date.now() - openedAt) / 1000);
            const livePeerSec = basePeerSec + elapsedSec * rate;
            const liveText = fmt(livePeerSec);
            liveTextNode.textContent = `对方 ${liveText}`;
            els.followCurrentBtn.textContent = `跟随 ${liveText}`;
          }, 1000);
        }

        els.followCurrentBtn.onclick = () => {
          this.hideResumeCard();
          onFollowCurrent?.();
        };
        els.pullBackBtn.onclick = () => {
          this.hideResumeCard();
          onPullBack?.();
        };
      },

      hideResumeCard() {
        clearResumeTicker();
        if (els.resumeModal) {
          els.resumeModal.classList.remove("is-visible");
        }
      },

      showConflictCard({ peerVideoId, peerVideoTitle, onFollow, onPull, onCancel }) {
        ensureMounted();
        this.hideDisconnectCard();
        this.hideUnlock();
        this.hideResumeCard();
        els.toast.classList.remove("is-visible");
        const vid = String(peerVideoId || "");
        const siteLabel = vid.startsWith("bili:")
          ? "B 站 · "
          : vid.startsWith("yt:")
            ? "YouTube · "
            : "";
        const titleText = String(peerVideoTitle || "").trim() || vid || "另一部视频";
        if (els.conflictSub) {
          els.conflictSub.textContent = `对方正在看 ${siteLabel}《${titleText}》`;
        }
        els.conflictModal?.classList.add("is-visible");
        if (els.conflictFollowBtn) {
          els.conflictFollowBtn.onclick = () => {
            this.hideConflictCard();
            onFollow?.();
          };
        }
        if (els.conflictPullBtn) {
          els.conflictPullBtn.onclick = () => {
            this.hideConflictCard();
            onPull?.();
          };
        }
        if (els.conflictCancelBtn) {
          els.conflictCancelBtn.onclick = () => {
            this.hideConflictCard();
            onCancel?.();
          };
        }
      },

      hideConflictCard() {
        if (els.conflictModal) {
          els.conflictModal.classList.remove("is-visible");
        }
      },

      clearAll() {
        clearResumeTicker();
        this.setPill("");
        this.hideDisconnectCard();
        this.hideUnlock();
        this.hideResumeCard();
        this.hideConflictCard();
        if (els.toast) els.toast.classList.remove("is-visible");
      },
    };
  }

  root.createOverlay = createOverlay;
})();
