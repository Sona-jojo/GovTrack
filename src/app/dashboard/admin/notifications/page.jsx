"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";

function Skeleton() {
  return <div className="h-6 w-full animate-pulse rounded bg-slate-200" />;
}

function fmt(d) {
  return d ? new Date(d).toLocaleDateString() : "-";
}

function templateLabel(template) {
  const value = String(template || "").toLowerCase();
  if (value === "escalation_overdue") return "Escalation Alert";
  if (value === "duplicate_reported") return "Duplicate Report";
  if (value === "submitted") return "New Submission";
  if (value === "resolved") return "Resolved";
  if (value === "active" || value === "in_progress") return "In Progress";
  return "System Update";
}

export default function AdminNotificationsPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [systemFilter, setSystemFilter] = useState("all");
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemUpdating, setSystemUpdating] = useState(false);

  const summary = useMemo(() => {
    let escalations = 0;
    let updates = 0;
    for (const n of notifications) {
      if (n.template === "escalation_overdue") {
        escalations += 1;
      } else {
        updates += 1;
      }
    }
    return { total: notifications.length, escalations, updates };
  }, [notifications]);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "admin")) {
      router.replace("/login");
    }
  }, [authLoading, profile, router]);

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (notificationFilter !== "all") {
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

  const fetchSystemNotifications = useCallback(async () => {
    setSystemLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (systemFilter === "unread") params.set("unreadOnly", "true");
      const res = await fetch(`/api/notifications/system?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json?.success && Array.isArray(json?.data)) {
        setSystemNotifications(json.data);
      } else {
        setSystemNotifications([]);
      }
    } catch {
      setSystemNotifications([]);
    } finally {
      setSystemLoading(false);
    }
  }, [systemFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchSystemNotifications();
  }, [fetchSystemNotifications]);

  useEffect(() => {
    const intervalId = setInterval(fetchNotifications, 60000);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  useEffect(() => {
    const intervalId = setInterval(fetchSystemNotifications, 300000);
    return () => clearInterval(intervalId);
  }, [fetchSystemNotifications]);

  const markSystemStatus = async (ids, nextStatus) => {
    if (!ids?.length) return;
    setSystemUpdating(true);
    try {
      await fetch("/api/notifications/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: nextStatus }),
      });
      await fetchSystemNotifications();
    } finally {
      setSystemUpdating(false);
    }
  };

  const unreadCount = useMemo(
    () => systemNotifications.filter((item) => item.status !== "read").length,
    [systemNotifications],
  );

  if (authLoading) {
    return <main className="ui-bg flex min-h-screen items-center justify-center"><div className="h-6 w-40 animate-pulse rounded bg-slate-200" /></main>;
  }

  return (
    <AppShell role="admin" pageTitle="Notifications" profileName={profile?.name || "Admin"}>
      <div className="mx-auto max-w-5xl">
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Admin Alert Center</h2>
            <div className="flex gap-1 rounded-lg border-2 border-slate-300 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setNotificationFilter("all")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${notificationFilter === "all" ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setNotificationFilter("escalation_overdue")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${notificationFilter === "escalation_overdue" ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                Escalations
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Total Alerts</p>
              <p className="text-xl font-bold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-red-600">Escalations</p>
              <p className="text-xl font-bold text-red-700">{summary.escalations}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-blue-600">Other Updates</p>
              <p className="text-xl font-bold text-blue-700">{summary.updates}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {notificationsLoading ? (
              <Skeleton />
            ) : notifications.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No notifications found for the selected filter.
              </p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="rounded-lg border-2 border-slate-300 bg-white px-4 py-3 transition hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-lg">{n.template === "escalation_overdue" ? "⚠️" : "🔔"}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800">{templateLabel(n.template)}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {fmt(n.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">System Notifications</h2>
              <p className="text-xs text-slate-500">Reports, exports, and maintenance events</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 rounded-lg border-2 border-slate-300 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setSystemFilter("all")}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${systemFilter === "all" ? "bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSystemFilter("unread")}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${systemFilter === "unread" ? "bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <button
                type="button"
                disabled={systemUpdating || unreadCount === 0}
                onClick={() => markSystemStatus(systemNotifications.filter((item) => item.status !== "read").map((item) => item.id), "read")}
                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50"
              >
                Mark All Read
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {systemLoading ? (
              <Skeleton />
            ) : systemNotifications.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No system notifications found.
              </p>
            ) : (
              systemNotifications.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{item.message}</p>
                        {item.status !== "read" && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">UNREAD</span>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{fmt(item.created_at)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={systemUpdating}
                      onClick={() => markSystemStatus([item.id], item.status === "read" ? "pending" : "read")}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      {item.status === "read" ? "Mark Unread" : "Mark Read"}
                    </button>
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
