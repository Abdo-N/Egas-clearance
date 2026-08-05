import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

function IconGlobe() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 12h18M12 3c2.4 2.4 3.6 5.6 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.6-3.6-9S9.6 5.4 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.4M12 19.1v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Shared dashboard-header language and theme controls. The reviewer
// department is already shown in the adjacent employee summary, so it is not
// repeated here as a badge.
export default function TopBarControls() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isAr = i18n.language === "ar";

  return (
    <div className="topbar-controls">
      <button type="button" className="topbar-toggle-button" onClick={() => setLanguage(isAr ? "en" : "ar")}>
        <IconGlobe />
        <span>{isAr ? "English" : "العربية"}</span>
      </button>

      <button type="button" className="topbar-toggle-button" onClick={toggleTheme}>
        {theme === "light" ? <IconMoon /> : <IconSun />}
        <span>{theme === "light" ? t("common.themeToggleDark") : t("common.themeToggleLight")}</span>
      </button>
    </div>
  );
}
