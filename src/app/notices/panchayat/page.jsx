"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { pick } from "@/lib/language-utils";

export default function PanchayatNoticesSelectorPage() {
  const router = useRouter();
  const lang =
    typeof window !== "undefined"
      ? document.cookie.match(/site_lang=(\w+)/)?.[1] || "en"
      : "en";

  const [localBodies, setLocalBodies] = useState([]);
  const [loadingBodies, setLoadingBodies] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedLocalBodyId, setSelectedLocalBodyId] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/local-bodies")
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        setLocalBodies(json?.success ? json.data || [] : []);
      })
      .catch(() => {
        if (mounted) setLocalBodies([]);
      })
      .finally(() => {
        if (mounted) setLoadingBodies(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredBodies = useMemo(() => {
    if (!query.trim()) return localBodies;
    const q = query.trim().toLowerCase();
    return localBodies.filter((b) =>
      [b.name, b.district, b.code].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [localBodies, query]);

  const handleOpenNotices = () => {
    if (!selectedLocalBodyId) return;
    router.push(`/notices/${selectedLocalBodyId}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-teal-50/70 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-blue-50/80 via-purple-50/70 to-slate-100/80 p-6 shadow-[0_18px_40px_-24px_rgba(30,64,175,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">🏛️ {pick(lang, "Select Panchayath", "പഞ്ചായത്ത് തിരഞ്ഞെടുക്കുക")}</h1>
              <p className="mt-1 text-sm text-slate-500">{pick(lang, "Choose a local body to view its notices", "അറിയിപ്പുകൾ കാണാൻ ഒരു തദ്ദേശ സ്ഥാപനം തിരഞ്ഞെടുക്കുക")}</p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher lang={lang} />
              <Link href="/notices" className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                ← {pick(lang, "System Notices", "സിസ്റ്റം അറിയിപ്പുകൾ")}
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5">
              <span className="text-slate-400">🔎</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={pick(lang, "Search panchayath or district", "പഞ്ചായത്ത് / ജില്ല തിരയുക")}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {loadingBodies ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                ))
              ) : filteredBodies.length === 0 ? (
                <p className="sm:col-span-2 lg:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  {pick(lang, "No local bodies found.", "തദ്ദേശ സ്ഥാപനങ്ങൾ ഒന്നും ലഭിച്ചില്ല.")}
                </p>
              ) : (
                filteredBodies.map((body) => {
                  const selected = selectedLocalBodyId === body.id;
                  return (
                    <button
                      key={body.id}
                      type="button"
                      onClick={() => setSelectedLocalBodyId(body.id)}
                      className={`rounded-xl border px-4 py-3 text-left transition duration-300 hover:-translate-y-[1px] hover:shadow-md ${selected ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"}`}
                    >
                      <p className="text-sm font-bold text-slate-800">🏛️ {body.name}</p>
                      <p className="mt-1 text-xs text-slate-500">📍 {body.district || "-"}</p>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleOpenNotices}
                disabled={!selectedLocalBodyId}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition duration-300 hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pick(lang, "View Panchayath Notices", "പഞ്ചായത്ത് അറിയിപ്പുകൾ കാണുക")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
