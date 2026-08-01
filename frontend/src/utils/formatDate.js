export function formatDate(value, lang) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
