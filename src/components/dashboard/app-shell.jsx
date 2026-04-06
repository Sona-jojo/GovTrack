"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { getSupabaseClient } from "@/lib/supabase/client";

function titleFromPath(pathname, fallback) {
  if (!pathname) return "Dashboard";
  if (pathname.includes("/complaints")) return "Complaints";
  if (pathname.includes("/secretary/report")) return "Performance Report";
  if (pathname.includes("/notifications")) return "Notifications";
  if (pathname.includes("/notices")) return "Notices";
  if (pathname.includes("/settings")) return "Settings";
  if (pathname.includes("password-management")) return "Staff Management";
  if (pathname.includes("/dashboard/admin")) return "Admin Dashboard";
  if (pathname.includes("/dashboard/secretary")) return "Secretary Dashboard";
  return fallback || "Dashboard";
}

function buildMenu(role) {
  if (role === "admin") {
    return [
      { label: "Dashboard", icon: "🏠", href: "/dashboard/admin" },
      { label: "Complaints", icon: "📋", href: "/dashboard/admin/complaints" },
      { label: "Analytics", icon: "📊", href: "/admin/analytics" },
      { label: "Notices", icon: "📢", href: "/dashboard/admin/notices" },
      { label: "Notifications", icon: "🔔", href: "/dashboard/admin/notifications" },
      { label: "Staff Management", icon: "👥", href: "/dashboard/admin/password-management" },
      { label: "Settings", icon: "⚙️", href: "/dashboard/admin/settings" },
    ];
  }

  return [
    { label: "Dashboard", icon: "🏠", href: "/dashboard/secretary" },
    { label: "Complaints", icon: "📋", href: "/dashboard/secretary/complaints" },
    { label: "Performance Report", icon: "📊", href: "/secretary/report" },
    { label: "Notices", icon: "📢", href: "/dashboard/secretary/notices" },
    { label: "Notifications", icon: "🔔", href: "/dashboard/secretary/notifications" },
    { label: "Settings", icon: "⚙️", href: "/dashboard/secretary/settings" },
  ];
}

