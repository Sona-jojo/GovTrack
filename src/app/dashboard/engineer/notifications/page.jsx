"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { pick } from "@/lib/language-utils";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { formatExactDateTime, toExactTimestamp } from "@/lib/date-time";

function Skeleton() {
    return <div className="h-6 w-full animate-pulse rounded bg-slate-200" />;
}

function fmt(d) { return formatExactDateTime(d, "-"); }

function countdown(d) {
    if (!d) return "-";
    const diff = toExactTimestamp(d) - Date.now();
    if (Number.isNaN(diff)) return "-";
    if (diff <= 0) return "Overdue";
    const h = Math.floor(diff / 3600000);
    return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function StaffNotificationsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const role = profile?.role;
    const lang = typeof window !== "undefined" ? (document.cookie.match(/site_lang=(\w+)/)?.[1] || "en") : "en";

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && (!profile || (profile.role !== "engineer" && profile.role !== "clerk"))) {
            router.replace("/login");
        }
    }, [authLoading, profile, router]);

    const fetchNotifications = useCallback(async () => {
        if (!user?.id || !role) return;
        setLoading(true);
        const supabase = getSupabaseClient();
        if (!supabase) {
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from("complaints")
            .select("id, tracking_id, category, status, resolution_deadline, updated_at, created_at")
            .eq("assigned_to", user.id)
            .order("updated_at", { ascending: false })
            .limit(40);

        setNotifications(data || []);
        setLoading(false);
    }, [user, role]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            void fetchNotifications();
        }, 0);
        const intervalId = setInterval(() => {
            void fetchNotifications();
        }, 60000);
        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, [fetchNotifications]);

    const roleLabel = role === "engineer" ? "Engineer" : "Clerk";

    const sortedNotifications = useMemo(() => {
        return [...notifications].sort((a, b) => (toExactTimestamp(b.updated_at) || 0) - (toExactTimestamp(a.updated_at) || 0));
    }, [notifications]);

    if (authLoading) {
        return <main className="ui-bg flex min-h-screen items-center justify-center"><Skeleton /></main>;
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-white px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">🔔 {roleLabel} Notifications</h1>
                        <p className="mt-1 text-xs text-slate-500">{pick(lang, "Recent task updates and deadline alerts are listed here.", "പുതിയ ടാസ്‌ക് അപ്‌ഡേറ്റുകളും ഡെഡ്‌ലൈൻ അലർട്ടുകളും ഇവിടെ കാണാം.")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="ui-button-ghost rounded-full border-2 border-slate-700 px-3 py-1.5">
                            <LanguageSwitcher lang={lang} />
                        </div>
                        <button onClick={() => router.push(`/dashboard/${role}`)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>

                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    {loading ? (
                        <Skeleton />
                    ) : sortedNotifications.length === 0 ? (
                        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No notifications found.</p>
                    ) : (
                        <div className="space-y-2">
                            {sortedNotifications.map((item) => {
                                const isOverdue = countdown(item.resolution_deadline) === "Overdue";
                                return (
                                    <div key={item.id} className="ui-hover-lift rounded-lg border-2 border-slate-300 bg-white px-4 py-3 transition">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-mono text-sm font-bold text-blue-700">{item.tracking_id}</p>
                                                <p className="mt-1 text-sm text-slate-700">{item.category}</p>
                                                <p className="mt-1 text-xs text-slate-500">Updated: {fmt(item.updated_at || item.created_at)}</p>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isOverdue ? "bg-red-200 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                                                {isOverdue ? "⚠ Overdue" : `⏳ ${countdown(item.resolution_deadline)}`}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/complaint/${encodeURIComponent(item.tracking_id)}?from=dashboard`)}
                                            className="mt-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 transition hover:bg-blue-100"
                                        >
                                            ↗ Open Complaint
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
