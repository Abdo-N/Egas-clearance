import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <div className="language-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={current === "en" ? "is-active" : ""}
        aria-pressed={current === "en"}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={current === "ar" ? "is-active" : ""}
        aria-pressed={current === "ar"}
        onClick={() => setLanguage("ar")}
      >
        عربي
      </button>
    </div>
  );
}
