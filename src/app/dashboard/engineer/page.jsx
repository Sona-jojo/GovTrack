"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { STATUS_LABELS, PAGE_SIZE, TRANSITIONS } from "@/lib/constants";
import { pick } from "@/lib/language-utils";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import dynamic from "next/dynamic";
import { formatExactDateTime, toExactTimestamp } from "@/lib/date-time";

const ComplaintMap = dynamic(() => import("@/components/dashboard/complaint-map").then((m) => m.ComplaintMap), { ssr: false });

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
    if (s === "active") return { label: "Active", cls: "border-blue-200 bg-blue-50 text-blue-700" };
    return { label: STATUS_LABELS[status] || status || "-", cls: "border-slate-300 bg-slate-100 text-slate-700" };
}

export default function StaffDashboard() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const lang = typeof window !== "undefined" ? (document.cookie.match(/site_lang=(\w+)/)?.[1] || "en") : "en";
    const role = profile?.role;

    const [complaints, setComplaints] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [tabFilter, setTabFilter] = useState("active"); // active | completed
    const [tabView, setTabView] = useState("table");
    const [updateModal, setUpdateModal] = useState(null);
    const [newStatus, setNewStatus] = useState("");
    const [remarks, setRemarks] = useState("");
    const [proofFile, setProofFile] = useState(null);
    const [updateError, setUpdateError] = useState("");
    const [copiedId, setCopiedId] = useState("");
    const [sortKey, setSortKey] = useState("created_at");
    const [sortDir, setSortDir] = useState("desc");
    const [expandedMobileRows, setExpandedMobileRows] = useState([]);

    useEffect(() => {
        if (!authLoading && (!profile || (profile.role !== "engineer" && profile.role !== "clerk"))) {
            router.replace("/login");
        }
    }, [authLoading, profile, router]);

    const fetchComplaints = useCallback(async () => {
        if (!user?.id || !role) return;
        setLoading(true);
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
            .from("complaints")
            .select("*, local_bodies(name), complaint_images(image_url, image_type)", { count: "exact" })
            // Show only complaints directly assigned to this user.
            .eq("assigned_to", user.id)
            .order("created_at", { ascending: false });

        // Apply status filter
        if (tabFilter === "active") {
            query = query.filter("status", "not.in", "(resolved,closed)");
        } else {
            query = query.filter("status", "in", "(resolved,closed)");
        }

        query = query.range(from, to);

        const { data, count } = await query;
        setComplaints(data || []);
        setTotal(count || 0);
        setLoading(false);
    }, [user, role, page, tabFilter]);

    useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const handleStatusUpdate = async () => {
        if (!updateModal || !newStatus) return;
        setUpdateError("");
        try {
            const res = await fetch(`/api/complaints/${updateModal}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, remarks }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.success) {
                throw new Error(json.message || "Failed to update complaint status");
            }

            if (proofFile) {
                const supabase = getSupabaseClient();
                const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
                const token = data?.session?.access_token || "";

                const fd = new FormData();
                fd.append("file", proofFile);
                fd.append("image_type", "proof");

                const uploadRes = await fetch(`/api/complaints/${updateModal}/images`, {
                    method: "POST",
                    body: fd,
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                const uploadJson = await uploadRes.json().catch(() => ({}));
                if (!uploadRes.ok || !uploadJson.success) {
                    throw new Error(uploadJson.message || "Status updated, but proof image upload failed");
                }
            }

            setUpdateModal(null);
            setNewStatus("");
            setRemarks("");
            setProofFile(null);
            fetchComplaints();
        } catch (err) {
            setUpdateError(err.message || "Failed to update complaint");
        }
    };

    const allowedTransitions = useMemo(() => {
        if (!updateModal || !role) return [];
        const c = complaints.find((x) => x.id === updateModal);
        if (!c) return [];
        return TRANSITIONS[role]?.[c.status] || [];
    }, [updateModal, role, complaints]);

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
            if (sortKey === "deadline") {
                return ((toExactTimestamp(a.resolution_deadline) || 0) - (toExactTimestamp(b.resolution_deadline) || 0)) * dir;
            }
            return ((toExactTimestamp(a.created_at) || 0) - (toExactTimestamp(b.created_at) || 0)) * dir;
        });
    }, [complaints, sortDir, sortKey]);

    const toggleMobileExpand = (id) => {
        setExpandedMobileRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    if (authLoading) {
        return <main className="ui-bg flex min-h-screen items-center justify-center"><Skeleton /></main>;
    }

    const roleLabel = role === "engineer" ? "Engineer" : "Clerk";

    return (
        <main className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-white px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{roleLabel} Dashboard</h1>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-lg">👤</span>
                            <p className="text-sm font-semibold text-slate-700">{profile?.name || "Staff Member"}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{pick(lang, "Manage assigned complaints efficiently", "നിയോഗിച്ച പരാതികൾ കാര്യക്ഷമമായി നിയന്ത്രിക്കുക")}</p>
                    </div>
                    <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start">
                        <div className="ui-button-ghost rounded-full border-2 border-slate-700 px-3 py-1.5">
                            <LanguageSwitcher lang={lang} />
                        </div>
                        <button onClick={() => { getSupabaseClient()?.auth.signOut(); router.replace("/login"); }} className="ui-button-ghost rounded-xl border border-slate-400 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Sign Out</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-white/70 p-4 backdrop-blur-sm">
                    <div className="flex gap-1 rounded-lg border-2 border-slate-300 bg-slate-100 p-1">
                        <button onClick={() => { setTabFilter("active"); setPage(1); }} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tabFilter === "active" ? "ui-button-primary bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
                            ⏳ Active Tasks
                        </button>
                        <button onClick={() => { setTabFilter("completed"); setPage(1); }} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tabFilter === "completed" ? "ui-button-primary bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
                            ✅ Completed
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push(`/dashboard/${role}/notifications`)}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                    >
                        🔔 Notifications
                    </button>
                    <div className="flex w-full gap-1 rounded-lg border-2 border-slate-300 bg-slate-100 p-1 sm:ml-auto sm:w-auto">
                        <button onClick={() => setTabView("table")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tabView === "table" ? "ui-button-primary bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}>📋 Table</button>
                        <button onClick={() => setTabView("map")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tabView === "map" ? "ui-button-primary bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}>🗺️ Map</button>
                    </div>
                </div>

                {/* Table */}
                {tabView === "table" && (
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
                                            <th className="px-4 py-4 font-bold text-slate-700">
                                                <button type="button" onClick={() => handleSort("priority")} className="inline-flex items-center gap-1 hover:text-slate-900">
                                                    Priority
                                                    <span>{sortKey === "priority" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                                                </button>
                                            </th>
                                            <th className="px-4 py-4 font-bold text-slate-700">Status</th>
                                            <th className="px-4 py-4 font-bold text-slate-700">
                                                <button type="button" onClick={() => handleSort("deadline")} className="inline-flex items-center gap-1 hover:text-slate-900">
                                                    Deadline
                                                    <span>{sortKey === "deadline" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                                                </button>
                                            </th>
                                            <th className="px-4 py-4 font-bold text-slate-700">Countdown</th>
                                            <th className="px-4 py-4 font-bold text-slate-700">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            Array.from({ length: 4 }).map((_, i) => (
                                                <tr key={i} className="border-b border-slate-100">
                                                    <td colSpan={6} className="px-4 py-5"><Skeleton /></td>
                                                </tr>
                                            ))
                                        ) : visibleComplaints.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">{tabFilter === "active" ? "No active tasks" : "No completed tasks"}</td>
                                            </tr>
                                        ) : (
                                            visibleComplaints.map((c, idx) => {
                                                const priority = getPriorityBadge(c.priority);
                                                const status = getStatusBadge(c.status);
                                                const isCopied = copiedId === c.tracking_id;
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
                                                                    {isCopied ? "✓" : "⧉"}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-sm text-slate-700">{c.category}</td>
                                                        <td className="px-4 py-4 align-top">
                                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.cls}`}>{priority.label}</span>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-xs text-slate-500">{fmt(c.resolution_deadline)}</td>
                                                        <td className={`px-4 py-4 align-top text-xs font-semibold ${countdown(c.resolution_deadline) === "Overdue" ? "text-red-700" : "text-slate-700"}`}>{countdown(c.resolution_deadline)}</td>
                                                        <td className="px-4 py-4 align-top">
                                                            {tabFilter === "active" && (
                                                                <button
                                                                    onClick={() => { setUpdateModal(c.id); setNewStatus(""); setRemarks(""); setProofFile(null); }}
                                                                    className="ui-button-primary rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition duration-300 hover:scale-[1.03] hover:shadow-[0_10px_24px_-10px_rgba(30,64,175,0.65)]"
                                                                >
                                                                    ⬆️ Update
                                                                </button>
                                                            )}
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
                                    <p className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">{tabFilter === "active" ? "No active tasks" : "No completed tasks"}</p>
                                ) : (
                                    visibleComplaints.map((c) => {
                                        const priority = getPriorityBadge(c.priority);
                                        const status = getStatusBadge(c.status);
                                        const expanded = expandedMobileRows.includes(c.id);
                                        const isCopied = copiedId === c.tracking_id;
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
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
                                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.cls}`}>{priority.label}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        title="Copy ID"
                                                        onClick={() => copyTrackingId(c.tracking_id)}
                                                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500"
                                                    >
                                                        {isCopied ? "✓" : "⧉"}
                                                    </button>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between">
                                                    <p className="text-sm font-semibold text-slate-800">{c.category}</p>
                                                    <button type="button" onClick={() => toggleMobileExpand(c.id)} className="text-xs font-semibold text-blue-700">
                                                        {expanded ? "Hide details" : "Show details"}
                                                    </button>
                                                </div>

                                                {expanded && (
                                                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                                                        <p><span className="font-semibold text-slate-700">Deadline:</span> {fmt(c.resolution_deadline)}</p>
                                                        <p><span className="font-semibold text-slate-700">Countdown:</span> <span className={countdown(c.resolution_deadline) === "Overdue" ? "text-red-700 font-semibold" : ""}>{countdown(c.resolution_deadline)}</span></p>
                                                    </div>
                                                )}

                                                {tabFilter === "active" && (
                                                    <button
                                                        onClick={() => { setUpdateModal(c.id); setNewStatus(""); setRemarks(""); setProofFile(null); setUpdateError(""); }}
                                                        className="ui-button-primary mt-3 w-full rounded-xl px-3 py-2 text-xs font-semibold text-white transition duration-300 hover:scale-[1.02]"
                                                    >
                                                        ⬆️ Update Status
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                                    <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                                    <div className="flex gap-2">
                                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs disabled:opacity-50">Prev</button>
                                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs disabled:opacity-50">Next</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Map */}
                {tabView === "map" && (
                    <div className="mt-4 h-[58vh] rounded-2xl border border-slate-200 bg-white p-1 sm:h-[500px]">
                        <ComplaintMap complaints={complaints} />
                    </div>
                )}

                {/* Update modal */}
                {updateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="ui-glass w-full max-w-md rounded-2xl p-6">
                            <h3 className="text-xl font-bold text-slate-900">⬆️ Update Complaint</h3>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">New Status</label>
                                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                                        <option value="">Select…</option>
                                        {allowedTransitions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                    </select>
                                    {allowedTransitions.length === 0 && (
                                        <p className="mt-1 text-xs text-amber-700">No status transitions available for the current complaint status.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Remarks</label>
                                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                                </div>
                                {newStatus === "resolved" && (
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700">Upload Proof Image</label>
                                        <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="mt-1 w-full text-sm" />
                                    </div>
                                )}
                                {updateError && (
                                    <p className="text-sm font-semibold text-red-700">{updateError}</p>
                                )}
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => { setUpdateModal(null); setUpdateError(""); }} className="ui-button-ghost rounded-xl border-2 border-slate-400 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100">✕ Cancel</button>
                                <button onClick={handleStatusUpdate} disabled={!newStatus} className="ui-button-primary rounded-xl px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:scale-[1.03] disabled:opacity-50">Update</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
