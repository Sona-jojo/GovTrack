"use client";

import { LANG_COOKIE } from "@/lib/language-utils";

export function LanguageSwitcher({ lang = "en" }) {
  const setLang = (nextLang) => {
    if (nextLang === lang) return;
    document.cookie = `${LANG_COOKIE}=${nextLang}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white p-1 text-xs shadow-sm">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-full px-3 py-1.5 font-semibold transition ${
          lang === "en"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-700 hover:bg-gray-100"
        }`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("ml")}
        className={`rounded-full px-3 py-1.5 font-semibold transition ${
          lang === "ml"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-700 hover:bg-gray-100"
        }`}
        aria-pressed={lang === "ml"}
      >
        മലയാളം
      </button>
    </div>
  );
}
