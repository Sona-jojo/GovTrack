"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";
import { formatStaffDisplayLabel, formatStaffRoleLabel } from "@/lib/api/staff-management";

const STAFF_ROLE_OPTIONS = ["engineer", "clerk"];
const EDIT_ROLE_OPTIONS = ["secretary", "engineer", "clerk"];
const STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

function getRoleBadge(role) {
    const value = String(role || "").toLowerCase();
    if (value === "secretary") return "border-blue-200 bg-blue-50 text-blue-800";
    if (value === "engineer") return "border-indigo-200 bg-indigo-50 text-indigo-800";
    if (value === "clerk") return "border-amber-200 bg-amber-50 text-amber-800";
    return "border-slate-200 bg-slate-100 text-slate-700";
}

function getStatusBadge(status) {
    return String(status || "active").toLowerCase() === "active"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-slate-300 bg-slate-100 text-slate-700";
}

function getStatusToggleClass(status) {
    return String(status || "active").toLowerCase() === "active"
        ? "bg-emerald-500 justify-end"
        : "bg-slate-300 justify-start";
}

function EmptyFieldError({ message }) {
    if (!message) return null;
    return <p className="mt-1 text-xs font-medium text-red-700">{message}</p>;
}

function SectionCard({ title, subtitle, icon, children, actions }) {
    return (
        <section className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xl">{icon}</span>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
                            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                        </div>
                    </div>
                </div>
                {actions}
            </div>
            {children}
        </section>
    );
}

function ModalShell({ title, subtitle, onClose, children, actions }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-3xl border border-white/40 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.55)] sm:p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                        ✕
                    </button>
                </div>
                <div className="mt-5">{children}</div>
                {actions}
            </div>
        </div>
    );
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

const DEFAULT_STAFF_FORM = {
    id: "",
    name: "",
    role: "engineer",
    contact: "",
    localBodyId: "",
    status: "active",
};

const DEFAULT_PASSWORD_FORM = {
    profileId: "",
    newPassword: "",
    confirmPassword: "",
};

