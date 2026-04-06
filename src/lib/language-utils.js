export const LANG_COOKIE = "site_lang";

export function normalizeLang(value) {
  return value === "ml" ? "ml" : "en";
}

export function pick(lang, en, ml) {
  return lang === "ml" ? ml : en;
}
