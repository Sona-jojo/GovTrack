"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";

function Skeleton() {
    return <div className="h-6 w-full animate-pulse rounded bg-slate-200" />;
}

export default function AdminNoticesPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [priority, setPriority] = useState("normal");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [latestNotices, setLatestNotices] = useState([]);
    const [loadingNotices, setLoadingNotices] = useState(false);

    // Role guard — redirect if not admin
    useEffect(() => {
        if (!authLoading && (!profile || profile.role !== "admin")) {
            router.replace("/login");
        }
    }, [authLoading, profile, router]);

    const fetchLatestNotices = useCallback(async () => {
        setLoadingNotices(true);
        try {
            const res = await fetch(`/api/notices?adminOnly=true&limit=10`);
            const json = await res.json();
            if (json?.success) {
                setLatestNotices(json.data || []);
            } else {
                setLatestNotices([]);
            }
        } catch (err) {
            console.error("Failed to load notices:", err);
            setLatestNotices([]);
        } finally {
            setLoadingNotices(false);
        }
    }, []);

    useEffect(() => {
        if (profile?.role === "admin") {
            fetchLatestNotices();
        }
    }, [fetchLatestNotices, profile]);

    const handlePublishNotice = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!title.trim() || !description.trim()) {
            setError("Title and description are required");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/notices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    category: category.trim(),
                    priority: priority.trim().toLowerCase(),
                    isAdminNotice: true,
                }),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json?.message || "Failed to publish notice");
            }

            setSuccess("✓ System-wide notice published successfully!");
            setTitle("");
            setDescription("");
            setCategory("General");
            setPriority("normal");
            setTimeout(() => setSuccess(""), 3000);
            fetchLatestNotices();
        } catch (err) {
            setError(err.message || "Failed to publish notice");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || (!profile && !authLoading)) {
        return (
            <main className="ui-bg flex min-h-screen items-center justify-center">
                <Skeleton />
            </main>
        );
    }

    return (
        <AppShell role="admin" pageTitle="System Notices" profileName={profile?.name || "Admin"}>
            <div className="mx-auto max-w-4xl space-y-6">
                {/* Publish Notice Form */}
                <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-blue-50/80 via-purple-50/70 to-slate-100/80 p-6 shadow-[0_12px_24px_-8px_rgba(30,64,175,0.15)] backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-slate-900">📢 Publish System-Wide Notice</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        These notices will be visible to all citizens on the landing page and local body notice boards
                    </p>

                    <form onSubmit={handlePublishNotice} className="mt-6 space-y-4">
                        {success && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                                {success}
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                                ✕ {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                📝 Notice Title <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Important: COVID-19 Vaccination Camp"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                📄 Description <span className="text-red-600">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detailed notice content..."
                                rows={5}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Category
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                >
                                    <option>General</option>
                                    <option>Public Health</option>
                                    <option>Infrastructure</option>
                                    <option>Administration</option>
                                    <option>Alert</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Priority
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                >
                                    <option value="normal">Normal</option>
                                    <option value="important">Important</option>
                                    <option value="urgent">Urgent 🔴</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white transition duration-300 hover:shadow-[0_10px_24px_-10px_rgba(30,64,175,0.65)] disabled:opacity-50"
                        >
                            {saving ? "Publishing..." : "🚀 Publish Notice"}
                        </button>
                    </form>
                </div>

                {/* Recent Notices */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">📋 Recent Notices</h2>

                    {loadingNotices ? (
                        <div className="mt-4 space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <Skeleton />
                                </div>
                            ))}
                        </div>
                    ) : latestNotices.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
                            <p className="text-slate-500">No system-wide notices published yet</p>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {latestNotices.map((notice) => {
                                const priorityColors = {
                                    urgent: "border-l-4 border-red-400 border-red-200 bg-red-50",
                                    important: "border-l-4 border-amber-400 border-amber-200 bg-amber-50",
                                    normal: "border-l-4 border-blue-400 border-blue-200 bg-blue-50",
                                };
                                const priorityLabel = {
                                    urgent: "🔴 Urgent",
                                    important: "🟡 Important",
                                    normal: "🔵 Normal",
                                };
                                return (
                                    <div
                                        key={notice.id}
                                        className={`rounded-xl border ${priorityColors[notice.priority] || "border-slate-200 bg-white"} p-4 transition hover:shadow-md`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900">{notice.title}</h3>
                                                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{notice.description}</p>
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white">
                                                        {notice.category}
                                                    </span>
                                                    <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold">
                                                        {priorityLabel[notice.priority] || notice.priority}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(notice.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
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
