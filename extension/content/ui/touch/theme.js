(() => {
  const root = (window.YTSync = window.YTSync || {});
  const touch = (root.touch = root.touch || {});

  const THEMES = {
    bilibili: {
      name: "bilibili",
      accent: "#fb7299",
      accentText: "#fb7299",
      accentSoft: "rgba(251, 114, 153, 0.22)",
      accentBorder: "rgba(251, 114, 153, 0.45)",
      accentStrongBorder: "rgba(251, 114, 153, 0.72)",
      accentGlow: "rgba(251, 114, 153, 0.9)",
      accentArmBg: "rgba(251, 114, 153, 0.9)",
      accentActiveBg: "rgba(251, 114, 153, 0.35)",
      badgeBg: "transparent",
      badgeBorder: "transparent",
      badgeText: "#6ee7b7",
      returnText: "#ffd0de",
    },
    youtube: {
      name: "youtube",
      accent: "#ff0033",
      accentText: "#ff3b5c",
      accentSoft: "rgba(255, 0, 51, 0.22)",
      accentBorder: "rgba(255, 0, 51, 0.45)",
      accentStrongBorder: "rgba(255, 0, 51, 0.72)",
      accentGlow: "rgba(255, 0, 51, 0.9)",
      accentArmBg: "rgba(255, 0, 51, 0.9)",
      accentActiveBg: "rgba(255, 0, 51, 0.35)",
      badgeBg: "rgba(255, 0, 51, 0.22)",
      badgeBorder: "rgba(255, 0, 51, 0.45)",
      badgeText: "#ffd6dc",
      returnText: "#ffffff",
    },
  };

  function getSiteTheme(hostname) {
    const host = String(
      hostname || (typeof location !== "undefined" ? location?.hostname || "" : "")
    ).toLowerCase();
    if (host.endsWith("bilibili.com")) return THEMES.bilibili;
    return THEMES.youtube;
  }

  touch.THEMES = THEMES;
  touch.getSiteTheme = getSiteTheme;
})();
