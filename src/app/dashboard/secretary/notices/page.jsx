"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { pick } from "@/lib/language-utils";
import { AppShell } from "@/components/dashboard/app-shell";

function Skeleton() {
  return <div className="h-6 w-full animate-pulse rounded bg-slate-200" />;
}

export default function SecretaryNoticesPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const lang = typeof window !== "undefined" ? (document.cookie.match(/site_lang=(\w+)/)?.[1] || "en") : "en";

  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeDescription, setNoticeDescription] = useState("");
  const [noticeCategory, setNoticeCategory] = useState("General");
  const [noticePriority, setNoticePriority] = useState("normal");
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeError, setNoticeError] = useState("");
  const [noticeSuccess, setNoticeSuccess] = useState("");
  const [latestNotices, setLatestNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "secretary")) {
      router.replace("/login");
    }
  }, [authLoading, profile, router]);

  const fetchLatestNotices = useCallback(async () => {
    if (!profile?.local_body_id) return;
    setLoadingNotices(true);
    try {
      const params = new URLSearchParams({ localBodyId: profile.local_body_id, limit: "10" });
      const res = await fetch(`/api/notices?${params.toString()}`);
      const json = await res.json();
      if (json?.success && Array.isArray(json?.data)) {
        setLatestNotices(json.data);
      } else {
        setLatestNotices([]);
      }
    } catch {
      setLatestNotices([]);
    } finally {
      setLoadingNotices(false);
    }
  }, [profile?.local_body_id]);

  useEffect(() => {
    fetchLatestNotices();
  }, [fetchLatestNotices]);

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    setNoticeError("");
    setNoticeSuccess("");

    if (!profile?.local_body_id || !noticeTitle.trim() || !noticeDescription.trim()) {
      setNoticeError("Title and description are required.");
      return;
    }

    setNoticeSaving(true);
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localBodyId: profile.local_body_id,
          title: noticeTitle.trim(),
          description: noticeDescription.trim(),
          category: noticeCategory,
          priority: noticePriority,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }

      setNoticeSuccess("Notice published successfully.");
      setNoticeTitle("");
      setNoticeDescription("");
      setNoticeCategory("General");
      setNoticePriority("normal");
      fetchLatestNotices();
    } catch (err) {
      setNoticeError(err?.message || "Failed to publish notice.");
    } finally {
      setNoticeSaving(false);
    }
  };

  if (authLoading || (!profile && !authLoading)) {
    return <main className="ui-bg flex min-h-screen items-center justify-center"><Skeleton /></main>;
  }

  return (
    <AppShell role="secretary" pageTitle="Notices" profileName={profile?.name || "Secretary"}>
      <div className="mx-auto max-w-5xl">
        <section className="rounded-2xl border border-white/40 bg-gradient-to-br from-blue-50/80 via-purple-50/70 to-slate-100/80 p-6 shadow-[0_18px_40px_-24px_rgba(30,64,175,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">📢 {pick(lang, "Manage Public Notices", "പൊതു അറിയിപ്പുകൾ നിയന്ത്രിക്കുക")}</h1>
              <p className="mt-1 text-sm text-slate-500">{pick(lang, "Create and publish notices for your panchayath", "നിങ്ങളുടെ പഞ്ചായത്തിനായി അറിയിപ്പുകൾ സൃഷ്ടിച്ച് പ്രസിദ്ധീകരിക്കുക")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.open(`/notices/${profile?.local_body_id || ""}`, "_blank")}
                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
              >
                👁 {pick(lang, "Preview Public View", "പൊതു കാഴ്ച കാണുക")}
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateNotice} className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white/80 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Title</label>
              <input
                type="text"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="Notice title"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Category</label>
              <select value={noticeCategory} onChange={(e) => setNoticeCategory(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="General">General</option>
                <option value="Water">Water</option>
                <option value="Roads">Roads</option>
                <option value="Health">Health</option>
                <option value="Waste">Waste</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Priority</label>
              <select value={noticePriority} onChange={(e) => setNoticePriority(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</label>
              <textarea
                rows={4}
                value={noticeDescription}
                onChange={(e) => setNoticeDescription(e.target.value)}
                placeholder="Describe the announcement"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            {noticeError && <p className="sm:col-span-2 text-sm font-semibold text-red-700">{noticeError}</p>}
            {noticeSuccess && <p className="sm:col-span-2 text-sm font-semibold text-emerald-700">{noticeSuccess}</p>}

            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={noticeSaving} className="ui-button-primary rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {noticeSaving ? "Publishing..." : "Publish Notice"}
              </button>
            </div>
          </form>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white/80 p-4">
            <h2 className="text-base font-bold text-slate-900">{pick(lang, "Latest Notices", "പുതിയ അറിയിപ്പുകൾ")}</h2>
            <div className="mt-3 space-y-2">
              {loadingNotices ? (
                <Skeleton />
              ) : latestNotices.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No notices published yet.</p>
              ) : (
                latestNotices.map((n) => (
                  <div key={n.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{n.category || "General"}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${n.priority === "urgent" ? "border-red-300 bg-red-50 text-red-700" : n.priority === "important" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 bg-slate-100 text-slate-700"}`}>{n.priority}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{n.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
