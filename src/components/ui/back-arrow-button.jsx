"use client";

import { useRouter } from "next/navigation";
import { pick } from "@/lib/language-utils";

export function BackArrowButton({ href, lang = "en" }) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(href || "/");
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
      aria-label={pick(lang, "Go back", "തിരികെ പോകുക")}
    >
      <span aria-hidden="true">&#8592;</span>
      <span>{pick(lang, "Back", "തിരികെ")}</span>
    </button>
  );
}
