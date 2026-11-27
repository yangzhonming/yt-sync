(() => {
  const root = (window.YTSync = window.YTSync || {});
  const touch = (root.touch = root.touch || {});

  function buildTouchCss(theme, { customThumbUri = "", includeBiliExtras = false, includeYtExtras = false } = {}) {
    const isBili = theme?.name === "bilibili";
    const biliExtrasCss = includeBiliExtras
      ? `
          .ytb-root.is-ep-open .ytb-lock-btn {
            opacity: 0 !important;
            pointer-events: none !important;
          }
          .ytb-btn-dm svg {
            width: calc(20px * var(--ytb-s, 1));
            height: calc(20px * var(--ytb-s, 1));
          }
          .ytb-btn-dm-win {
            background: rgba(0, 0, 0, 0.36);
            min-width: calc(28px * var(--ytb-s, 1));
            height: calc(26px * var(--ytb-s, 1));
            padding: 0 calc(4px * var(--ytb-s, 1));
          }
          .ytb-btn-dm-set svg {
            width: calc(20px * var(--ytb-s, 1));
            height: calc(20px * var(--ytb-s, 1));
          }
          .ytb-btn-dm-set.is-on {
            color: ${theme.accentText};
          }
          .ytb-dm-drawer {
            position: absolute;
            bottom: calc(58px * var(--ytb-s, 1));
            left: calc(10px * var(--ytb-s, 1));
            width: min(88vw, calc(242px * var(--ytb-s, 1)));
            z-index: 9;
            padding: calc(10px * var(--ytb-s, 1));
            border-radius: calc(8px * var(--ytb-s, 1));
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(18, 19, 25, 0.94);
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.48);
            display: none;
            flex-direction: column;
            gap: calc(8px * var(--ytb-s, 1));
            pointer-events: auto;
          }
          .ytb-root:not(.is-fullscreen) .ytb-dm-drawer {
            top: calc(40px * var(--ytb-s, 1));
            right: calc(10px * var(--ytb-s, 1));
            bottom: auto;
            left: auto;
          }
          .ytb-dm-drawer.is-open {
            display: flex;
          }
          .ytb-dm-row {
            display: flex;
            flex-direction: column;
            gap: calc(4px * var(--ytb-s, 1));
          }
          .ytb-dm-label {
            font-size: calc(11px * var(--ytb-s, 1));
            color: rgba(255, 255, 255, 0.68);
            font-weight: 600;
          }
          .ytb-dm-opts {
            display: flex;
            flex-wrap: wrap;
            gap: calc(4px * var(--ytb-s, 1));
          }
          .ytb-dm-opt {
            flex: 1 1 auto;
            min-width: calc(42px * var(--ytb-s, 1));
            height: calc(25px * var(--ytb-s, 1));
            padding: 0 calc(6px * var(--ytb-s, 1));
            border-radius: calc(5px * var(--ytb-s, 1));
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.88);
            font-size: calc(11px * var(--ytb-s, 1));
            font-weight: 500;
            cursor: pointer;
          }
          .ytb-dm-opt.is-active {
            background: ${theme.accentSoft};
            border-color: ${theme.accentStrongBorder};
            color: ${theme.accentText};
            font-weight: 700;
          }
          .ytb-quality-badge {
            font-size: calc(9.5px * var(--ytb-s, 1));
            line-height: 1.3;
            padding: 0 calc(4px * var(--ytb-s, 1));
            border-radius: calc(3px * var(--ytb-s, 1));
            background: ${theme.accentSoft};
            color: ${theme.accentText};
            font-weight: 600;
            flex-shrink: 0;
          }
          /* Right-Side Episode Selector Drawer (Crisp Instant Toggle, Zero Reflow Wobble) */
          .ytb-ep-drawer {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: min(82%, calc(272px * var(--ytb-s, 1)));
            z-index: 10;
            padding: calc(12px * var(--ytb-s, 1));
            background: rgba(16, 17, 23, 0.93);
            backdrop-filter: blur(12px);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            display: none;
            flex-direction: column;
            gap: calc(8px * var(--ytb-s, 1));
            pointer-events: auto;
          }
          .ytb-ep-drawer.is-open {
            display: flex;
          }
          .ytb-ep-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: calc(6px * var(--ytb-s, 1));
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
          }
          .ytb-ep-drawer-title {
            font-size: calc(12.5px * var(--ytb-s, 1));
            font-weight: 700;
            color: #ffffff;
          }
          .ytb-ep-drawer-sub {
            font-size: calc(11px * var(--ytb-s, 1));
            color: rgba(255, 255, 255, 0.62);
          }
          .ytb-ep-scroll {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: calc(6px * var(--ytb-s, 1));
            overscroll-behavior: contain;
          }
          .ytb-ep-scroll.is-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            align-content: start;
            gap: calc(6px * var(--ytb-s, 1));
          }
          .ytb-ep-item {
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            color: #e4e4e7;
            border-radius: calc(7px * var(--ytb-s, 1));
            cursor: pointer;
            text-align: left;
            flex-shrink: 0;
          }
          .ytb-ep-item.is-active {
            background: ${theme.accentSoft};
            border-color: ${theme.accentStrongBorder};
            color: #ffffff;
          }
          .ytb-ep-list-item {
            padding: calc(6px * var(--ytb-s, 1)) calc(8px * var(--ytb-s, 1));
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: calc(8px * var(--ytb-s, 1));
          }
          .ytb-ep-thumb {
            width: calc(76px * var(--ytb-s, 1));
            height: calc(43px * var(--ytb-s, 1));
            border-radius: calc(5px * var(--ytb-s, 1));
            object-fit: cover;
            flex-shrink: 0;
            background: rgba(255, 255, 255, 0.08);
          }
          .ytb-ep-list-body {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: calc(2px * var(--ytb-s, 1));
          }
          .ytb-ep-list-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: calc(10.5px * var(--ytb-s, 1));
            color: rgba(255, 255, 255, 0.62);
          }
          .ytb-ep-item.is-active .ytb-ep-list-top {
            color: ${theme.accentText};
            font-weight: 700;
          }
          .ytb-ep-list-title {
            font-size: calc(11.5px * var(--ytb-s, 1));
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .ytb-ep-grid-item {
            height: calc(38px * var(--ytb-s, 1));
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            font-size: calc(12.5px * var(--ytb-s, 1));
            font-weight: 600;
            text-align: center;
          }
          .ytb-ep-item.is-active.ytb-ep-grid-item {
            color: ${theme.accentText};
          }
          .ytb-ep-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 9px;
            padding: 0 3px;
            border-radius: 3px;
            background: ${theme.accent};
            color: #ffffff;
          }`
      : "";

    const ytExtrasCss = includeYtExtras
      ? `
          .ytb-btn-cc svg {
            width: calc(20px * var(--ytb-s, 1));
            height: calc(20px * var(--ytb-s, 1));
          }
          .ytb-btn-cc {
            color: rgba(255, 255, 255, 0.78);
          }
          .ytb-btn-cc.is-on {
            color: ${theme.accentText};
          }
          .ytb-btn-cc-win {
            background: rgba(0, 0, 0, 0.36);
            min-width: calc(28px * var(--ytb-s, 1));
            height: calc(26px * var(--ytb-s, 1));
            padding: 0 calc(4px * var(--ytb-s, 1));
          }
          .ytb-cc-drawer {
            position: absolute;
            bottom: calc(58px * var(--ytb-s, 1));
            left: calc(14px * var(--ytb-s, 1));
            transform: translateX(-50%);
            width: calc(146px * var(--ytb-s, 1));
            max-height: 62%;
            overflow-y: auto;
            overscroll-behavior: contain;
            z-index: 9;
            padding: calc(5px * var(--ytb-s, 1)) 0;
            border-radius: calc(8px * var(--ytb-s, 1));
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(18, 19, 25, 0.94);
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.48);
            display: none;
            flex-direction: column;
            align-items: stretch;
            pointer-events: auto;
          }
          .ytb-root:not(.is-fullscreen) .ytb-cc-drawer {
            top: calc(40px * var(--ytb-s, 1));
            bottom: auto;
          }
          .ytb-cc-drawer.is-open {
            display: flex;
          }
          .ytb-cc-opt {
            width: 100%;
            min-height: calc(30px * var(--ytb-s, 1));
            padding: 0 calc(10px * var(--ytb-s, 1));
            border: none;
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            flex-shrink: 0;
          }
          .ytb-cc-opt:active {
            background: rgba(255, 255, 255, 0.1);
          }
          .ytb-cc-opt.is-active {
            color: ${theme.accentText};
            font-weight: 700;
          }`
      : "";

    return `
          :host {
            all: initial;
            color-scheme: dark;
            forced-color-adjust: none;
            position: absolute;
            inset: 0;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          }
          * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }
          .ytb-root {
            color-scheme: dark;
            forced-color-adjust: none;
            position: relative;
            width: 100%;
            height: 100%;
            user-select: none;
            -webkit-user-select: none;
            pointer-events: none;
            overflow: hidden;
          }
          .ytb-shield {
            position: absolute;
            inset: 0;
            pointer-events: auto;
            touch-action: pan-y;
            z-index: 1;
          }
          .ytb-root.is-locked .ytb-shield,
          .ytb-root.is-fullscreen .ytb-shield {
            touch-action: none;
          }
          .ytb-vol-zone {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 50%;
            pointer-events: auto;
            touch-action: none;
          }
          .ytb-root.is-native-mode .ytb-shield,
          .ytb-root.is-native-mode .ytb-bottom-bar,
          .ytb-root.is-native-mode .ytb-top-bar,
          .ytb-root.is-native-mode .ytb-win-top,
          .ytb-root.is-native-mode .ytb-unmute-pill,
          .ytb-root.is-native-mode .ytb-boost-chip,
          .ytb-root.is-native-mode .ytb-speed-drawer,
          .ytb-root.is-native-mode .ytb-quality-drawer,
          .ytb-root.is-native-mode .ytb-ep-drawer,
          .ytb-root.is-native-mode .ytb-dm-drawer,
          .ytb-root.is-native-mode .ytb-cc-drawer,
          .ytb-root.is-native-mode .ytb-lock-btn,
          .ytb-root.is-ending-passthrough .ytb-shield,
          .ytb-root.is-ending-passthrough .ytb-bottom-bar,
          .ytb-root.is-ending-passthrough .ytb-top-bar,
          .ytb-root.is-ending-passthrough .ytb-win-top,
          .ytb-root.is-ending-passthrough .ytb-lock-btn,
          .ytb-root.is-locked .ytb-top-bar,
          .ytb-root.is-locked .ytb-win-top,
          .ytb-root.is-locked .ytb-bottom-bar,
          .ytb-root.is-locked .ytb-speed-drawer,
          .ytb-root.is-locked .ytb-quality-drawer,
          .ytb-root.is-locked .ytb-ep-drawer,
          .ytb-root.is-locked .ytb-dm-drawer,
          .ytb-root.is-locked .ytb-cc-drawer {
            display: none !important;
            pointer-events: none !important;
          }
          .ytb-icon-btn.is-hidden,
          .ytb-ghost-btn.is-hidden {
            display: none !important;
          }

          /* Screen Lock Floating Button (Fullscreen Right Center) */
          .ytb-lock-btn {
            position: absolute;
            right: calc(16px * var(--ytb-s, 1));
            top: 50%;
            transform: translateY(-50%);
            width: calc(40px * var(--ytb-s, 1));
            height: calc(40px * var(--ytb-s, 1));
            border-radius: 9999px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(18, 18, 22, 0.68);
            backdrop-filter: blur(8px);
            color: #ffffff;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 8;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.12s ease;
          }
          .ytb-lock-btn svg {
            width: calc(19px * var(--ytb-s, 1));
            height: calc(19px * var(--ytb-s, 1));
          }
          .ytb-root.is-fullscreen:not(.is-native-mode):not(.is-ending-passthrough) .ytb-lock-btn {
            display: flex;
          }
          .ytb-root.is-fullscreen.is-hud-open:not(.is-native-mode) .ytb-lock-btn,
          .ytb-root.is-fullscreen.is-lock-awake:not(.is-native-mode) .ytb-lock-btn {
            opacity: 1;
            pointer-events: auto;
          }
          .ytb-root.is-locked .ytb-lock-btn {
            border-color: ${theme.accentStrongBorder};
            color: ${theme.accentText};
          }
          .ytb-lock-btn.is-pulse {
            animation: ytbLockPulse 0.34s ease;
          }
          @keyframes ytbLockPulse {
            0%, 100% { transform: translateY(-50%) scale(1); }
            45% { transform: translateY(-50%) scale(1.16); }
          }

          /* Top-Center 2.0x Boost Chip */
          .ytb-boost-chip {
            position: absolute;
            top: calc(12px * var(--ytb-s, 1));
            left: 50%;
            transform: translateX(-50%) scale(0.95);
            opacity: 0;
            z-index: 9;
            padding: calc(4px * var(--ytb-s, 1)) calc(12px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(0, 0, 0, 0.68);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #ffffff;
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 600;
            display: none;
            align-items: center;
            gap: calc(6px * var(--ytb-s, 1));
            pointer-events: none;
            white-space: nowrap;
            transition: opacity 0.2s ease-out, transform 0.2s ease-out, background 0.15s ease, border-color 0.15s ease;
          }
          .ytb-boost-chip.is-visible {
            display: inline-flex;
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
          .ytb-boost-chip.is-lock-armed {
            background: ${theme.accentArmBg};
            border-color: rgba(255, 255, 255, 0.4);
          }
          .ytb-boost-chip.is-locked-speed {
            pointer-events: auto;
            cursor: pointer;
            background: rgba(20, 20, 26, 0.84);
            border-color: ${theme.accentStrongBorder};
          }
          .ytb-boost-chip.is-locked-speed:active {
            background: ${theme.accentActiveBg};
          }
          .ytb-boost-chip.is-locked-speed.is-locked-hidden {
            opacity: 0;
            transform: translateX(-50%) scale(0.95);
            pointer-events: none;
          }
          .ytb-root.is-hud-open:not(.is-locked):not(.is-native-mode) .ytb-boost-chip.is-locked-speed.is-locked-hidden {
            opacity: 1;
            transform: translateX(-50%) scale(1);
            pointer-events: auto;
          }
          .ytb-boost-arrows {
            color: ${theme.accentText};
            letter-spacing: -1px;
            animation: ytbBoostPulse 0.9s infinite ease-in-out;
          }
          .ytb-boost-chip.is-lock-armed .ytb-boost-arrows {
            color: #ffffff;
          }
          .ytb-boost-hint {
            font-size: calc(10.5px * var(--ytb-s, 1));
            color: rgba(255, 255, 255, 0.68);
            padding-left: calc(2px * var(--ytb-s, 1));
            border-left: 1px solid rgba(255, 255, 255, 0.22);
          }
          .ytb-boost-chip.is-lock-armed .ytb-boost-hint,
          .ytb-boost-chip.is-locked-speed .ytb-boost-hint {
            color: #ffffff;
          }
          @keyframes ytbBoostPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }

          /* Top-Left Auto-Muted Pill */
          .ytb-unmute-pill {
            position: absolute;
            top: calc(10px * var(--ytb-s, 1));
            left: calc(12px * var(--ytb-s, 1));
            z-index: 8;
            height: calc(26px * var(--ytb-s, 1));
            padding: 0 calc(9px * var(--ytb-s, 1));
            border-radius: calc(4px * var(--ytb-s, 1));
            border: none;
            background: rgba(20, 20, 20, 0.78);
            color: rgba(255, 255, 255, 0.94);
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 500;
            display: none;
            align-items: center;
            cursor: pointer;
            pointer-events: auto;
          }
          .ytb-unmute-pill.is-visible {
            display: inline-flex;
          }
          .ytb-root.is-fullscreen.is-hud-open .ytb-unmute-pill {
            top: calc(46px * var(--ytb-s, 1));
          }

          /* Top-Right Return Pill in Native Bar Mode */
          .ytb-return-pill {
            position: absolute;
            top: calc(10px * var(--ytb-s, 1));
            right: calc(10px * var(--ytb-s, 1));
            z-index: 20;
            height: calc(28px * var(--ytb-s, 1));
            padding: 0 calc(10px * var(--ytb-s, 1));
            border-radius: 9999px;
            border: 1px solid ${theme.accentStrongBorder};
            background: rgba(16, 16, 20, 0.84);
            backdrop-filter: blur(8px);
            color: ${theme.returnText};
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 600;
            display: none;
            align-items: center;
            gap: calc(4px * var(--ytb-s, 1));
            cursor: pointer;
            opacity: 0.55;
            pointer-events: auto;
            transition: opacity 0.2s ease;
          }
          .ytb-root.is-native-mode .ytb-return-pill {
            display: inline-flex;
          }
          .ytb-root.is-native-mode .ytb-return-pill.is-awake {
            opacity: 0.96;
            pointer-events: auto;
          }

          /* Center Play/Pause Pulse Icon */
          .ytb-play-flash {
            position: absolute;
            top: 50%;
            left: 50%;
            width: calc(48px * var(--ytb-s, 1));
            height: calc(48px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(0, 0, 0, 0.56);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
            pointer-events: none;
            z-index: 6;
          }
          .ytb-play-flash svg {
            width: calc(22px * var(--ytb-s, 1));
            height: calc(22px * var(--ytb-s, 1));
          }
          .ytb-play-flash.is-visible {
            animation: ytbPlayFlash 0.32s ease-out forwards;
          }
          @keyframes ytbPlayFlash {
            0% { opacity: 0.95; transform: translate(-50%, -50%) scale(0.84); }
            65% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.06); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1.18); }
          }

          /* Center Volume Gesture HUD */
          .ytb-gesture-hud {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            min-width: calc(120px * var(--ytb-s, 1));
            padding: calc(10px * var(--ytb-s, 1)) calc(14px * var(--ytb-s, 1));
            border-radius: calc(10px * var(--ytb-s, 1));
            background: rgba(18, 18, 22, 0.84);
            backdrop-filter: blur(8px);
            color: #ffffff;
            text-align: center;
            z-index: 8;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.14s ease;
          }
          .ytb-gesture-hud.is-visible {
            opacity: 1;
          }
          .ytb-hud-main {
            font-size: calc(15px * var(--ytb-s, 1));
            font-weight: 700;
            line-height: 1.25;
            font-variant-numeric: tabular-nums;
          }
          .ytb-hud-sub {
            margin-top: calc(3px * var(--ytb-s, 1));
            font-size: calc(11.5px * var(--ytb-s, 1));
            color: ${theme.accentText};
            font-weight: 600;
          }
          .ytb-hud-vol-row {
            margin-top: calc(7px * var(--ytb-s, 1));
            height: calc(4px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.24);
            overflow: hidden;
            display: none;
          }
          .ytb-hud-vol-fill {
            position: relative;
            height: 100%;
            background: ${theme.accent};
            color-scheme: only light;
            forced-color-adjust: none;
            overflow: hidden;
            width: 0%;
          }

          /* Centered Scrub Preview & Thumbnail */
          .ytb-scrub-preview {
            position: absolute;
            top: 46%;
            left: 50%;
            z-index: 8;
            transform: translate(-50%, -50%);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.12s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: calc(5px * var(--ytb-s, 1));
          }
          .ytb-scrub-preview.is-visible {
            opacity: 1;
          }
          .ytb-scrub-preview.is-track-mode:not(.ytb-root.is-fullscreen *) {
            top: auto;
            bottom: calc(54px * var(--ytb-s, 1));
            transform: translateX(-50%);
          }
          .ytb-root.is-fullscreen .ytb-scrub-preview.is-track-mode,
          .ytb-scrub-preview.is-swipe-mode {
            top: 46%;
            left: 50% !important;
            bottom: auto;
            transform: translate(-50%, -50%);
          }
          .ytb-scrub-thumb {
            display: none;
            position: relative;
            width: calc(128px * var(--ytb-s, 1));
            height: calc(72px * var(--ytb-s, 1));
            border-radius: calc(4px * var(--ytb-s, 1));
            overflow: hidden;
            background-color: #111111;
            border: 1px solid rgba(255, 255, 255, 0.22);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
          }
          .ytb-scrub-canvas {
            display: block;
            width: 100%;
            height: 100%;
          }
          .ytb-scrub-thumb-img {
            width: 100%;
            height: 100%;
            background-repeat: no-repeat;
          }
          .ytb-root.is-fullscreen .ytb-scrub-thumb {
            width: calc(160px * var(--ytb-s, 1));
            height: calc(90px * var(--ytb-s, 1));
          }
          .ytb-scrub-preview.has-thumb .ytb-scrub-thumb {
            display: block;
          }
          .ytb-scrub-thumb-time {
            position: absolute;
            left: 50%;
            bottom: calc(4px * var(--ytb-s, 1));
            transform: translateX(-50%);
            padding: calc(1px * var(--ytb-s, 1)) calc(6px * var(--ytb-s, 1));
            border-radius: calc(3px * var(--ytb-s, 1));
            background: rgba(0, 0, 0, 0.72);
            color: #ffffff;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(11px * var(--ytb-s, 1));
            font-weight: 600;
            white-space: nowrap;
          }
          .ytb-scrub-preview.is-swipe-mode .ytb-scrub-thumb-time {
            display: none;
          }
          .ytb-scrub-meta {
            display: inline-flex;
            align-items: center;
            gap: calc(6px * var(--ytb-s, 1));
            padding: calc(4px * var(--ytb-s, 1)) calc(10px * var(--ytb-s, 1));
            border-radius: calc(6px * var(--ytb-s, 1));
            background: rgba(18, 18, 22, 0.84);
            backdrop-filter: blur(8px);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(13px * var(--ytb-s, 1));
            font-weight: 600;
            color: #ffffff;
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
          }
          .ytb-scrub-delta {
            color: ${theme.accentText};
            font-size: calc(11.5px * var(--ytb-s, 1));
          }

          /* Mini Toast */
          .ytb-mini-toast {
            position: absolute;
            left: calc(12px * var(--ytb-s, 1));
            bottom: calc(48px * var(--ytb-s, 1));
            z-index: 9;
            padding: calc(4px * var(--ytb-s, 1)) calc(10px * var(--ytb-s, 1));
            border-radius: calc(6px * var(--ytb-s, 1));
            background: rgba(16, 16, 20, 0.82);
            color: rgba(255, 255, 255, 0.96);
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 600;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.16s ease;
            white-space: nowrap;
          }
          .ytb-root.is-fullscreen .ytb-mini-toast {
            bottom: calc(76px * var(--ytb-s, 1));
          }
          .ytb-mini-toast.is-visible {
            opacity: 1;
          }

          /* Windowed Top-Right Floating Pill */
          .ytb-win-top {
            position: absolute;
            top: calc(8px * var(--ytb-s, 1));
            right: calc(8px * var(--ytb-s, 1));
            z-index: 6;
            display: flex;
            align-items: center;
            gap: calc(5px * var(--ytb-s, 1));
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease;
          }
          .ytb-root.is-fullscreen .ytb-win-top {
            display: none;
          }
          .ytb-root:not(.is-fullscreen).is-hud-open:not(.is-native-mode) .ytb-win-top {
            opacity: 1;
            pointer-events: auto;
          }
          .ytb-ghost-btn {
            height: calc(26px * var(--ytb-s, 1));
            padding: 0 calc(8px * var(--ytb-s, 1));
            border-radius: calc(5px * var(--ytb-s, 1));
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(0, 0, 0, 0.42);
            color: rgba(255, 255, 255, 0.94);
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 600;
            cursor: pointer;
          }
          .ytb-ghost-btn:active {
            background: rgba(255, 255, 255, 0.18);
          }

          /* Fullscreen Top Gradient Bar */
          .ytb-top-bar {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            z-index: 6;
            display: none;
            align-items: center;
            justify-content: space-between;
            gap: calc(10px * var(--ytb-s, 1));
            padding: calc(10px * var(--ytb-s, 1)) calc(12px * var(--ytb-s, 1)) calc(20px * var(--ytb-s, 1));
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.68) 0%, rgba(0, 0, 0, 0) 100%);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease;
          }
          .ytb-root.is-fullscreen:not(.is-native-mode) .ytb-top-bar {
            display: flex;
          }
          .ytb-root.is-fullscreen.is-hud-open:not(.is-native-mode) .ytb-top-bar {
            opacity: 1;
            pointer-events: auto;
          }
          .ytb-top-left {
            display: flex;
            align-items: center;
            gap: calc(6px * var(--ytb-s, 1));
            min-width: 0;
            flex: 1;
          }
          .ytb-back-btn {
            width: calc(30px * var(--ytb-s, 1));
            height: calc(30px * var(--ytb-s, 1));
            border: none;
            background: transparent;
            color: #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 0;
            flex-shrink: 0;
          }
          .ytb-back-btn svg {
            width: calc(19px * var(--ytb-s, 1));
            height: calc(19px * var(--ytb-s, 1));
          }
          .ytb-title {
            color: #ffffff;
            font-size: calc(13px * var(--ytb-s, 1));
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .ytb-top-right {
            display: flex;
            align-items: center;
            gap: calc(8px * var(--ytb-s, 1));
            flex-shrink: 0;
          }
          .ytb-sync-badge {
            height: calc(26px * var(--ytb-s, 1));
            padding: 0 calc(9px * var(--ytb-s, 1));
            border-radius: 9999px;
            border: 1px solid rgba(255, 255, 255, 0.16);
            background: rgba(0, 0, 0, 0.42);
            backdrop-filter: blur(6px);
            color: rgba(255, 255, 255, 0.88);
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 600;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            gap: calc(5px * var(--ytb-s, 1));
            white-space: nowrap;
            flex-shrink: 0;
            cursor: pointer;
            forced-color-adjust: none;
            transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
          }
          .ytb-sync-badge:active {
            transform: scale(0.96);
          }
          .ytb-sync-badge-win {
            padding: 0 calc(7px * var(--ytb-s, 1));
            gap: calc(4px * var(--ytb-s, 1));
          }
          .ytb-sync-badge::before {
            content: "";
            width: calc(6px * var(--ytb-s, 1));
            height: calc(6px * var(--ytb-s, 1));
            border-radius: 50%;
            flex-shrink: 0;
            box-sizing: border-box;
          }
          .ytb-sync-badge[data-sync-state="idle"]::before {
            background: transparent;
            border: 1.5px solid rgba(255, 255, 255, 0.65);
          }
          .ytb-sync-badge[data-sync-state="waiting"],
          .ytb-sync-badge[data-sync-state="reconnecting"],
          .ytb-sync-badge[data-sync-state="conflict"] {
            background: rgba(245, 158, 11, 0.16);
            border-color: rgba(251, 191, 36, 0.42);
            color: #fde68a;
          }
          .ytb-sync-badge[data-sync-state="waiting"]::before,
          .ytb-sync-badge[data-sync-state="reconnecting"]::before,
          .ytb-sync-badge[data-sync-state="conflict"]::before {
            background: #fbbf24;
            animation: ytbSyncDotPulse 1.4s ease-in-out infinite;
          }
          .ytb-sync-badge[data-sync-state="synced"] {
            background: rgba(16, 185, 129, 0.16);
            border-color: rgba(52, 211, 153, 0.45);
            color: #6ee7b7;
          }
          .ytb-sync-badge[data-sync-state="synced"]::before {
            background: #34d399;
          }
          .ytb-sync-badge[data-sync-state="solo"] {
            background: rgba(59, 130, 246, 0.18);
            border-color: rgba(147, 197, 253, 0.45);
            color: #bfdbfe;
          }
          .ytb-sync-badge[data-sync-state="solo"]::before {
            background: #93c5fd;
          }
          .ytb-sync-badge[data-sync-state="confirm"] {
            background: rgba(244, 63, 94, 0.28);
            border-color: rgba(251, 113, 133, 0.65);
            color: #ffe4e6;
          }
          .ytb-sync-badge[data-sync-state="confirm"]::before {
            background: #fb7185;
          }
          @keyframes ytbSyncDotPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.42; transform: scale(0.82); }
          }

          /* Bottom Control Container */
          .ytb-bottom-bar {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 7;
            padding: calc(16px * var(--ytb-s, 1)) calc(10px * var(--ytb-s, 1)) calc(4px * var(--ytb-s, 1));
            background: linear-gradient(0deg, rgba(0, 0, 0, 0.74) 0%, rgba(0, 0, 0, 0.30) 58%, rgba(0, 0, 0, 0) 100%);
            opacity: 0;
            pointer-events: none;
            touch-action: none;
            transition: opacity 0.18s ease;
          }
          .ytb-root.is-fullscreen .ytb-bottom-bar {
            padding: calc(22px * var(--ytb-s, 1)) calc(14px * var(--ytb-s, 1)) calc(8px * var(--ytb-s, 1));
          }
          .ytb-root.is-hud-open:not(.is-native-mode) .ytb-bottom-bar {
            opacity: 1;
            pointer-events: auto;
          }

          .ytb-bar-fs {
            display: none;
            flex-direction: column;
            gap: calc(1px * var(--ytb-s, 1));
          }
          .ytb-bar-win {
            display: flex;
            align-items: center;
            gap: calc(4px * var(--ytb-s, 1));
          }
          .ytb-root.is-fullscreen .ytb-bar-fs {
            display: flex;
          }
          .ytb-root.is-fullscreen .ytb-bar-win {
            display: none;
          }

          .ytb-time {
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(11.5px * var(--ytb-s, 1));
            font-weight: 500;
            color: rgba(255, 255, 255, 0.92);
            white-space: nowrap;
            flex-shrink: 0;
          }
          .ytb-fs-time-row {
            padding: 0 calc(4px * var(--ytb-s, 1));
            margin-bottom: calc(-4px * var(--ytb-s, 1));
            line-height: 1.2;
          }

          /* Progress Track with Custom Emoji Thumb */
          .ytb-progress-wrap {
            position: relative;
            height: calc(34px * var(--ytb-s, 1));
            display: flex;
            align-items: center;
            cursor: pointer;
            touch-action: none;
          }
          .ytb-bar-win .ytb-progress-wrap {
            flex: 1 1 auto;
            min-width: calc(72px * var(--ytb-s, 1));
          }
          .ytb-bar-fs .ytb-progress-wrap {
            flex: none;
            width: 100%;
            height: calc(36px * var(--ytb-s, 1));
          }
          .ytb-progress-track {
            position: relative;
            width: 100%;
            height: calc(3px * var(--ytb-s, 1));
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.32);
            pointer-events: none;
          }
          .ytb-progress-fill {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 0%;
            border-radius: 9999px;
            background: ${theme.accent};
            color-scheme: only light;
            forced-color-adjust: none;
            overflow: hidden;
          }
          .ytb-fill-canvas {
            display: block;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }
          .ytb-progress-thumb {
            position: absolute;
            top: 50%;
            left: 0%;
            width: calc(20px * var(--ytb-s, 1));
            height: calc(20px * var(--ytb-s, 1));
            border-radius: 0;
            background: transparent url("${customThumbUri}") center / contain no-repeat;
            box-shadow: none;
            filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.55));
            transform: translate(-50%, -50%);
            transition: width 0.12s ease, height 0.12s ease, transform 0.12s ease;
            pointer-events: none;
          }
          .ytb-bar-win .ytb-progress-thumb {
            width: calc(18px * var(--ytb-s, 1));
            height: calc(18px * var(--ytb-s, 1));
          }
          .ytb-progress-wrap.is-dragging .ytb-progress-thumb {
            width: calc(26px * var(--ytb-s, 1));
            height: calc(26px * var(--ytb-s, 1));
            transform: translate(-50%, -50%) rotate(-8deg);
            filter: drop-shadow(0 0 4px ${theme.accentGlow});
            box-shadow: none;
          }

          .ytb-tier-2 {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: calc(6px * var(--ytb-s, 1));
          }
          .ytb-left-actions,
          .ytb-right-actions {
            display: flex;
            align-items: center;
            gap: calc(2px * var(--ytb-s, 1));
          }

          .ytb-icon-btn {
            min-width: calc(32px * var(--ytb-s, 1));
            height: calc(32px * var(--ytb-s, 1));
            padding: 0 calc(5px * var(--ytb-s, 1));
            border: none;
            border-radius: calc(6px * var(--ytb-s, 1));
            background: transparent;
            color: #ffffff;
            font-size: calc(12.5px * var(--ytb-s, 1));
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .ytb-icon-btn:active {
            background: rgba(255, 255, 255, 0.18);
          }
          .ytb-btn-play svg,
          .ytb-btn-full svg {
            width: calc(19px * var(--ytb-s, 1));
            height: calc(19px * var(--ytb-s, 1));
          }
          .ytb-btn-speed,
          .ytb-btn-quality {
            font-weight: 600;
          }
          .ytb-btn-speed.is-active-rate {
            color: ${theme.accentText};
          }

          /* Floating Compact Speed Popover */
          .ytb-speed-drawer {
            position: absolute;
            bottom: calc(58px * var(--ytb-s, 1));
            left: 86%;
            transform: translate(-50%, 6px);
            width: calc(74px * var(--ytb-s, 1));
            z-index: 9;
            padding: calc(5px * var(--ytb-s, 1)) 0;
            border-radius: calc(8px * var(--ytb-s, 1));
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(18, 19, 25, 0.94);
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.48);
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease, transform 0.15s ease;
          }
          .ytb-root:not(.is-fullscreen) .ytb-speed-drawer {
            bottom: calc(44px * var(--ytb-s, 1));
          }
          .ytb-speed-drawer.is-open {
            opacity: 1;
            transform: translate(-50%, 0);
            pointer-events: auto;
          }
          .ytb-speed-opt {
            width: 100%;
            height: calc(30px * var(--ytb-s, 1));
            padding: 0 calc(8px * var(--ytb-s, 1));
            border: none;
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: calc(12.5px * var(--ytb-s, 1));
            font-weight: 500;
            cursor: pointer;
            text-align: center;
          }
          .ytb-speed-opt:active {
            background: rgba(255, 255, 255, 0.1);
          }
          .ytb-speed-opt.is-active {
            color: ${theme.accentText};
            font-weight: 700;
          }

          /* Floating Compact Quality Popover */
          .ytb-quality-drawer {
            position: absolute;
            bottom: calc(58px * var(--ytb-s, 1));
            left: 74%;
            transform: translateX(-50%);
            width: calc(122px * var(--ytb-s, 1));
            max-height: 62%;
            overflow-y: auto;
            overscroll-behavior: contain;
            z-index: 9;
            padding: calc(5px * var(--ytb-s, 1)) 0;
            border-radius: calc(8px * var(--ytb-s, 1));
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(18, 19, 25, 0.94);
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.48);
            display: none;
            flex-direction: column;
            align-items: stretch;
            pointer-events: auto;
          }
          .ytb-root:not(.is-fullscreen) .ytb-quality-drawer {
            bottom: calc(44px * var(--ytb-s, 1));
          }
          .ytb-quality-drawer.is-open {
            display: flex;
          }
          .ytb-quality-opt {
            width: 100%;
            min-height: calc(30px * var(--ytb-s, 1));
            padding: 0 calc(10px * var(--ytb-s, 1));
            border: none;
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            font-size: calc(12px * var(--ytb-s, 1));
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: ${isBili ? "space-between" : "center"};
            gap: calc(6px * var(--ytb-s, 1));
            text-align: ${isBili ? "left" : "center"};
            flex-shrink: 0;
          }
          .ytb-quality-opt:active {
            background: rgba(255, 255, 255, 0.1);
          }
          .ytb-quality-opt.is-active {
            color: ${theme.accentText};
            font-weight: 700;
          }
          .ytb-quality-opt.is-empty {
            justify-content: center;
            color: rgba(255, 255, 255, 0.55);
            cursor: default;
          }
          ${biliExtrasCss}
          ${ytExtrasCss}
    `;
  }

  touch.buildTouchCss = buildTouchCss;
})();
