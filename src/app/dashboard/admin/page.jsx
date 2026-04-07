"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { STATUS_LABELS, PAGE_SIZE } from "@/lib/constants";
import { AppShell } from "@/components/dashboard/app-shell";
import { pick } from "@/lib/language-utils";

function Skeleton() {
    return <div className="h-6 w-full animate-pulse rounded bg-slate-200" />;
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className={`group rounded-2xl border p-6 transition duration-300 ${color || "border-slate-200 bg-white"} hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(30,64,175,0.15)]`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-3 text-4xl font-bold text-slate-900">{value}</p>
                </div>
                {icon && <span className="text-3xl opacity-60 group-hover:opacity-100 transition">{icon}</span>}
            </div>
        </div>
    );
}

function fmt(d) {
    return d ? new Date(d).toLocaleDateString() : "–";
}

function getStatusBadge(status) {
    const s = String(status || "").toLowerCase();
    if (s === "resolved" || s === "closed") return { label: "Completed", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    if (s === "assigned") return { label: "Assigned", cls: "border-purple-200 bg-purple-50 text-purple-800" };
    if (s === "active" || s === "in_progress") return { label: "In Progress", cls: "border-amber-200 bg-amber-50 text-amber-800" };
    if (s === "submitted") return { label: "Submitted", cls: "border-blue-200 bg-blue-50 text-blue-700" };
    return { label: STATUS_LABELS[status] || status || "-", cls: "border-slate-300 bg-slate-100 text-slate-700" };
}

function getPriorityBadge(priority) {
    const p = String(priority || "").toLowerCase();
    if (p === "low") return { label: "Low", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    if (p === "medium") return { label: "Medium", cls: "border-amber-200 bg-amber-50 text-amber-800" };
    if (p === "high" || p === "urgent") return { label: "High", cls: "border-red-200 bg-red-50 text-red-800" };
    return { label: priority || "-", cls: "border-slate-200 bg-slate-100 text-slate-700" };
}

function reminderTimeText(ts) {
    if (!ts) return "";
    const diffMs = Math.max(0, Date.now() - new Date(ts).getTime());
    const mins = Math.floor(diffMs / (60 * 1000));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
}

export default function AdminDashboard() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [allComplaints, setAllComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reminders, setReminders] = useState([]);
    const [remindersGeneratedAt, setRemindersGeneratedAt] = useState(null);
    const [feedbackSummary, setFeedbackSummary] = useState({
        totalFeedbacks: 0,
        averageRating: 0,
        lowRatingCount: 0,
    });

    // Role guard — redirect if not admin
    useEffect(() => {
        if (!authLoading && (!profile || profile.role !== "admin")) {
            router.replace("/login");
        }
    }, [authLoading, profile, router]);

    // Fetch all complaints for stats and recent items
    const fetchAllComplaints = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/complaints?page=1`);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json?.message || "Failed to load complaints");
            }
            setAllComplaints(json.data?.data || []);
        } catch (err) {
            console.error("Failed to load complaints:", err);
            setAllComplaints([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (profile?.role === "admin") fetchAllComplaints();
    }, [fetchAllComplaints, profile]);

    const fetchFeedbackSummary = useCallback(async () => {
        try {
            const res = await fetch("/api/analytics/summary", { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || !json?.success) {
                throw new Error(json?.message || "Failed to load feedback analytics");
            }
            setFeedbackSummary(json.data?.feedbackSummary || { totalFeedbacks: 0, averageRating: 0, lowRatingCount: 0 });
        } catch {
            setFeedbackSummary({ totalFeedbacks: 0, averageRating: 0, lowRatingCount: 0 });
        }
    }, []);

    useEffect(() => {
        if (profile?.role !== "admin") return;
        fetchFeedbackSummary();
    }, [fetchFeedbackSummary, profile?.role]);

    const fetchReminders = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications/reminders", { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || !json?.success) {
                throw new Error(json?.message || "Failed to load reminders");
            }
            setReminders(json.data?.reminders || []);
            setRemindersGeneratedAt(json.data?.generatedAt || null);
        } catch {
            setReminders([]);
            setRemindersGeneratedAt(null);
        }
    }, []);

    useEffect(() => {
        if (profile?.role !== "admin") return;
        fetchReminders();
        const intervalId = setInterval(fetchReminders, 15 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [fetchReminders, profile?.role]);

    // Calculate stats from all complaints
    const stats = useMemo(() => {
        const s = {
            total: allComplaints.length,
            pending: 0,
            in_progress: 0,
            resolved: 0,
            overdue: 0,
        };
        for (const c of allComplaints) {
            if (c.status === "submitted") s.pending++;
            if (c.status === "active" || c.status === "in_progress") s.in_progress++;
            if (c.status === "resolved" || c.status === "closed") s.resolved++;
            if (
                c.resolution_deadline &&
                new Date(c.resolution_deadline) < new Date() &&
                c.status !== "resolved" &&
                c.status !== "closed"
            )
                s.overdue++;
        }
        return s;
    }, [allComplaints]);

    // Get recent complaints (last 6)
    const recentComplaints = useMemo(() => {
        return [...allComplaints]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 6);
    }, [allComplaints]);

    // Get overdue complaints for alerts
    const overdueComplaints = useMemo(() => {
        return allComplaints.filter(
            (c) =>
                c.resolution_deadline &&
                new Date(c.resolution_deadline) < new Date() &&
                c.status !== "resolved" &&
                c.status !== "closed"
        );
    }, [allComplaints]);

    if (authLoading || (!profile && !authLoading)) {
        return (
            <main className="ui-bg flex min-h-screen items-center justify-center">
                <Skeleton />
            </main>
        );
    }

    return (
        <AppShell role="admin" pageTitle="Admin Dashboard" profileName={profile?.name || "Admin"}>
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Welcome Section */}
                <div className="mt-6 rounded-2xl border border-white/40 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 p-8 shadow-[0_20px_40px_-12px_rgba(30,64,175,0.4)] backdrop-blur-xl text-white">
                    <h1 className="text-5xl font-bold">Welcome, {profile?.name || "Admin"}! 👋</h1>
                    <p className="mt-2 text-xl text-blue-100">Gov Track | Complaint Management System</p>
                </div>

                {/* Header Section */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
                    <p className="mt-1 text-slate-600">Quick summary of your complaint management system</p>
                </div>

                {reminders.length > 0 && (
                    <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900">Reminder Notifications</h2>
                            <p className="text-xs font-semibold text-amber-700">Updated {reminderTimeText(remindersGeneratedAt)}</p>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {reminders.map((item) => (
                                <div key={item.key} className="rounded-xl border border-amber-200 bg-white/75 px-3 py-2">
                                    <p className="text-sm font-semibold text-amber-900">{item.icon} {item.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <StatCard label="Total Complaints" value={stats.total} icon="📊" color="border-blue-200 bg-blue-50" />
                    <StatCard label="Pending" value={stats.pending} icon="📝" color="border-yellow-200 bg-yellow-50" />
                    <StatCard label="In Progress" value={stats.in_progress} icon="⚙️" color="border-orange-200 bg-orange-50" />
                    <StatCard label="Resolved" value={stats.resolved} icon="✅" color="border-emerald-200 bg-emerald-50" />
                    <StatCard label="Overdue" value={stats.overdue} icon="🔴" color="border-red-200 bg-red-50 ui-badge-pulse" />
                    <StatCard
                        label="Average Rating"
                        value={feedbackSummary.totalFeedbacks > 0 ? `${feedbackSummary.averageRating}/5` : "-"}
                        icon="⭐"
                        color="border-amber-200 bg-amber-50"
                    />
                </div>

                {feedbackSummary.lowRatingCount > 0 && (
                    <div className="rounded-2xl border border-rose-300 bg-gradient-to-r from-rose-50 to-orange-50 p-4">
                        <p className="text-sm font-bold text-rose-900">
                            ⚠ {feedbackSummary.lowRatingCount} complaints rated below 2⭐
                        </p>
                    </div>
                )}

                {/* Alerts Section */}
                {overdueComplaints.length > 0 && (
                    <div>
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">⚠️ Urgent Alerts</h2>
                        <div className="space-y-3">
                            {overdueComplaints.slice(0, 3).map((c) => (
                                <div key={c.id} className="rounded-2xl border-l-4 border-red-400 border border-red-200 bg-red-50/50 p-4 backdrop-blur-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-red-900">🔴 Overdue Complaint</p>
                                            <p className="mt-1 text-sm text-red-800">
                                                Tracking ID: <span className="font-mono font-semibold">{c.tracking_id}</span>
                                            </p>
                                            <p className="mt-1 text-xs text-red-700">{c.category} • {c.local_bodies?.name}</p>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/complaint/${encodeURIComponent(c.tracking_id)}`)}
                                            className="whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {overdueComplaints.length > 3 && (
                                <p className="text-center text-xs font-semibold text-red-600">
                                    +{overdueComplaints.length - 3} more overdue complaints
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Complaints */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Recent Complaints</h2>
                        <button
                            onClick={() => router.push("/dashboard/admin/complaints")}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                        >
                            View All →
                        </button>
                    </div>
                    
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <Skeleton />
                                </div>
                            ))}
                        </div>
                    ) : recentComplaints.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                            <p className="text-slate-500">No complaints yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentComplaints.map((c) => {
                                const status = getStatusBadge(c.status);
                                const priority = getPriorityBadge(c.priority);
                                const isOverdue = c.resolution_deadline && new Date(c.resolution_deadline) < new Date() && c.status !== "resolved" && c.status !== "closed";
                                return (
                                    <div
                                        key={c.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md hover:border-slate-300"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex-1">
                                                <button
                                                    onClick={() => router.push(`/complaint/${encodeURIComponent(c.tracking_id)}`)}
                                                    className="font-mono text-sm font-bold text-blue-700 hover:underline"
                                                >
                                                    {c.tracking_id}
                                                </button>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span className="text-xs text-slate-600">{c.category}</span>
                                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${status.cls}`}>
                                                        {status.label}
                                                    </span>
                                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${priority.cls}`}>
                                                        {priority.label}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="inline-flex rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                                                            ⏰ OVERDUE
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-xs text-slate-500">
                                                    {c.local_bodies?.name} • Assigned to {c.assignee?.name || "–"}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/complaint/${encodeURIComponent(c.tracking_id)}`)}
                                                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
