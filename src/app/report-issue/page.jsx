import Link from "next/link";
import { getServerLang } from "@/lib/language";
import { pick } from "@/lib/language-utils";
import { getCategories } from "@/lib/categories";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { CategorySelectionPanel } from "@/components/citizen/category-selection-panel";

export default async function ReportIssuePage() {
  const lang = await getServerLang();
  const categories = getCategories();

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(125deg,#ecfeff_0%,#f0fdf4_38%,#fffbeb_100%)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute right-2 top-24 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="absolute -bottom-10 left-1/4 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.45)_42%,rgba(15,23,42,0.12)_100%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(#0f172a_0.8px,transparent_0.8px)] [background-size:4px_4px]" />
      </div>

      <section className="animate-fadeIn relative z-10 mx-auto w-full max-w-6xl rounded-3xl border border-white/50 bg-white/70 p-8 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <span aria-hidden="true">←</span>
            {pick(lang, "Back", "തിരികെ")}
          </Link>
          <LanguageSwitcher lang={lang} />
        </div>
        <CategorySelectionPanel lang={lang} categories={categories} />
      </section>
    </main>
  );
}