export default function StaffManagementPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("staff");
    const [staff, setStaff] = useState([]);
    const [localBodies, setLocalBodies] = useState([]);
    const [staffLoading, setStaffLoading] = useState(true);
    const [bodiesLoading, setBodiesLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [localBodyFilter, setLocalBodyFilter] = useState("");
    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [staffModalMode, setStaffModalMode] = useState("add");
    const [staffForm, setStaffForm] = useState(DEFAULT_STAFF_FORM);
    const [staffFormErrors, setStaffFormErrors] = useState({});
    const [staffSaving, setStaffSaving] = useState(false);
    const [passwordForm, setPasswordForm] = useState(DEFAULT_PASSWORD_FORM);
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [rowBusyId, setRowBusyId] = useState("");
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

    const loadStaff = useCallback(async () => {
        setStaffLoading(true);
        try {
            const res = await fetch("/api/staff/list", { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || !json?.success) {
                throw new Error(json?.message || "Failed to load staff");
            }
            setStaff(Array.isArray(json.data) ? json.data : []);
        } catch (err) {
            setStaff([]);
            pushToast("error", "Staff load failed", err?.message || "Unable to load staff list");
        } finally {
            setStaffLoading(false);
        }
    }, [pushToast]);

    const loadLocalBodies = useCallback(async () => {
        setBodiesLoading(true);
        try {
            const res = await fetch("/api/local-bodies", { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || !json?.success) {
                throw new Error(json?.message || "Failed to load panchayaths");
            }
            setLocalBodies(Array.isArray(json.data) ? json.data : []);
        } catch (err) {
            setLocalBodies([]);
            pushToast("error", "Panchayath load failed", err?.message || "Unable to load local bodies");
        } finally {
            setBodiesLoading(false);
        }
    }, [pushToast]);

    useEffect(() => {
        if (!authLoading && (!profile || profile.role !== "admin")) {
            router.replace("/login");
        }
    }, [authLoading, profile, router]);

    useEffect(() => {
        if (profile?.role !== "admin") return;
        loadStaff();
        loadLocalBodies();
    }, [loadLocalBodies, loadStaff, profile?.role]);

    const localBodyNameById = useMemo(() => {
        return new Map(localBodies.map((body) => [body.id, body.name]));
    }, [localBodies]);

    const filteredStaff = useMemo(() => {
        const searchValue = search.trim().toLowerCase();
        return [...staff]
            .filter((item) => {
                if (localBodyFilter && item.local_body_id !== localBodyFilter) return false;
                if (roleFilter && String(item.role || "").toLowerCase() !== roleFilter) return false;
                if (statusFilter && String(item.status || "").toLowerCase() !== statusFilter) return false;
                if (!searchValue) return true;

                const haystack = [
                    item.name,
                    item.contact,
                    item.role,
                    item.local_body_name,
                    item.local_body_code,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(searchValue);
            })
            .sort((a, b) => {
                if (a.status !== b.status) return String(a.status) === "active" ? -1 : 1;
                if (a.role !== b.role) return String(a.role || "").localeCompare(String(b.role || ""));
                return String(a.name || "").localeCompare(String(b.name || ""));
            });
    }, [localBodyFilter, roleFilter, search, staff, statusFilter]);

    const staffSummary = useMemo(() => {
        const summary = {
            total: staff.length,
            active: 0,
            inactive: 0,
            engineer: 0,
            clerk: 0,
            secretary: 0,
        };

        for (const item of staff) {
            const status = String(item.status || "active").toLowerCase();
            const role = String(item.role || "").toLowerCase();

            if (status === "active") summary.active += 1;
            if (status === "inactive") summary.inactive += 1;
            if (role === "engineer") summary.engineer += 1;
            if (role === "clerk") summary.clerk += 1;
            if (role === "secretary") summary.secretary += 1;
        }

        return summary;
    }, [staff]);

    const staffSelectOptions = useMemo(() => {
        return [...staff].sort((a, b) => {
            if (a.status !== b.status) return String(a.status) === "active" ? -1 : 1;
            if (a.role !== b.role) return String(a.role || "").localeCompare(String(b.role || ""));
            return String(a.name || "").localeCompare(String(b.name || ""));
        });
    }, [staff]);

    const activeOnlyCount = useMemo(
        () => staff.filter((item) => String(item.status || "").toLowerCase() === "active").length,
        [staff],
    );

    const openAddModal = useCallback(() => {
        const defaultLocalBodyId = localBodyFilter || profile?.local_body_id || localBodies[0]?.id || "";
        setStaffModalMode("add");
        setStaffForm({ ...DEFAULT_STAFF_FORM, localBodyId: defaultLocalBodyId });
        setStaffFormErrors({});
        setStaffModalOpen(true);
    }, [localBodyFilter, localBodies, profile?.local_body_id]);

    const openEditModal = useCallback((item) => {
        setStaffModalMode("edit");
        setStaffForm({
            id: item.id,
            name: item.name || "",
            role: item.role || "engineer",
            contact: item.contact || "",
            localBodyId: item.local_body_id || "",
            status: String(item.status || "active").toLowerCase(),
        });
        setStaffFormErrors({});
        setStaffModalOpen(true);
    }, []);

    const closeStaffModal = useCallback(() => {
        setStaffModalOpen(false);
        setStaffFormErrors({});
        setStaffSaving(false);
    }, []);

    const validateStaffForm = useCallback(() => {
        const errors = {};
        if (staffForm.name.trim().length < 2) errors.name = "Enter a valid name.";
        if (!staffForm.contact.trim()) errors.contact = "Contact is required.";
        if (!staffForm.localBodyId.trim()) errors.localBodyId = "Select a Panchayath.";
        if (!["engineer", "clerk", "secretary"].includes(String(staffForm.role || "").toLowerCase())) {
            errors.role = "Select a valid role.";
        }
        if (!["active", "inactive"].includes(String(staffForm.status || "").toLowerCase())) {
            errors.status = "Select a valid status.";
        }
        return errors;
    }, [staffForm]);

    const handleStaffSubmit = useCallback(
        async (event) => {
            event.preventDefault();
            const errors = validateStaffForm();
            setStaffFormErrors(errors);

            if (Object.keys(errors).length > 0) {
                pushToast("error", "Fix the form", "Please correct the highlighted staff fields.");
                return;
            }

            setStaffSaving(true);
            try {
                const isEdit = staffModalMode === "edit";
                const url = isEdit ? "/api/staff/update" : "/api/staff/add";
                const payload = isEdit
                    ? {
                        id: staffForm.id,
                        name: staffForm.name.trim(),
                        role: staffForm.role,
                        contact: staffForm.contact.trim(),
                        localBodyId: staffForm.localBodyId,
                        status: staffForm.status,
                    }
                    : {
                        name: staffForm.name.trim(),
                        role: staffForm.role,
                        contact: staffForm.contact.trim(),
                        localBodyId: staffForm.localBodyId,
                        status: staffForm.status,
                    };

                const res = await fetch(url, {
                    method: isEdit ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const json = await res.json();

                if (!res.ok || !json?.success) {
                    throw new Error(json?.message || "Unable to save staff member");
                }

                pushToast("success", isEdit ? "Staff updated" : "Staff added", json?.message || "Staff member saved successfully");
                closeStaffModal();
                await loadStaff();
            } catch (err) {
                pushToast("error", "Save failed", err?.message || "Unable to save staff member");
            } finally {
                setStaffSaving(false);
            }
        },
        [closeStaffModal, loadStaff, pushToast, staffForm, staffModalMode, validateStaffForm],
    );

    const handleToggleStatus = useCallback(
        async (item) => {
            const nextStatus = String(item.status || "active").toLowerCase() === "active" ? "inactive" : "active";
            setRowBusyId(item.id);
            try {
                const res = await fetch("/api/staff/toggle-status", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: item.id, status: nextStatus }),
                });
                const json = await res.json();
                if (!res.ok || !json?.success) {
                    throw new Error(json?.message || "Unable to update staff status");
                }

                pushToast("success", "Status updated", `${item.name || "Staff member"} is now ${formatStaffRoleLabel(nextStatus)}`);
                await loadStaff();
            } catch (err) {
                pushToast("error", "Status update failed", err?.message || "Unable to update status");
            } finally {
                setRowBusyId("");
            }
        },
        [loadStaff, pushToast],
    );

    const handlePasswordSubmit = useCallback(
        async (event) => {
            event.preventDefault();
            const errors = {};
            if (!passwordForm.profileId) errors.profileId = "Select a staff member.";
            if ((passwordForm.newPassword || "").trim().length < 8) errors.newPassword = "Password must be at least 8 characters.";
            if ((passwordForm.confirmPassword || "").trim() !== (passwordForm.newPassword || "").trim()) {
                errors.confirmPassword = "Passwords do not match.";
            }
            setPasswordErrors(errors);

            if (Object.keys(errors).length > 0) {
                pushToast("error", "Check the password form", "Please fix the highlighted password fields.");
                return;
            }

            setPasswordSaving(true);
            try {
                const res = await fetch("/api/staff/change-password", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        profileId: passwordForm.profileId,
                        newPassword: passwordForm.newPassword.trim(),
                    }),
                });
                const json = await res.json();
                if (!res.ok || !json?.success) {
                    throw new Error(json?.message || "Unable to update password");
                }

                pushToast("success", "Password updated", json?.message || "Password has been changed successfully");
                setPasswordForm(DEFAULT_PASSWORD_FORM);
                setPasswordErrors({});
            } catch (err) {
                pushToast("error", "Password update failed", err?.message || "Unable to update password");
            } finally {
                setPasswordSaving(false);
            }
        },
        [passwordForm, pushToast],
    );

    const statusLabel = useCallback((value) => {
        return String(value || "active").toLowerCase() === "active" ? "Active" : "Inactive";
    }, []);

    if (authLoading || (!profile && !authLoading)) {
        return (
            <main className="ui-bg flex min-h-screen items-center justify-center">
                <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
            </main>
        );
    }

    const isSecretaryMode = profile?.role === "secretary";

    return (
        <AppShell role="admin" pageTitle="Staff Management" profileName={profile?.name || "Admin"}>
            <ToastStack toasts={toasts} onDismiss={dismissToast} />

            <div className="mx-auto max-w-7xl space-y-6 px-1 pb-10 sm:px-0">
                <div className="mt-6 rounded-[2rem] border border-white/50 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white shadow-[0_30px_60px_-32px_rgba(15,23,42,0.7)] sm:p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-blue-200">Admin Control Center</p>
                            <h1 className="mt-3 text-3xl font-bold sm:text-5xl">Staff Management</h1>
                            <p className="mt-3 max-w-3xl text-sm text-blue-100 sm:text-base">
                                Manage staff profiles, control access, and keep password changes in one organized view.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-blue-50 backdrop-blur">
                            <p className="font-semibold">Active staff available for assignment</p>
                            <p className="mt-1 text-blue-100">{formatCount(activeOnlyCount)} active accounts are ready for complaint assignment.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 rounded-3xl border border-white/50 bg-white/75 p-3 shadow-[0_14px_32px_-20px_rgba(15,23,42,0.22)] backdrop-blur-xl">
                    <button
                        type="button"
                        onClick={() => setActiveTab("staff")}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeTab === "staff" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                        👥 Staff Management
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("password")}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeTab === "password" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                        🔐 Password Management
                    </button>
                </div>

                {activeTab === "staff" && (
                    <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Staff</p>
                                <p className="mt-3 text-3xl font-bold text-slate-900">{formatCount(staffSummary.total)}</p>
                            </div>
                            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Active</p>
                                <p className="mt-3 text-3xl font-bold text-emerald-900">{formatCount(staffSummary.active)}</p>
                            </div>
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Engineers</p>
                                <p className="mt-3 text-3xl font-bold text-slate-900">{formatCount(staffSummary.engineer)}</p>
                            </div>
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clerks</p>
                                <p className="mt-3 text-3xl font-bold text-slate-900">{formatCount(staffSummary.clerk)}</p>
                            </div>
                        </div>

                        <SectionCard
                            title="Staff directory"
                            subtitle="Search, filter, update roles, and keep inactive staff out of assignment flows."
                            icon="👥"
                            actions={(
                                <button
                                    type="button"
                                    onClick={openAddModal}
                                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                    ➕ Add Staff
                                </button>
                            )}
                        >
                            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
                                <div className="lg:col-span-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Name, contact, or panchayath"
                                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Panchayath</label>
                                    <select
                                        value={localBodyFilter}
                                        onChange={(event) => setLocalBodyFilter(event.target.value)}
                                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="">All Panchayaths</option>
                                        {localBodies.map((body) => (
                                            <option key={body.id} value={body.id}>{body.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
                                    <select
                                        value={roleFilter}
                                        onChange={(event) => setRoleFilter(event.target.value)}
                                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="">All Roles</option>
                                        <option value="secretary">Secretary</option>
                                        <option value="engineer">Engineer</option>
                                        <option value="clerk">Clerk</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(event) => setStatusFilter(event.target.value)}
                                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="">All Statuses</option>
                                        {STATUS_OPTIONS.map((item) => (
                                            <option key={item.value} value={item.value}>{item.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th className="px-5 py-4 font-semibold">Name</th>
                                                <th className="px-5 py-4 font-semibold">Role</th>
                                                <th className="px-5 py-4 font-semibold">Contact</th>
                                                <th className="px-5 py-4 font-semibold">Status</th>
                                                <th className="px-5 py-4 font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {staffLoading ? (
                                                Array.from({ length: 5 }).map((_, index) => (
                                                    <tr key={index} className="border-t border-slate-100">
                                                        <td colSpan={5} className="px-5 py-5">
                                                            <div className="h-5 animate-pulse rounded bg-slate-200" />
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : filteredStaff.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-5 py-12 text-center">
                                                        <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-slate-600">
                                                            <p className="text-lg font-semibold text-slate-900">No staff available</p>
                                                            <p className="mt-2 text-sm text-slate-500">Use the Add Staff button to create the first staff profile or clear the filters.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredStaff.map((item, index) => {
                                                    const active = String(item.status || "active").toLowerCase() === "active";

                                                    return (
                                                        <tr key={item.id} className={`border-t border-slate-100 transition ${index % 2 === 0 ? "bg-white" : "bg-slate-50/60"} hover:bg-blue-50/60`}>
                                                            <td className="px-5 py-4 align-top">
                                                                <div>
                                                                    <p className="font-semibold text-slate-900">{item.name}</p>
                                                                    <p className="mt-1 text-xs text-slate-500">{item.local_body_name || localBodyNameById.get(item.local_body_id) || "Panchayath unavailable"}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4 align-top">
                                                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRoleBadge(item.role)}`}>
                                                                    {formatStaffRoleLabel(item.role)}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4 align-top text-slate-700">{item.contact || "-"}</td>
                                                            <td className="px-5 py-4 align-top">
                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        type="button"
                                                                        disabled={rowBusyId === item.id}
                                                                        onClick={() => handleToggleStatus(item)}
                                                                        className={`flex h-8 w-14 items-center rounded-full p-1 transition ${getStatusToggleClass(item.status)} ${rowBusyId === item.id ? "opacity-50" : "hover:opacity-90"}`}
                                                                        title={active ? "Deactivate staff" : "Activate staff"}
                                                                    >
                                                                        <span className="h-6 w-6 rounded-full bg-white shadow transition" />
                                                                    </button>
                                                                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(item.status)}`}>{statusLabel(item.status)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4 align-top">
                                                                <div className="flex flex-wrap gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openEditModal(item)}
                                                                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
                                                                    >
                                                                        ✏ Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleStatus(item)}
                                                                        disabled={rowBusyId === item.id}
                                                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                                                                    >
                                                                        {active ? "Deactivate" : "Activate"}
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
                            </div>
                        </SectionCard>
                    </div>
                )}

                {activeTab === "password" && (
                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <SectionCard
                            title="Password Management"
                            subtitle="Update staff passwords with validation, success messaging, and safer input styling."
                            icon="🔐"
                        >
                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Select staff</label>
                                    <select
                                        value={passwordForm.profileId}
                                        onChange={(event) => setPasswordForm((current) => ({ ...current, profileId: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="">Choose a staff member</option>
                                        {staffSelectOptions.map((item) => (
                                            <option key={item.id} value={item.id}>{formatStaffDisplayLabel(item)}</option>
                                        ))}
                                    </select>
                                    <EmptyFieldError message={passwordErrors.profileId} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700">New password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                            placeholder="Enter a strong password"
                                        />
                                        <EmptyFieldError message={passwordErrors.newPassword} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700">Confirm password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                            placeholder="Re-enter the password"
                                        />
                                        <EmptyFieldError message={passwordErrors.confirmPassword} />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="submit"
                                        disabled={passwordSaving}
                                        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {passwordSaving ? "Updating..." : "Update Password"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPasswordForm(DEFAULT_PASSWORD_FORM);
                                            setPasswordErrors({});
                                        }}
                                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </form>
                        </SectionCard>

                        <SectionCard
                            title="Password safety notes"
                            subtitle="Keep passwords strong and use this section only when account access needs to change."
                            icon="🛡️"
                        >
                            <div className="space-y-4 text-sm text-slate-600">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="font-semibold text-slate-900">Validation</p>
                                    <p className="mt-1">Passwords must be at least 8 characters long and both fields must match.</p>
                                </div>
                                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                    <p className="font-semibold text-blue-900">Assignment link</p>
                                    <p className="mt-1 text-blue-900/80">Only active staff appear in the complaint assignment dropdowns elsewhere in the system.</p>
                                </div>
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                    <p className="font-semibold text-emerald-900">Panchayath</p>
                                    <p className="mt-1 text-emerald-900/80">
                                        {isSecretaryMode
                                            ? "Your Panchayath is set automatically for secretary access."
                                            : "Use the staff form on the left to choose the correct Panchayath when creating or editing staff."}
                                    </p>
                                </div>
                            </div>
                        </SectionCard>
                    </div>
                )}
            </div>

            {staffModalOpen && (
                <ModalShell
                    title={staffModalMode === "edit" ? "✏ Edit Staff" : "➕ Add Staff"}
                    subtitle={staffModalMode === "edit" ? "Update staff details, role, contact, and status." : "Create a new staff profile for assignment and access management."}
                    onClose={closeStaffModal}
                    actions={(
                        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                            <button
                                type="button"
                                onClick={closeStaffModal}
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleStaffSubmit}
                                disabled={staffSaving}
                                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {staffSaving ? "Saving..." : "Save Staff"}
                            </button>
                        </div>
                    )}
                >
                    <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleStaffSubmit}>
                        <div className="sm:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Name</label>
                            <input
                                type="text"
                                value={staffForm.name}
                                onChange={(event) => setStaffForm((current) => ({ ...current, name: event.target.value }))}
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                placeholder="Enter staff name"
                            />
                            <EmptyFieldError message={staffFormErrors.name} />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700">Role</label>
                            <select
                                value={staffForm.role}
                                onChange={(event) => setStaffForm((current) => ({ ...current, role: event.target.value }))}
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            >
                                {staffModalMode === "add" ? (
                                    STAFF_ROLE_OPTIONS.map((role) => (
                                        <option key={role} value={role}>{formatStaffRoleLabel(role)}</option>
                                    ))
                                ) : (
                                    EDIT_ROLE_OPTIONS.map((role) => (
                                        <option key={role} value={role}>{formatStaffRoleLabel(role)}</option>
                                    ))
                                )}
                            </select>
                            <EmptyFieldError message={staffFormErrors.role} />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700">Contact</label>
                            <input
                                type="text"
                                value={staffForm.contact}
                                onChange={(event) => setStaffForm((current) => ({ ...current, contact: event.target.value }))}
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                placeholder="Email or phone"
                            />
                            <EmptyFieldError message={staffFormErrors.contact} />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700">Panchayath</label>
                            <select
                                value={staffForm.localBodyId}
                                onChange={(event) => setStaffForm((current) => ({ ...current, localBodyId: event.target.value }))}
                                disabled={isSecretaryMode}
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                            >
                                <option value="">Select a panchayath</option>
                                {localBodies.map((body) => (
                                    <option key={body.id} value={body.id}>{body.name}</option>
                                ))}
                            </select>
                            <EmptyFieldError message={staffFormErrors.localBodyId} />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700">Status</label>
                            <select
                                value={staffForm.status}
                                onChange={(event) => setStaffForm((current) => ({ ...current, status: event.target.value }))}
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            >
                                {STATUS_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                            <EmptyFieldError message={staffFormErrors.status} />
                        </div>

                        {staffModalMode === "edit" && (
                            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                <p className="font-semibold text-slate-900">Assignment note</p>
                                <p className="mt-1">Assignments are managed from complaint screens.</p>
                            </div>
                        )}
                    </form>
                </ModalShell>
            )}
        </AppShell>
    );
}
