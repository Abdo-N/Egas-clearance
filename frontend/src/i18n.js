import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

const savedLang = localStorage.getItem("lang") || "ar"; // Arabic is the default per the project brief

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function applyDirection(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

applyDirection(savedLang);

export function setLanguage(lang) {
  localStorage.setItem("lang", lang);
  i18n.changeLanguage(lang);
  applyDirection(lang);
}

export default i18n;
