import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";

export default function LanguageToggle() {
  const { t, i18n } = useTranslation();

  function toggle() {
    setLanguage(i18n.language === "ar" ? "en" : "ar");
  }

  return (
    <button className="lang-toggle" onClick={toggle}>
      {t("nav.language")}
    </button>
  );
}
