"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { pick } from "@/lib/language-utils";
import { AppShell } from "@/components/dashboard/app-shell";

function Skeleton() {
    return <div className="h-6 w-full animate-pulse rounded bg-slate-200" />;
}

function fmt(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

export default function SecretaryNotificationsPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const lang = typeof window !== "undefined" ? (document.cookie.match(/site_lang=(\w+)/)?.[1] || "en") : "en";

    const [notificationFilter, setNotificationFilter] = useState("escalation_overdue");
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && (!profile || profile.role !== "secretary")) {
            router.replace("/login");
        }
    }, [authLoading, profile, router]);

    const fetchNotifications = useCallback(async () => {
        setNotificationsLoading(true);
        try {
            const params = new URLSearchParams({ limit: "40" });
            if (notificationFilter && notificationFilter !== "all") {
                params.set("template", notificationFilter);
            }
            const res = await fetch(`/api/notifications?${params.toString()}`);
            const json = await res.json();
            if (json?.success && Array.isArray(json?.data)) {
                setNotifications(json.data);
            } else {
                setNotifications([]);
            }
        } catch {
            setNotifications([]);
        } finally {
            setNotificationsLoading(false);
        }
    }, [notificationFilter]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        const intervalId = setInterval(fetchNotifications, 60000);
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    if (authLoading) {
        return <main className="ui-bg flex min-h-screen items-center justify-center"><Skeleton /></main>;
    }

    return (
        <AppShell role="secretary" pageTitle="Notifications" profileName={profile?.name || "Secretary"}>
            <div className="mx-auto max-w-5xl">

                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-slate-900">{pick(lang, "Filter Notifications", "അറിയിപ്പുകൾ ഫിൽറ്റർ ചെയ്യുക")}</h2>
                        <div className="flex gap-1 rounded-lg border-2 border-slate-300 bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => setNotificationFilter("escalation_overdue")}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${notificationFilter === "escalation_overdue" ? "ui-button-primary bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                            >
                                ⚠️ Escalations
                            </button>
                            <button
                                type="button"
                                onClick={() => setNotificationFilter("all")}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${notificationFilter === "all" ? "ui-button-primary bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                            >
                                📋 All
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        {notificationsLoading ? (
                            <Skeleton />
                        ) : notifications.length === 0 ? (
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                No notifications found.
                            </p>
                        ) : (
                            notifications.map((n) => (
                                <div key={n.id} className="ui-hover-lift rounded-lg border-2 border-slate-300 bg-white px-4 py-3 transition">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 text-lg">🔔</span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-mono text-sm font-bold text-blue-700">
                                                    {n.complaints?.tracking_id || "System"}
                                                </p>
                                                <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold text-red-800">
                                                    {notificationFilter === "escalation_overdue" ? "⚠️ Escalation" : "📌 Update"}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-700">{n.message}</p>
                                            <p className="mt-1 text-xs text-slate-400">{fmt(n.created_at)}</p>
                                            {n.complaints?.tracking_id && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/complaint/${encodeURIComponent(n.complaints.tracking_id)}?from=dashboard`) }
                                                    className="mt-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 transition hover:bg-blue-100"
                                                >
                                                    ↗ Open Complaint
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