export function AppShell({ role = "secretary", profileName = "", pageTitle = "", children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderData, setReminderData] = useState({ reminders: [], generatedAt: null });
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const lang = typeof window !== "undefined" ? (document.cookie.match(/site_lang=(\w+)/)?.[1] || "en") : "en";

  const menuItems = useMemo(() => buildMenu(role), [role]);
  const resolvedTitle = titleFromPath(pathname, pageTitle);
  const moduleLabel = role === "admin" ? "Admin Console" : "Secretary Module";
  const reminderCount = useMemo(
    () => reminderData.reminders.reduce((sum, item) => sum + (Number(item.count) || 0), 0),
    [reminderData.reminders],
  );
  const unreadSystemCount = useMemo(
    () => systemNotifications.filter((item) => item.status !== "read").length,
    [systemNotifications],
  );

  useEffect(() => {
    if (role !== "admin") return;

    let active = true;

    const loadReminders = async () => {
      setReminderLoading(true);
      try {
        const res = await fetch("/api/notifications/reminders", { cache: "no-store" });
        const json = await res.json();
        if (active && res.ok && json?.success) {
          setReminderData({
            reminders: json.data?.reminders || [],
            generatedAt: json.data?.generatedAt || null,
          });
        }
      } catch {
        if (active) {
          setReminderData({ reminders: [], generatedAt: null });
        }
      } finally {
        if (active) setReminderLoading(false);
      }
    };

    const loadSystemNotifications = async () => {
      setSystemLoading(true);
      try {
        const res = await fetch("/api/notifications/system?limit=4", { cache: "no-store" });
        const json = await res.json();
        if (active && res.ok && json?.success) {
          setSystemNotifications(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        if (active) setSystemNotifications([]);
      } finally {
        if (active) setSystemLoading(false);
      }
    };

    loadReminders();
    loadSystemNotifications();
    const intervalId = setInterval(loadReminders, 15 * 60 * 1000);
    const systemIntervalId = setInterval(loadSystemNotifications, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(intervalId);
      clearInterval(systemIntervalId);
    };
  }, [role]);

  const reminderTimeLabel = useMemo(() => {
    if (!reminderData.generatedAt) return "";
    const delta = Math.max(0, Date.now() - new Date(reminderData.generatedAt).getTime());
    const minutes = Math.floor(delta / (60 * 1000));
    if (minutes < 1) return "Updated just now";
    if (minutes < 60) return `Updated ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `Updated ${hours}h ago`;
  }, [reminderData.generatedAt]);

  const totalBellCount = reminderCount + unreadSystemCount;

  const systemTimeLabel = useMemo(() => {
    const latest = systemNotifications[0]?.created_at;
    if (!latest) return "";
    const delta = Math.max(0, Date.now() - new Date(latest).getTime());
    const minutes = Math.floor(delta / (60 * 1000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [systemNotifications]);

  const handleLogout = () => {
    getSupabaseClient()?.auth.signOut();
    router.replace("/login");
  };

  const sidebarWidthClass = collapsed ? "lg:w-20" : "lg:w-60";

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#ebf5ff_0%,#eef2ff_45%,#ffffff_100%)] text-slate-900">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm font-semibold shadow lg:hidden"
      >
        ☰ Menu
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 transform border-r border-white/10 bg-gradient-to-b from-slate-900 via-blue-950 to-indigo-950 px-3 py-4 text-white shadow-[0_20px_40px_-20px_rgba(15,23,42,0.8)] transition-all duration-300 lg:rounded-r-3xl ${sidebarWidthClass} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="mb-5 flex items-center justify-between px-2">
          <div className={`${collapsed ? "hidden" : "block"}`}>
            <p className="text-xs uppercase tracking-[0.18em] text-blue-200">NP System</p>
            <p className="text-lg font-bold">{moduleLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className="hidden rounded-md border border-white/20 px-2 py-1 text-xs text-blue-100 transition hover:bg-white/10 lg:block"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  router.push(item.href);
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition duration-300 ${active ? "bg-gradient-to-r from-blue-500/95 to-indigo-500/95 text-white shadow-[0_14px_24px_-16px_rgba(59,130,246,0.9)]" : "text-blue-100 hover:translate-x-0.5 hover:bg-white/12"}`}
              >
                <span className="text-base">{item.icon}</span>
                <span className={`${collapsed ? "hidden" : "block"}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl border border-red-300/30 bg-red-500/15 px-3 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/25"
          >
            <span>🚪</span>
            <span className={`${collapsed ? "hidden" : "block"}`}>Logout</span>
          </button>
        </div>
      </aside>

      <div className={`lg:ml-60 ${collapsed ? "lg:ml-20" : "lg:ml-60"} transition-all duration-300`}>
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/55 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{resolvedTitle}</h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (role === "admin") {
                      setReminderOpen((prev) => !prev);
                    } else {
                      router.push("/dashboard/secretary/notifications");
                    }
                  }}
                  className="relative rounded-lg border border-slate-300 bg-white/80 px-2.5 py-2 text-sm"
                  title="Notifications"
                >
                  🔔
                  {role === "admin" && totalBellCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                      {Math.min(totalBellCount, 99)}
                    </span>
                  )}
                </button>

                {role === "admin" && reminderOpen && (
                  <div className="absolute right-0 z-40 mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-800">System Notifications</p>
                        {systemTimeLabel && <span className="text-[11px] text-slate-500">Latest {systemTimeLabel}</span>}
                      </div>

                      {systemLoading ? (
                        <div className="mt-2 h-7 animate-pulse rounded bg-slate-200" />
                      ) : systemNotifications.length === 0 ? (
                        <p className="mt-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-500">
                          No recent system notifications.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {systemNotifications.map((item) => (
                            <div key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="line-clamp-2 text-xs font-semibold text-slate-700">{item.message}</p>
                                {item.status !== "read" && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">Reminder Notifications</p>
                      {reminderTimeLabel && <span className="text-[11px] text-slate-500">{reminderTimeLabel}</span>}
                    </div>

                    {reminderLoading ? (
                      <div className="h-8 animate-pulse rounded bg-amber-100" />
                    ) : reminderData.reminders.length === 0 ? (
                      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs text-emerald-700">
                        No pending reminders right now.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {reminderData.reminders.map((item) => (
                          <div key={item.key} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-xs font-semibold text-amber-900">{item.icon} {item.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setReminderOpen(false);
                        router.push("/dashboard/admin/notifications");
                      }}
                      className="mt-3 w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      Open Notifications
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                <LanguageSwitcher lang={lang} />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                  {String(profileName || role || "U").charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-xs font-semibold text-slate-700 sm:block">{profileName || "User"}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
