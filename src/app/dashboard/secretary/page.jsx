"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { STATUS_LABELS, PAGE_SIZE, TRANSITIONS } from "@/lib/constants";
import { pick } from "@/lib/language-utils";
import { AppShell } from "@/components/dashboard/app-shell";
import dynamic from "next/dynamic";
import { formatStaffDisplayLabel } from "@/lib/api/staff-management";
import { formatExactDateTime, getIndiaDateStamp, toExactTimestamp } from "@/lib/date-time";

const ComplaintMap = dynamic(() => import("@/components/dashboard/complaint-map").then((m) => m.ComplaintMap), { ssr: false });

function Skeleton() {
    return <div className="h-6 w-full animate-pulse rounded bg-slate-200" />;
}

function ToastStack({ toasts, onDismiss }) {
    return (
        <div className="fixed right-4 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6 sm:w-full">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`rounded-2xl border px-4 py-3 shadow-[0_16px_30px_-16px_rgba(15,23,42,0.45)] ${toast.type === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold">{toast.title}</p>
                            <p className="mt-1 text-sm opacity-90">{toast.message}</p>
                        </div>
                        <button type="button" onClick={() => onDismiss(toast.id)} className="text-sm font-bold opacity-70 transition hover:opacity-100">
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className={`ui-hover-lift rounded-xl border-2 p-4 transition ${color || "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-slate-600">{label}</p>
                <span className="text-2xl">{icon || "📊"}</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

function fmt(d) { return formatExactDateTime(d, "-"); }

function getPriorityBadge(priority) {
    const p = String(priority || "").toLowerCase();
    if (p === "low") return { label: "Low", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    if (p === "medium") return { label: "Medium", cls: "border-amber-200 bg-amber-50 text-amber-800" };
    if (p === "high" || p === "urgent") return { label: "High", cls: "border-red-200 bg-red-50 text-red-800" };
    return { label: priority || "-", cls: "border-slate-200 bg-slate-100 text-slate-700" };
}

function getStatusBadge(status, isOverdue) {
    const s = String(status || "").toLowerCase();
    if (isOverdue || s === "overdue") return { label: "Overdue", cls: "border-red-300 bg-red-100 text-red-800 ui-badge-pulse" };
    if (s === "resolved" || s === "closed") return { label: "Resolved", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    if (["submitted", "under_review", "assigned", "inspection_scheduled", "on_hold", "pending"].includes(s)) {
        return { label: "Pending", cls: "border-slate-300 bg-slate-100 text-slate-700" };
    }
    return { label: STATUS_LABELS[status] || status || "-", cls: "border-blue-200 bg-blue-50 text-blue-700" };
}

export default function SecretaryDashboard() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isComplaintsPage = pathname?.includes("/dashboard/secretary/complaints");
    const lang = typeof window !== "undefined" ? (document.cookie.match(/site_lang=(\w+)/)?.[1] || "en") : "en";

    const [complaints, setComplaints] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [filters, setFilters] = useState({ status: "", priority: "", search: "" });
    const [assignModal, setAssignModal] = useState(null);
    const [assignTo, setAssignTo] = useState("");
    const [assignRole, setAssignRole] = useState("engineer");
    const [deadline, setDeadline] = useState("");
    const [assignNotes, setAssignNotes] = useState("");
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignError, setAssignError] = useState("");
    const [tabView, setTabView] = useState("table"); // table | map
    const [lastEscalationCount, setLastEscalationCount] = useState(0);
    const [copiedId, setCopiedId] = useState("");
    const [sortKey, setSortKey] = useState("created_at");
    const [sortDir, setSortDir] = useState("desc");
    const [expandedMobileRows, setExpandedMobileRows] = useState([]);
    const [toasts, setToasts] = useState([]);

    const pushToast = useCallback((type, title, message) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((current) => [...current, { id, type, title, message }]);
        window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3200);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    useEffect(() => {
        if (!authLoading && (!profile || profile.role !== "secretary")) {
            router.replace("/login");
        }
    }, [authLoading, profile, router]);

    const runEscalationMonitor = useCallback(async () => {
        try {
            const res = await fetch("/api/complaints/escalations/run", {
                method: "POST",
            });
            const json = await res.json();
            if (json?.success) {
                setLastEscalationCount(Number(json?.data?.escalatedCount || 0));
            }
        } catch {
            setLastEscalationCount(0);
        }
    }, []);

    const fetchComplaints = useCallback(async () => {
        if (!profile?.local_body_id) return;
        setLoading(true);
        try {
            await runEscalationMonitor();

            const supabase = getSupabaseClient();
            const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
            const token = data?.session?.access_token || "";

            const qs = new URLSearchParams({
                page: String(page),
                status: filters.status || "",
                priority: filters.priority || "",
                search: filters.search || "",
            });

            const res = await fetch(`/api/secretary/complaints?${qs.toString()}`, {
                cache: "no-store",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed to load complaints");

            setComplaints(Array.isArray(json.data?.data) ? json.data.data : []);
            setTotalCount(Number(json.data?.count || 0));
        } catch (err) {
            setComplaints([]);
            setTotalCount(0);
            pushToast("error", "Unable to load complaints", err?.message || "Please try again");
        } finally {
            setLoading(false);
        }
    }, [profile, page, filters, runEscalationMonitor, pushToast]);

    useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchComplaints();
        }, 60000);
        return () => clearInterval(intervalId);
    }, [fetchComplaints]);

    // Fetch staff for assignment
    useEffect(() => {
        if (profile?.role !== "secretary" || !profile?.local_body_id) {
            setStaff([]);
            return;
        }

        let alive = true;

        const fetchStaff = async () => {
            try {
                const supabase = getSupabaseClient();
                const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
                const token = data?.session?.access_token || "";

                const res = await fetch(`/api/staff/${profile.local_body_id}?status=active`, {
                    cache: "no-store",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (!alive) return;

                if (res.status === 401 || res.status === 403) {
                    setStaff([]);
                    return;
                }

                const json = await res.json();
                if (res.ok && json.success && Array.isArray(json.data)) {
                    setStaff(json.data);
                    return;
                }

                setStaff([]);
            } catch {
                if (alive) setStaff([]);
            }
        };

        fetchStaff();

        return () => {
            alive = false;
        };
    }, [profile?.role, profile?.local_body_id]);

    const stats = useMemo(() => {
        const s = { total: totalCount, pending: 0, in_progress: 0, resolved: 0, overdue: 0 };
        for (const c of complaints) {
            if (["submitted", "under_review", "assigned", "inspection_scheduled", "on_hold"].includes(c.status)) {
                s.pending++;
            }
            if (["in_progress", "partially_resolved"].includes(c.status)) {
                s.in_progress++;
            }
            if (["resolved", "closed"].includes(c.status)) {
                s.resolved++;
            }
            if (c.status === "overdue") {
                s.overdue++;
                continue;
            }
            if (c.resolution_deadline && toExactTimestamp(c.resolution_deadline) < Date.now() && c.status !== "resolved" && c.status !== "closed") s.overdue++;
        }
        return s;
    }, [complaints, totalCount]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const filteredStaff = useMemo(
        () => staff.filter((s) => s.role === assignRole && String(s.status || "").toLowerCase() === "active"),
        [staff, assignRole],
    );

    const handleAssign = async () => {
        if (!assignModal || !assignTo) return;
        if (!deadline) {
            setAssignError("Deadline is required for assignment");
            return;
        }
        setAssignLoading(true);
        setAssignError("");

        const patchComplaint = async (payload) => {
            const res = await fetch(`/api/complaints/${assignModal}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            let json = null;
            try {
                json = await res.json();
            } catch { }
            if (!res.ok || !json?.success) {
                throw new Error(json?.message || `HTTP ${res.status}`);
            }
            return json;
        };

        try {
            const complaint = complaints.find((c) => c.id === assignModal);
            let effectiveStatus = complaint?.status;

            // For fresh or rejected complaints, move to under_review before assigning.
            if (effectiveStatus === "submitted" || effectiveStatus === "rejected") {
                await patchComplaint({
                    status: "under_review",
                    remarks: "Moved to under review before assignment",
                });
                effectiveStatus = "under_review";
            }

            const payload = {
                assigned_to: assignTo,
                assigned_role: assignRole,
                resolution_deadline: deadline ? new Date(deadline).toISOString() : null,
                remarks: assignNotes.trim() || `Assigned to ${assignRole} by secretary`,
            };

            const canMoveToAssigned =
                effectiveStatus === "assigned" ||
                (TRANSITIONS.secretary?.[effectiveStatus] || []).includes("assigned");
            if (canMoveToAssigned) {
                payload.status = "assigned";
            }

            await patchComplaint(payload);
            setAssignModal(null);
            setAssignTo("");
            setDeadline("");
            setAssignNotes("");
            pushToast("success", "Assignment updated", `Complaint assigned to ${assignRole}`);
            fetchComplaints();
        } catch (err) {
            setAssignError(err?.message || "Assignment failed");
            pushToast("error", "Assignment failed", err?.message || "Please try again");
        } finally {
            setAssignLoading(false);
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedIds.length || !assignTo) return;
        setAssignError("");
        if (!deadline) {
            setAssignError("Deadline is required for bulk assignment");
            return;
        }

        const updates = await Promise.allSettled(
            selectedIds.map((id) =>
                fetch(`/api/complaints/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: "assigned",
                        assigned_to: assignTo,
                        assigned_role: assignRole,
                        resolution_deadline: new Date(deadline).toISOString(),
                        remarks: `Bulk assigned to ${assignRole} by secretary`,
                    }),
                }),
            ),
        );

        const successCount = updates.filter((item) => item.status === "fulfilled" && item.value?.ok).length;
        const failedCount = updates.length - successCount;

        if (successCount > 0) {
            pushToast("success", "Bulk assignment complete", `${successCount} complaint(s) assigned`);
        }
        if (failedCount > 0) {
            pushToast("error", "Bulk assignment partial", `${failedCount} complaint(s) could not be assigned`);
        }

        setSelectedIds([]);
        setDeadline("");
        fetchComplaints();
    };

    const handleCsvExport = () => {
        const headers = ["Tracking ID", "Category", "Status", "Priority", "Location", "Created At", "Assigned To"];
        const rows = complaints.map((c) => [c.tracking_id, c.category, c.status, c.priority, c.location_text || "", c.created_at, c.assignee?.name || ""]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `complaints-${getIndiaDateStamp()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

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
            return ((toExactTimestamp(a.created_at) || 0) - (toExactTimestamp(b.created_at) || 0)) * dir;
        });
    }, [complaints, sortDir, sortKey]);

    const displayComplaints = useMemo(
        () => (isComplaintsPage ? visibleComplaints : visibleComplaints.slice(0, 2)),
        [isComplaintsPage, visibleComplaints],
    );

    const toggleMobileExpand = (id) => {
        setExpandedMobileRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    if (authLoading || (!profile && !authLoading)) {
        return <main className="ui-bg flex min-h-screen items-center justify-center"><Skeleton /></main>;
    }

    return (
        <AppShell role="secretary" pageTitle={isComplaintsPage ? "Complaints" : "Secretary Dashboard"} profileName={profile?.name || "Secretary"}>
            <ToastStack toasts={toasts} onDismiss={dismissToast} />
            <div className="mx-auto max-w-7xl">

                {!isComplaintsPage && (
                <div className="mt-6 rounded-[2rem] border border-white/50 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white shadow-[0_30px_60px_-32px_rgba(15,23,42,0.7)] sm:p-8">
                    <div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-blue-200">Secretary Console</p>
                            <h1 className="mt-3 text-3xl font-bold sm:text-5xl">Welcome, {profile?.name || "Secretary"}</h1>
                            <p className="mt-3 max-w-3xl text-sm text-blue-100 sm:text-base">
                                Review incoming complaints, assign field teams, and keep overdue cases under control.
                            </p>
                        </div>
                    </div>
                </div>
                )}

                {/* Stat Cards */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="Total" value={stats.total} icon="📊" color="border-slate-300 bg-white" />
                    <StatCard label="Pending" value={stats.pending} icon="⏳" color="border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100" />
                    <StatCard label="In Progress" value={stats.in_progress} icon="🔄" color="border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100" />
                    <StatCard label="Resolved" value={stats.resolved} icon="✅" color="border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100" />
                    <StatCard label="Overdue" value={stats.overdue} icon="⚠️" color="border-red-300 bg-gradient-to-br from-red-50 to-red-100" />
                </div>

                {isComplaintsPage && (
                <>
                {/* Filters */}
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-white/70 p-4 backdrop-blur-sm">
                    <div className="flex w-full items-center rounded-lg border border-slate-300 bg-white sm:w-auto">
                        <span className="px-3 py-2 text-slate-500">🔍</span>
                        <input
                            type="text"
                            placeholder={pick(lang, "Search ID or description…", "ഐഡി / വിവരണം തിരയുക…")}
                            value={filters.search}
                            onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
                            className="w-full bg-white px-2 py-2 text-sm outline-none focus:outline-none sm:w-56"
                        />
                    </div>
                    <select value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
                        <option value="">📊 All Status</option>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select value={filters.priority} onChange={(e) => { setFilters((f) => ({ ...f, priority: e.target.value })); setPage(1); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
                        <option value="">🎯 All Priority</option>
                        <option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                    <button onClick={() => { setFilters({ status: "", priority: "", search: "" }); setPage(1); }} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">↻ Reset</button>
                    <button onClick={handleCsvExport} className="ui-button-primary rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">📥 CSV</button>
                    <div className="flex w-full gap-1 rounded-lg border-2 border-slate-300 bg-slate-100 p-1 sm:ml-auto sm:w-auto">
                        <button onClick={() => setTabView("table")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tabView === "table" ? "ui-button-primary bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}>📋 Table</button>
                        <button onClick={() => setTabView("map")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tabView === "map" ? "ui-button-primary bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}>🗺️ Map</button>
                    </div>
                </div>
                </>
                )}

                {(stats.overdue > 0 || lastEscalationCount > 0) && (
                    <div className="mt-6 rounded-2xl border-2 border-red-400 bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 shadow-md">
                        <div className="flex items-start gap-4">
                            <span className="text-4xl">⚠️</span>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-red-900">
                                    {pick(lang, "Deadline exceeded alert", "Deadline exceeded alert")}
                                </h3>
                                <p className="mt-2 text-sm text-red-800">
                                    <span className="font-semibold">{stats.overdue}</span> complaint(s) are overdue. {lastEscalationCount > 0 && <><span className="font-semibold">{lastEscalationCount}</span> new escalation(s) detected.</>}
                                </p>
                                <button onClick={() => setFilters({ ...filters, status: "overdue" })} className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800">
                                    {pick(lang, "View Overdue Cases", "View Overdue Cases")} →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk assign */}
                {isComplaintsPage && selectedIds.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-purple-50 p-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full border border-blue-300 bg-white px-3 py-1 text-sm font-bold text-blue-900">✓ {selectedIds.length} selected</span>
                            <select value={assignRole} onChange={(e) => { setAssignRole(e.target.value); setAssignTo(""); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
                                <option value="engineer">Engineer</option>
                                <option value="clerk">Clerk</option>
                                <option value="secretary">Secretary</option>
                            </select>
                            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
                                <option value="">Select {assignRole}...</option>
                                {filteredStaff.map((s) => <option key={s.id} value={s.id}>{formatStaffDisplayLabel(s)}</option>)}
                            </select>
                            <input
                                type="datetime-local"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                            />
                            <button onClick={handleBulkAssign} disabled={!assignTo} className="ui-button-primary rounded-xl px-4 py-2 text-sm font-bold text-white transition duration-300 hover:scale-[1.03] disabled:opacity-50">🔗 Bulk Assign</button>
                        </div>
                    </div>
                )}

                {isComplaintsPage && assignError && !assignModal && (
                    <p className="mt-2 text-sm text-red-700">{assignError}</p>
                )}

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {isComplaintsPage ? "All Complaints" : "Latest Complaints"}
                            </h2>
                            <p className="mt-1 text-xs text-slate-600">
                                {isComplaintsPage
                                    ? ""
                                    : "Showing only the 2 most recent complaints. Open Complaints for full list."}
                            </p>
                        </div>
                        {!isComplaintsPage && (
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard/secretary/complaints")}
                                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                                View All Complaints
                            </button>
                        )}
                    </div>
                </div>

                {/* Table view */}
                {(isComplaintsPage ? tabView === "table" : true) && (
                    <div className="mt-4 rounded-2xl border border-white/40 bg-gradient-to-br from-blue-50/80 via-purple-50/70 to-slate-100/80 p-2 shadow-[0_18px_40px_-24px_rgba(30,64,175,0.45)] backdrop-blur-xl">
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85">
                            {/* Desktop table */}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
                                        <tr className="text-xs uppercase tracking-wide text-slate-500">
                                            <th className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 cursor-pointer rounded-md border-slate-300 text-blue-600"
                                                    onChange={(e) => setSelectedIds(e.target.checked ? displayComplaints.map((c) => c.id) : [])}
                                                />
                                            </th>
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
                                            <th className="px-4 py-4 font-bold text-slate-700">Assigned</th>
                                            <th className="px-4 py-4 font-bold text-slate-700">Proof</th>
                                            <th className="px-4 py-4 font-bold text-slate-700">Location</th>
                                            <th className="px-4 py-4 font-bold text-slate-700">
                                                <button type="button" onClick={() => handleSort("created_at")} className="inline-flex items-center gap-1 hover:text-slate-900">
                                                    Date
                                                    <span>{sortKey === "created_at" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                                                </button>
                                            </th>
                                            <th className="px-4 py-4 font-bold text-slate-700">Deadline</th>
                                            <th className="px-4 py-4 font-bold text-slate-700">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <tr key={i} className="border-b border-slate-100">
                                                    <td colSpan={11} className="px-4 py-5"><Skeleton /></td>
                                                </tr>
                                            ))
                                        ) : displayComplaints.length === 0 ? (
                                            <tr>
                                                <td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-400">{isComplaintsPage ? "No complaints found" : "No recent complaints found"}</td>
                                            </tr>
                                        ) : (
                                            displayComplaints.map((c, idx) => {
                                                const isOverdue = c.status === "overdue" || (c.resolution_deadline && toExactTimestamp(c.resolution_deadline) < Date.now() && c.status !== "resolved" && c.status !== "closed");
                                                const priority = getPriorityBadge(c.priority);
                                                const status = getStatusBadge(c.status, isOverdue);
                                                const isCopied = copiedId === c.tracking_id;
                                                const proofImages = (Array.isArray(c.complaint_images) ? c.complaint_images : []).filter((img) => img.image_type === "proof");
                                                const latestProof = proofImages[proofImages.length - 1] || null;
                                                return (
                                                    <tr
                                                        key={c.id}
                                                        className={`border-b border-slate-100 transition duration-300 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"} hover:-translate-y-[1px] hover:bg-blue-50/70 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]`}
                                                    >
                                                        <td className="px-4 py-4 align-top">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 cursor-pointer rounded-md border-slate-300 text-blue-600"
                                                                checked={selectedIds.includes(c.id)}
                                                                onChange={() => toggleSelect(c.id)}
                                                            />
                                                        </td>
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
                                                            <p className="mt-1 text-[11px] text-slate-400">Tap ID to open complaint</p>
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-sm text-slate-700">{c.category}</td>
                                                        <td className="px-4 py-4 align-top">
                                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.cls}`}>{priority.label}</span>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="flex items-start gap-2">
                                                                <span className="mt-0.5 text-sm">👤</span>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-slate-800">{c.assignee?.name || "Unassigned"}</p>
                                                                    <p className="text-xs text-slate-500">{c.assignee?.role || "-"}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            {latestProof?.image_url ? (
                                                                <a
                                                                    href={latestProof.image_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-2"
                                                                >
                                                                    <img
                                                                        src={latestProof.image_url}
                                                                        alt="Resolution proof"
                                                                        className="h-10 w-10 rounded-lg border border-emerald-200 object-cover"
                                                                    />
                                                                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                                        {proofImages.length} proof
                                                                    </span>
                                                                </a>
                                                            ) : (
                                                                <span className="text-xs text-slate-400">No proof</span>
                                                            )}
                                                        </td>
                                                        <td className="max-w-[220px] px-4 py-4 align-top">
                                                            <p className="truncate text-sm text-slate-600" title={c.location_text || "-"}>📍 {c.location_text || "-"}</p>
                                                            {(c.location_mismatch || c.ward_mismatch) && (
                                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                                    {c.location_mismatch && (
                                                                        <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                                                            ⚠ Possible Wrong Panchayath
                                                                        </span>
                                                                    )}
                                                                    {c.ward_mismatch && (
                                                                        <span className="inline-flex rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
                                                                            ⚠ Possible Wrong Ward
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-xs text-slate-500">{fmt(c.updated_at || c.created_at)}</td>
                                                        <td className="px-4 py-4 align-top text-xs text-slate-500">{fmt(c.resolution_deadline)}</td>
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => router.push(`/complaint/${encodeURIComponent(c.tracking_id)}?from=dashboard`)}
                                                                    className="rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition duration-300 hover:scale-[1.03] hover:shadow-[0_0_0_2px_rgba(59,130,246,0.15)]"
                                                                >
                                                                    👁 View
                                                                </button>
                                                                <button
                                                                    onClick={() => { setAssignModal(c.id); setAssignRole(c.assigned_role || "engineer"); setAssignTo(""); setDeadline(""); setAssignNotes(""); setAssignError(""); }}
                                                                    className="ui-button-primary rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition duration-300 hover:scale-[1.03] hover:shadow-[0_10px_24px_-10px_rgba(30,64,175,0.65)]"
                                                                >
                                                                    ⚙ Manage
                                                                </button>
                                                            </div>
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
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4"><Skeleton /></div>
                                    ))
                                ) : displayComplaints.length === 0 ? (
                                    <p className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">{isComplaintsPage ? "No complaints found" : "No recent complaints found"}</p>
                                ) : (
                                    displayComplaints.map((c) => {
                                        const isOverdue = c.status === "overdue" || (c.resolution_deadline && toExactTimestamp(c.resolution_deadline) < Date.now() && c.status !== "resolved" && c.status !== "closed");
                                        const priority = getPriorityBadge(c.priority);
                                        const status = getStatusBadge(c.status, isOverdue);
                                        const expanded = expandedMobileRows.includes(c.id);
                                        const isCopied = copiedId === c.tracking_id;
                                        const proofImages = (Array.isArray(c.complaint_images) ? c.complaint_images : []).filter((img) => img.image_type === "proof");
                                        const latestProof = proofImages[proofImages.length - 1] || null;
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
                                                        <p><span className="font-semibold text-slate-700">Assigned:</span> {c.assignee?.name || "Unassigned"} ({c.assignee?.role || "-"})</p>
                                                        <div>
                                                            <p className="font-semibold text-slate-700">Resolution Proof:</p>
                                                            {latestProof?.image_url ? (
                                                                <a
                                                                    href={latestProof.image_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="mt-1 inline-flex items-center gap-2"
                                                                >
                                                                    <img
                                                                        src={latestProof.image_url}
                                                                        alt="Resolution proof"
                                                                        className="h-12 w-12 rounded-lg border border-emerald-200 object-cover"
                                                                    />
                                                                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                                        {proofImages.length} proof
                                                                    </span>
                                                                </a>
                                                            ) : (
                                                                <p className="text-xs text-slate-400">No proof uploaded</p>
                                                            )}
                                                        </div>
                                                        <p className="truncate" title={c.location_text || "-"}><span className="font-semibold text-slate-700">Location:</span> 📍 {c.location_text || "-"}</p>
                                                        {(c.location_mismatch || c.ward_mismatch) && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {c.location_mismatch && (
                                                                    <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                                                        ⚠ Possible Wrong Panchayath
                                                                    </span>
                                                                )}
                                                                {c.ward_mismatch && (
                                                                    <span className="inline-flex rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
                                                                        ⚠ Possible Wrong Ward
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <p><span className="font-semibold text-slate-700">Last Activity:</span> {fmt(c.updated_at || c.created_at)}</p>
                                                        <p><span className="font-semibold text-slate-700">Deadline:</span> {fmt(c.resolution_deadline)}</p>
                                                    </div>
                                                )}

                                                <div className="mt-3 flex gap-2">
                                                    <button
                                                        onClick={() => router.push(`/complaint/${encodeURIComponent(c.tracking_id)}?from=dashboard`)}
                                                        className="flex-1 rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition duration-300 hover:scale-[1.02]"
                                                    >
                                                        👁 View
                                                    </button>
                                                    <button
                                                        onClick={() => { setAssignModal(c.id); setAssignRole(c.assigned_role || "engineer"); setAssignTo(""); setDeadline(""); setAssignNotes(""); setAssignError(""); }}
                                                        className="ui-button-primary flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white transition duration-300 hover:scale-[1.02]"
                                                    >
                                                        ⚙ Manage
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Pagination */}
                            {isComplaintsPage && totalPages > 1 && (
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
                )}

                {/* Map view */}
                {isComplaintsPage && tabView === "map" && (
                    <div className="mt-4 h-[58vh] rounded-2xl border border-slate-200 bg-white p-1 sm:h-[500px]">
                        <ComplaintMap complaints={complaints} />
                    </div>
                )}

                {/* Assign modal */}
                {assignModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="ui-glass w-full max-w-md rounded-2xl p-6">
                            <h3 className="text-xl font-bold text-slate-900">⚙️ Assign Complaint</h3>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Role</label>
                                    <select value={assignRole} onChange={(e) => { setAssignRole(e.target.value); setAssignTo(""); }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                                        <option value="engineer">Engineer</option>
                                        <option value="clerk">Clerk</option>
                                        <option value="secretary">Secretary</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Assign To</label>
                                    <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                                        <option value="">Select {assignRole}…</option>
                                        {filteredStaff.map((s) => <option key={s.id} value={s.id}>{formatStaffDisplayLabel(s)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Deadline</label>
                                    <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Instructions / Notes</label>
                                    <textarea
                                        rows={3}
                                        value={assignNotes}
                                        onChange={(e) => setAssignNotes(e.target.value)}
                                        placeholder="Add escalation instructions for assigned staff"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                                    />
                                </div>
                                {assignError && (
                                    <p className="text-sm text-red-700">{assignError}</p>
                                )}
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => { setAssignModal(null); setAssignNotes(""); }} className="ui-button-ghost rounded-xl border-2 border-slate-400 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100">✕ Cancel</button>
                                <button onClick={handleAssign} disabled={!assignTo || !deadline || assignLoading} className="ui-button-primary rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                    {assignLoading ? "Assigning..." : "Assign"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
