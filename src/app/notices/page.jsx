"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { pick } from "@/lib/language-utils";

export default function NoticesEntryPage() {
  const lang =
    typeof window !== "undefined"
      ? document.cookie.match(/site_lang=(\w+)/)?.[1] || "en"
      : "en";

  const [loadingSystemNotices, setLoadingSystemNotices] = useState(true);
  const [systemNotices, setSystemNotices] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/notices?adminOnly=true&limit=10")
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        setSystemNotices(json?.success ? json.data || [] : []);
      })
      .catch(() => {
        if (mounted) setSystemNotices([]);
      })
      .finally(() => {
        if (mounted) setLoadingSystemNotices(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-teal-50/70 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-blue-50/80 via-purple-50/70 to-slate-100/80 p-6 shadow-[0_18px_40px_-24px_rgba(30,64,175,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">🔔 {pick(lang, "System Notices", "സിസ്റ്റം അറിയിപ്പുകൾ")}</h1>
              <p className="mt-1 text-sm text-slate-500">{pick(lang, "Admin / system-wide announcements for all citizens", "എല്ലാ പൗരന്മാർക്കും അഡ്മിൻ / സിസ്റ്റം അറിയിപ്പുകൾ")}</p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher lang={lang} />
              <Link href="/" className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                ← {pick(lang, "Back", "തിരികെ")}
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">📢 {pick(lang, "System Notices", "സിസ്റ്റം അറിയിപ്പുകൾ")}</h2>
              </div>
            </div>

            <div className="space-y-3">
              {loadingSystemNotices ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                ))
              ) : systemNotices.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  {pick(lang, "No system notices available right now.", "ഇപ്പോൾ സിസ്റ്റം അറിയിപ്പുകളൊന്നുമില്ല.")}
                </div>
              ) : (
                systemNotices.map((notice) => (
                  <article
                    key={notice.id}
                    className={`rounded-xl border p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md ${
                      notice.priority === "urgent"
                        ? "border-red-300 bg-red-50"
                        : notice.priority === "important"
                          ? "border-amber-300 bg-amber-50"
                          : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900">{notice.title}</h3>
                        <p className="mt-1 text-sm text-slate-700">
                          {notice.description?.length > 180 ? `${notice.description.slice(0, 180)}...` : notice.description}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {notice.priority || "normal"}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 text-center">
              <p className="text-sm font-medium text-slate-700">
                {pick(lang, "Want panchayath-level notices?", "പഞ്ചായത്ത് തല അറിയിപ്പുകൾ വേണമോ?")}
              </p>
              <Link
                href="/notices/panchayat"
                className="mt-3 inline-flex rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                {pick(lang, "Select Panchayath", "പഞ്ചായത്ത് തിരഞ്ഞെടുക്കുക")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}