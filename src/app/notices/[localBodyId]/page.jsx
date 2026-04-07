"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { pick } from "@/lib/language-utils";

function fmtDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}

function priorityBadge(priority) {
  const p = String(priority || "normal").toLowerCase();
  if (p === "urgent") return "border-red-300 bg-red-50 text-red-700";
  if (p === "important") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-slate-300 bg-slate-100 text-slate-700";
}

export default function NoticesDisplayPage() {
  const params = useParams();
  const localBodyId = params?.localBodyId;
  const lang =
    typeof window !== "undefined"
      ? document.cookie.match(/site_lang=(\w+)/)?.[1] || "en"
      : "en";

  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState([]);
  const [localBodyName, setLocalBodyName] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    if (!localBodyId) return;
    let mounted = true;

    const localBodyParams = new URLSearchParams({ localBodyId: String(localBodyId), limit: "100" });

    fetch(`/api/notices?${localBodyParams.toString()}`)
      .then((res) => res.json())
      .then((localJson) => {
        if (!mounted) return;

        const localList = localJson?.success ? localJson.data || [] : [];

        setNotices(localList);
        if (localList[0]?.local_bodies?.name) {
          setLocalBodyName(localList[0].local_bodies.name);
        }
      })
      .catch(() => {
        if (mounted) setNotices([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [localBodyId]);

  const categories = useMemo(
    () => Array.from(new Set(notices.map((n) => n.category).filter(Boolean))),
    [notices],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notices.filter((n) => {
      if (category && n.category !== category) return false;
      if (priority && n.priority !== priority) return false;
      if (!q) return true;
      const hay = `${n.title || ""} ${n.description || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notices, query, category, priority]);

  const urgentFirst = useMemo(() => {
    const rank = { urgent: 3, important: 2, normal: 1 };
    return [...filtered].sort((a, b) => {
      const pr = (rank[b.priority] || 0) - (rank[a.priority] || 0);
      if (pr !== 0) return pr;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-teal-50/70 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-blue-50/80 via-purple-50/70 to-slate-100/80 p-6 shadow-[0_18px_40px_-24px_rgba(30,64,175,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">🔔 {pick(lang, "Panchayath Notices", "പഞ്ചായത്ത് അറിയിപ്പുകൾ")}</h1>
              <p className="mt-1 text-sm text-slate-500">{localBodyName || pick(lang, "Selected local body", "തിരഞ്ഞെടുത്ത തദ്ദേശ സ്ഥാപനം")}</p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher lang={lang} />
              <Link href="/notices/panchayat" className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                ← {pick(lang, "Change Panchayath", "പഞ്ചായത്ത് മാറ്റുക")}
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-white/40 bg-white/75 p-4 backdrop-blur sm:grid-cols-4">
            <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5">
              <span className="text-slate-400">🔎</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={pick(lang, "Search notices", "അറിയിപ്പുകൾ തിരയുക")}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
              ))
            ) : urgentFirst.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center">
                <p className="text-4xl">📭</p>
                <p className="mt-2 text-base font-semibold text-slate-700">{pick(lang, "No notices available for this Panchayath", "ഈ പഞ്ചായത്തിനായി അറിയിപ്പുകളൊന്നുമില്ല")}</p>
              </div>
            ) : (
              urgentFirst.map((notice) => {
                const expanded = expandedIds.includes(notice.id);
                const urgent = notice.priority === "urgent";
                const description = notice.description || "";
                const preview = description.length > 180 ? `${description.slice(0, 180)}...` : description;
                return (
                  <article
                    key={notice.id}
                    className={`rounded-2xl border bg-white/85 p-5 shadow-sm transition duration-300 hover:-translate-y-[1px] hover:shadow-lg ${urgent ? "border-red-300 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : "border-slate-200"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{notice.title}</h2>
                      <div className="flex flex-wrap items-center gap-2">
                        {urgent && <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">📢 Important</span>}
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityBadge(notice.priority)}`}>{notice.priority || "normal"}</span>
                        {notice.category && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{notice.category}</span>}
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-slate-700">{expanded ? description : preview}</p>
                    {description.length > 180 && (
                      <button type="button" onClick={() => toggleExpanded(notice.id)} className="mt-1 text-xs font-semibold text-blue-700 hover:underline">
                        {expanded ? "Read less" : "Read more"}
                      </button>
                    )}

                    <p className="mt-3 text-xs text-slate-500">🕒 {fmtDate(notice.created_at)}</p>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}