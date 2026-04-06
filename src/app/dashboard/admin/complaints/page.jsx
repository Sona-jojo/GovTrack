"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { STATUS_LABELS, PAGE_SIZE } from "@/lib/constants";
import { AppShell } from "@/components/dashboard/app-shell";
import { pick } from "@/lib/language-utils";

function Skeleton() {
    return <div className="h-6 w-full animate-pulse rounded bg-slate-200" />;
}

function getPriorityBadge(priority) {
    const p = String(priority || "").toLowerCase();
    if (p === "low") return { label: "Low", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    if (p === "medium") return { label: "Medium", cls: "border-amber-200 bg-amber-50 text-amber-800" };
    if (p === "high" || p === "urgent") return { label: "High", cls: "border-red-200 bg-red-50 text-red-800" };
    return { label: priority || "-", cls: "border-slate-200 bg-slate-100 text-slate-700" };
}

function getStatusBadge(status) {
    const s = String(status || "").toLowerCase();
    if (s === "resolved" || s === "closed") return { label: "Completed", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    if (s === "assigned") return { label: "Assigned", cls: "border-purple-200 bg-purple-50 text-purple-800" };
    if (s === "active" || s === "in_progress") return { label: "In Progress", cls: "border-amber-200 bg-amber-50 text-amber-800" };
    if (s === "submitted") return { label: "Submitted", cls: "border-blue-200 bg-blue-50 text-blue-700" };
    return { label: STATUS_LABELS[status] || status || "-", cls: "border-slate-300 bg-slate-100 text-slate-700" };
}

function fmt(d) {
    return d ? new Date(d).toLocaleDateString() : "–";
}

export default function AdminComplaints() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const lang =
        typeof window !== "undefined"
            ? document.cookie.match(/site_lang=(\w+)/)?.[1] || "en"
            : "en";

    const [complaints, setComplaints] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [copiedId, setCopiedId] = useState("");
    const [sortKey, setSortKey] = useState("created_at");
    const [sortDir, setSortDir] = useState("desc");
    const [expandedMobileRows, setExpandedMobileRows] = useState([]);

    // Role guard — redirect if not admin
    useEffect(() => {
        if (!authLoading && (!profile || profile.role !== "admin")) {
            router.replace("/login");
        }
    }, [authLoading, profile, router]);

    const fetchComplaints = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                status: statusFilter,
                search,
            });

            const res = await fetch(`/api/admin/complaints?${params.toString()}`);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json?.message || "Failed to load complaints");
            }

            setComplaints(json.data?.data || []);
            setTotalCount(json.data?.count || 0);
        } catch (err) {
            console.error("Complaints load failed:", err);
            setComplaints([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, search]);

    useEffect(() => {
        if (profile?.role === "admin") fetchComplaints();
    }, [fetchComplaints, profile]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
            return;
        }
        setSortKey(key);
        setSortDir(key === "tracking_id" ? "asc" : "desc");
    };

    const copyTrackingId = async (id) => {
        try {
            await navigator.clipboard.writeText(id);
            setCopiedId(id);
            setTimeout(() => setCopiedId(""), 1200);
        } catch {
            setCopiedId("");
        }
    };

    const visibleComplaints = useMemo(() => {
        const rank = { low: 1, medium: 2, high: 3, urgent: 3 };
        const dir = sortDir === "asc" ? 1 : -1;
        return [...complaints].sort((a, b) => {
            if (sortKey === "tracking_id") {
                return String(a.tracking_id || "").localeCompare(String(b.tracking_id || "")) * dir;
            }
            if (sortKey === "priority") {
                return ((rank[a.priority] || 0) - (rank[b.priority] || 0)) * dir;
            }
            if (sortKey === "created_at") {
                return ((new Date(a.created_at).getTime() || 0) - (new Date(b.created_at).getTime() || 0)) * dir;
            }
            return ((new Date(a.created_at).getTime() || 0) - (new Date(b.created_at).getTime() || 0)) * dir;
        });
    }, [complaints, sortDir, sortKey]);

    const toggleMobileExpand = (id) => {
        setExpandedMobileRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    if (authLoading || (!profile && !authLoading)) {
        return (
            <main className="ui-bg flex min-h-screen items-center justify-center">
                <Skeleton />
            </main>
        );
    }

    return (
        <AppShell role="admin" pageTitle="Complaints Management" profileName={profile?.name || "Admin"}>
            <div className="mx-auto max-w-7xl">

                {/* Filters & Actions */}
                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/40 bg-gradient-to-br from-blue-50/80 via-purple-50/70 to-slate-100/80 p-4 shadow-[0_12px_24px_-8px_rgba(30,64,175,0.15)] backdrop-blur-xl sm:flex-row sm:items-center">
                    <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5">
                        <span className="text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder={pick(lang, "Search tracking ID…", "ട്രാകിംഗ് ഐഡി തിരയുക...")}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full bg-transparent text-sm outline-none placeholder-slate-400"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                        <option value="">All Status</option>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                </div>

                {/* Results Count */}
                <div className="mt-4 text-sm text-slate-600">
                    Showing {complaints.length} of {totalCount} complaint{totalCount !== 1 ? 's' : ''}
                </div>

                {/* Table */}
                <div className="mt-4 rounded-2xl border border-white/40 bg-gradient-to-br from-blue-50/80 via-purple-50/70 to-slate-100/80 p-2 shadow-[0_18px_40px_-24px_rgba(30,64,175,0.45)] backdrop-blur-xl">
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85">
                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
                                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-4 py-4 font-bold text-slate-700">
                                            <button type="button" onClick={() => handleSort("tracking_id")} className="inline-flex items-center gap-1 hover:text-slate-900">
                                                Tracking ID
                                                <span>{sortKey === "tracking_id" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                                            </button>
                                        </th>
                                        <th className="px-4 py-4 font-bold text-slate-700">Category</th>
                                        <th className="px-4 py-4 font-bold text-slate-700">Local Body</th>
                                        <th className="px-4 py-4 font-bold text-slate-700">
                                            <button type="button" onClick={() => handleSort("priority")} className="inline-flex items-center gap-1 hover:text-slate-900">
                                                Priority
                                                <span>{sortKey === "priority" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                                            </button>
                                        </th>
                                        <th className="px-4 py-4 font-bold text-slate-700">Status</th>
                                        <th className="px-4 py-4 font-bold text-slate-700">Assigned To</th>
                                        <th className="px-4 py-4 font-bold text-slate-700">
                                            <button type="button" onClick={() => handleSort("created_at")} className="inline-flex items-center gap-1 hover:text-slate-900">
                                                Created
                                                <span>{sortKey === "created_at" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                                            </button>
                                        </th>
                                        <th className="px-4 py-4 font-bold text-slate-700">Deadline</th>
                                        <th className="px-4 py-4 font-bold text-slate-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <tr key={i} className="border-b border-slate-100">
                                                <td colSpan={9} className="px-4 py-5"><Skeleton /></td>
                                            </tr>
                                        ))
                                    ) : visibleComplaints.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">No complaints found</td>
                                        </tr>
                                    ) : (
                                        visibleComplaints.map((c, idx) => {
                                            const priority = getPriorityBadge(c.priority);
                                            const status = getStatusBadge(c.status);
                                            const isCopied = copiedId === c.tracking_id;
                                            const isOverdue = c.resolution_deadline && new Date(c.resolution_deadline) < new Date() && c.status !== "resolved" && c.status !== "closed";
                                            return (
                                                <tr
                                                    key={c.id}
                                                    className={`border-b border-slate-100 transition duration-300 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"} hover:-translate-y-[1px] hover:bg-blue-50/70 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]`}
                                                >
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => router.push(`/complaint/${encodeURIComponent(c.tracking_id)}?from=dashboard`)}
                                                                className="font-mono text-xs font-bold text-blue-700 underline-offset-4 hover:underline"
                                                            >
                                                                {c.tracking_id}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                title="Copy ID"
                                                                onClick={() => copyTrackingId(c.tracking_id)}
                                                                className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                                                            >
                                                                {isCopied ? "✓" : "⊡"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-sm text-slate-700">{c.category}</td>
                                                    <td className="px-4 py-4 align-top text-xs text-slate-600">{c.local_bodies?.name || "–"}</td>
                                                    <td className="px-4 py-4 align-top">
                                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.cls}`}>{priority.label}</span>
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
                                                            {isOverdue && <span className="ui-badge-pulse inline-flex rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">⏰ OVERDUE</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-xs text-slate-600">
                                                        {c.assignee?.name ? (
                                                            <div>
                                                                <p className="font-semibold text-slate-800">👤 {c.assignee.name}</p>
                                                                <p className="text-xs text-slate-500">{c.assignee.role}</p>
                                                            </div>
                                                        ) : (
                                                            "–"
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-xs text-slate-500">{fmt(c.created_at)}</td>
                                                    <td className="px-4 py-4 align-top text-xs text-slate-500">{fmt(c.resolution_deadline)}</td>
                                                    <td className="px-4 py-4 align-top">
                                                        <button
                                                            onClick={() => router.push(`/complaint/${encodeURIComponent(c.tracking_id)}?from=dashboard`)}
                                                            className="ui-button-primary rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition duration-300 hover:scale-[1.03] hover:shadow-[0_10px_24px_-10px_rgba(30,64,175,0.65)]"
                                                        >
                                                            👁️ View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile stacked cards */}
                        <div className="space-y-3 p-3 md:hidden">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4"><Skeleton /></div>
                                ))
                            ) : visibleComplaints.length === 0 ? (
                                <p className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">No complaints found</p>
                            ) : (
                                visibleComplaints.map((c) => {
                                    const priority = getPriorityBadge(c.priority);
                                    const status = getStatusBadge(c.status);
                                    const expanded = expandedMobileRows.includes(c.id);
                                    const isCopied = copiedId === c.tracking_id;
                                    const isOverdue = c.resolution_deadline && new Date(c.resolution_deadline) < new Date() && c.status !== "resolved" && c.status !== "closed";
                                    return (
                                        <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push(`/complaint/${encodeURIComponent(c.tracking_id)}?from=dashboard`)}
                                                        className="font-mono text-xs font-bold text-blue-700 underline-offset-4 hover:underline"
                                                    >
                                                        {c.tracking_id}
                                                    </button>
                                                    <p className="mt-1 text-xs text-slate-600">{c.category}</p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
                                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.cls}`}>{priority.label}</span>
                                                        {isOverdue && <span className="ui-badge-pulse inline-flex rounded-full border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-bold text-red-700">⏰</span>}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    title="Copy ID"
                                                    onClick={() => copyTrackingId(c.tracking_id)}
                                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500"
                                                >
                                                    {isCopied ? "✓" : "⊡"}
                                                </button>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between">
                                                <p className="text-sm font-semibold text-slate-700">{c.local_bodies?.name || "–"}</p>
                                                <button type="button" onClick={() => toggleMobileExpand(c.id)} className="text-xs font-semibold text-blue-700">
                                                    {expanded ? "Hide" : "More"}
                                                </button>
                                            </div>

                                            {expanded && (
                                                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                                                    <p><span className="font-semibold text-slate-700">Assigned:</span> {c.assignee?.name ? `${c.assignee.name} (${c.assignee.role})` : "–"}</p>
                                                    <p><span className="font-semibold text-slate-700">Created:</span> {fmt(c.created_at)}</p>
                                                    <p><span className="font-semibold text-slate-700">Deadline:</span> {fmt(c.resolution_deadline)}</p>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => router.push(`/complaint/${encodeURIComponent(c.tracking_id)}?from=dashboard`)}
                                                className="ui-button-primary mt-3 w-full rounded-xl px-3 py-2 text-xs font-semibold text-white transition duration-300 hover:scale-[1.02]"
                                            >
                                                👁️ View Details
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                                <p className="text-xs text-slate-500">Page {page} of {totalPages} ({totalCount} total)</p>
                                <div className="flex gap-2">
                                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs disabled:opacity-50">Prev</button>
                                    <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs disabled:opacity-50">Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
