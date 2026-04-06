"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-1"}`}
      />
    </button>
  );
}

function InfoTip({ text }) {
  return (
    <span title={text} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600">
      i
    </span>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed right-4 top-4 z-[70] space-y-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`w-80 rounded-xl border px-4 py-3 shadow-xl ${toast.type === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{toast.title}</p>
              <p className="mt-1 text-sm">{toast.message}</p>
            </div>
            <button type="button" onClick={() => onDismiss(toast.id)} className="text-xs font-bold opacity-70 hover:opacity-100">
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-white/50 bg-white/65 p-5 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.6)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_50px_-24px_rgba(30,64,175,0.4)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{icon} {title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AdminSettingsPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [toasts, setToasts] = useState([]);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [complaintRules, setComplaintRules] = useState({
    defaultResolutionDays: 3,
    urgentIssueHours: 24,
    escalationTriggerHours: 48,
    maxImageUploadLimit: 3,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    enableSystemNotifications: true,
    enablePerformanceAlerts: true,
    enableReminderAlerts: true,
  });

  const [reportSettings, setReportSettings] = useState({
    autoGenerateWeeklyReport: true,
    autoGenerateMonthlyReport: true,
    exportFormat: "csv",
  });

  const [securitySettings, setSecuritySettings] = useState({
    forcePasswordResetForStaff: false,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
  });

  const [noticeSettings, setNoticeSettings] = useState({
    enableGlobalNotices: true,
    noticeExpiryDays: 7,
    pinImportantNotices: true,
  });

  const [categories, setCategories] = useState([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState([]);
  const [modalState, setModalState] = useState({
    open: false,
    type: "category",
    mode: "add",
    id: "",
    categoryId: "",
    form: {
      name: "",
      nameMl: "",
      icon: "📌",
      aiTip: "",
      description: "",
      descriptionMl: "",
      isActive: true,
    },
  });

  const pushToast = useCallback((type, title, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, type, title, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const loadSettings = useCallback(async () => {
    setPageLoading(true);
    try {
      const res = await fetch("/api/settings/get", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load settings");
      }

      const data = json.data || {};
      const settings = data.settings || {};
      const adminProfile = data.adminProfile || {};

      setProfileForm((current) => ({
        ...current,
        name: adminProfile.name || profile?.name || "",
        email: adminProfile.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setComplaintRules((current) => ({ ...current, ...(settings.complaintRules || {}) }));
      setNotificationSettings((current) => ({ ...current, ...(settings.notificationSettings || {}) }));
      setReportSettings((current) => ({ ...current, ...(settings.reportSettings || {}) }));
      setSecuritySettings((current) => ({ ...current, ...(settings.securitySettings || {}) }));
      setNoticeSettings((current) => ({ ...current, ...(settings.noticeSettings || {}) }));
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (err) {
      pushToast("error", "Load failed", err?.message || "Unable to load settings");
    } finally {
      setPageLoading(false);
    }
  }, [profile?.name, pushToast]);

  const submitUpdate = useCallback(async (action, payload, successTitle, successMessage) => {
    setSavingKey(action);
    try {
      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Update failed");
      }
      pushToast("success", successTitle, successMessage || json.message || "Saved successfully");
      return true;
    } catch (err) {
      pushToast("error", "Save failed", err?.message || "Unable to save settings");
      return false;
    } finally {
      setSavingKey("");
    }
  }, [pushToast]);

  useEffect(() => {
    if (!loading && (!profile || profile.role !== "admin")) {
      router.replace("/login");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!loading && profile?.role === "admin") {
      loadSettings();
    }
  }, [loading, profile?.role, loadSettings]);

  const toggleCategoryExpand = (id) => {
    setExpandedCategoryIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const openCategoryModal = (mode, category = null) => {
    setModalState({
      open: true,
      type: "category",
      mode,
      id: category?.id || "",
      categoryId: "",
      form: {
        name: category?.name || "",
        nameMl: category?.nameMl || "",
        icon: category?.icon || "📌",
        aiTip: category?.aiTip || "",
        description: "",
        descriptionMl: "",
        isActive: category?.isActive !== false,
      },
    });
  };

  const openSubcategoryModal = (mode, categoryId, subcategory = null) => {
    setModalState({
      open: true,
      type: "subcategory",
      mode,
      id: subcategory?.id || "",
      categoryId: categoryId || subcategory?.category_id || "",
      form: {
        name: subcategory?.name || "",
        nameMl: subcategory?.nameMl || "",
        icon: "📌",
        aiTip: "",
        description: subcategory?.description || "",
        descriptionMl: subcategory?.descriptionMl || "",
        isActive: subcategory?.isActive !== false,
      },
    });
  };

  const closeModal = () => {
    setModalState((current) => ({ ...current, open: false }));
  };

  const saveModal = async () => {
    if (modalState.type === "category") {
      const action = modalState.mode === "add" ? "add_category" : "update_category";
      const ok = await submitUpdate(
        action,
        {
          id: modalState.id,
          name: modalState.form.name,
          nameMl: modalState.form.nameMl,
          icon: modalState.form.icon,
          aiTip: modalState.form.aiTip,
          isActive: modalState.form.isActive,
        },
        "Category saved",
        "Category settings were updated.",
      );
      if (ok) {
        closeModal();
        loadSettings();
      }
      return;
    }

    const action = modalState.mode === "add" ? "add_subcategory" : "update_subcategory";
    const ok = await submitUpdate(
      action,
      {
        id: modalState.id,
        categoryId: modalState.categoryId,
        name: modalState.form.name,
        nameMl: modalState.form.nameMl,
        description: modalState.form.description,
        descriptionMl: modalState.form.descriptionMl,
        isActive: modalState.form.isActive,
      },
      "Subcategory saved",
      "Subcategory settings were updated.",
    );
    if (ok) {
      closeModal();
      loadSettings();
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category and all its subcategories?")) return;
    const ok = await submitUpdate("delete_category", { id }, "Category deleted", "Category removed successfully.");
    if (ok) loadSettings();
  };

  const deleteSubcategory = async (id) => {
    if (!window.confirm("Delete this subcategory?")) return;
    const ok = await submitUpdate("delete_subcategory", { id }, "Subcategory deleted", "Subcategory removed successfully.");
    if (ok) loadSettings();
  };

  if (loading || pageLoading) {
    return <main className="ui-bg flex min-h-screen items-center justify-center"><div className="h-6 w-40 animate-pulse rounded bg-slate-200" /></main>;
  }

  return (
    <AppShell role="admin" pageTitle="Settings" profileName={profile?.name || "Admin"}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="mx-auto max-w-6xl space-y-5 pb-10">
        <div className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">⚙️ Admin Settings</h1>
          <p className="mt-2 text-sm text-slate-600">Configure system preferences and rules</p>
        </div>

        <div className="grid gap-5">
          <SectionCard icon="👤" title="Profile Settings" subtitle="Manage account identity and password.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Name
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Email
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Current Password
                <input
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={(event) => setProfileForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                New Password
                <input
                  type="password"
                  value={profileForm.newPassword}
                  onChange={(event) => setProfileForm((current) => ({ ...current, newPassword: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Confirm Password
                <input
                  type="password"
                  value={profileForm.confirmPassword}
                  onChange={(event) => setProfileForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => submitUpdate("update_profile", profileForm, "Profile saved", "Profile settings were updated.")}
                disabled={savingKey === "update_profile"}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingKey === "update_profile" ? "Saving..." : "Save"}
              </button>
            </div>
          </SectionCard>

          <SectionCard icon="⏱" title="Complaint Rules" subtitle="Configure complaint deadlines and upload limits.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  Default Resolution Time (days)
                  <InfoTip text="Default timeline for non-urgent complaints." />
                </span>
                <input type="number" min={1} max={30} value={complaintRules.defaultResolutionDays} onChange={(event) => setComplaintRules((current) => ({ ...current, defaultResolutionDays: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  Urgent Issue Deadline (hours)
                  <InfoTip text="Used for urgent priority complaints." />
                </span>
                <input type="number" min={1} max={168} value={complaintRules.urgentIssueHours} onChange={(event) => setComplaintRules((current) => ({ ...current, urgentIssueHours: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  Escalation Trigger (hours)
                  <InfoTip text="Automatically escalate complaints after this threshold." />
                </span>
                <input type="number" min={1} max={720} value={complaintRules.escalationTriggerHours} onChange={(event) => setComplaintRules((current) => ({ ...current, escalationTriggerHours: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  Max Image Upload Limit
                  <InfoTip text="Maximum issue photos allowed in complaint submission." />
                </span>
                <input type="number" min={1} max={10} value={complaintRules.maxImageUploadLimit} onChange={(event) => setComplaintRules((current) => ({ ...current, maxImageUploadLimit: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => submitUpdate("update_complaint_rules", complaintRules, "Rules saved", "Complaint rules updated.")} disabled={savingKey === "update_complaint_rules"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60">
                {savingKey === "update_complaint_rules" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </SectionCard>

          <SectionCard icon="🔔" title="Notification Settings" subtitle="Enable or disable system notification channels.">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Enable system notifications</span>
                <Toggle checked={notificationSettings.enableSystemNotifications} onChange={(value) => setNotificationSettings((current) => ({ ...current, enableSystemNotifications: value }))} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Enable performance alerts</span>
                <Toggle checked={notificationSettings.enablePerformanceAlerts} onChange={(value) => setNotificationSettings((current) => ({ ...current, enablePerformanceAlerts: value }))} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Enable reminder alerts</span>
                <Toggle checked={notificationSettings.enableReminderAlerts} onChange={(value) => setNotificationSettings((current) => ({ ...current, enableReminderAlerts: value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => submitUpdate("update_notification_settings", notificationSettings, "Notifications saved", "Notification settings updated.")} disabled={savingKey === "update_notification_settings"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60">
                {savingKey === "update_notification_settings" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </SectionCard>

          <SectionCard icon="📊" title="Report Settings" subtitle="Control auto reports and export format.">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Auto-generate weekly report</span>
                <Toggle checked={reportSettings.autoGenerateWeeklyReport} onChange={(value) => setReportSettings((current) => ({ ...current, autoGenerateWeeklyReport: value }))} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Auto-generate monthly report</span>
                <Toggle checked={reportSettings.autoGenerateMonthlyReport} onChange={(value) => setReportSettings((current) => ({ ...current, autoGenerateMonthlyReport: value }))} />
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Export format
                <select value={reportSettings.exportFormat} onChange={(event) => setReportSettings((current) => ({ ...current, exportFormat: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => submitUpdate("update_report_settings", reportSettings, "Report settings saved", "Report settings updated.")} disabled={savingKey === "update_report_settings"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60">
                {savingKey === "update_report_settings" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </SectionCard>

          <SectionCard icon="🏷" title="Category & Subcategory Management" subtitle="Add, edit, and delete categories with expandable subcategory lists.">
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={() => openCategoryModal("add")} className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100">
                + Add Category
              </button>
            </div>

            <div className="space-y-3">
              {categories.map((category) => {
                const isExpanded = expandedCategoryIds.includes(category.id);
                return (
                  <div key={category.id} className="rounded-xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <button type="button" onClick={() => toggleCategoryExpand(category.id)} className="flex items-center gap-2 text-left">
                        <span className="text-lg">{category.icon || "📌"}</span>
                        <span className="font-semibold text-slate-900">{category.name}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${category.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                          {category.isActive ? "Active" : "Inactive"}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openSubcategoryModal("add", category.id)} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">+ Subcategory</button>
                        <button type="button" onClick={() => openCategoryModal("edit", category)} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">Edit</button>
                        <button type="button" onClick={() => deleteCategory(category.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Delete</button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 py-3">
                        {(category.subcategories || []).length === 0 ? (
                          <p className="text-sm text-slate-500">No subcategories yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {category.subcategories.map((sub) => (
                              <div key={sub.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{sub.name}</p>
                                  <p className="text-xs text-slate-500">{sub.description || "No description"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sub.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>{sub.isActive ? "Active" : "Inactive"}</span>
                                  <button type="button" onClick={() => openSubcategoryModal("edit", category.id, sub)} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">Edit</button>
                                  <button type="button" onClick={() => deleteSubcategory(sub.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard icon="🔐" title="Security Settings" subtitle="Configure account security policies.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Force password reset for staff</span>
                <Toggle checked={securitySettings.forcePasswordResetForStaff} onChange={(value) => setSecuritySettings((current) => ({ ...current, forcePasswordResetForStaff: value }))} />
              </div>
              <label className="text-sm font-semibold text-slate-700">
                Session timeout (minutes)
                <input type="number" min={5} max={720} value={securitySettings.sessionTimeoutMinutes} onChange={(event) => setSecuritySettings((current) => ({ ...current, sessionTimeoutMinutes: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Max login attempts
                <input type="number" min={3} max={15} value={securitySettings.maxLoginAttempts} onChange={(event) => setSecuritySettings((current) => ({ ...current, maxLoginAttempts: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => submitUpdate("update_security_settings", securitySettings, "Security saved", "Security settings updated.")} disabled={savingKey === "update_security_settings"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60">
                {savingKey === "update_security_settings" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </SectionCard>

          <SectionCard icon="📢" title="Global Notice Settings" subtitle="Control global notice behavior for all users.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Enable global notices</span>
                <Toggle checked={noticeSettings.enableGlobalNotices} onChange={(value) => setNoticeSettings((current) => ({ ...current, enableGlobalNotices: value }))} />
              </div>
              <label className="text-sm font-semibold text-slate-700">
                Notice expiry duration (days)
                <input type="number" min={1} max={90} value={noticeSettings.noticeExpiryDays} onChange={(event) => setNoticeSettings((current) => ({ ...current, noticeExpiryDays: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Pin important notices</span>
                <Toggle checked={noticeSettings.pinImportantNotices} onChange={(value) => setNoticeSettings((current) => ({ ...current, pinImportantNotices: value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => submitUpdate("update_notice_settings", noticeSettings, "Notice settings saved", "Global notice settings updated.")} disabled={savingKey === "update_notice_settings"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60">
                {savingKey === "update_notice_settings" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </SectionCard>
        </div>

        {modalState.open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900">
                {modalState.mode === "add" ? "Add" : "Edit"} {modalState.type === "category" ? "Category" : "Subcategory"}
              </h3>

              <div className="mt-4 grid gap-3">
                {modalState.type === "subcategory" && (
                  <label className="text-sm font-semibold text-slate-700">
                    Category
                    <select
                      value={modalState.categoryId}
                      onChange={(event) => setModalState((current) => ({ ...current, categoryId: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select category</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="text-sm font-semibold text-slate-700">
                  Name
                  <input value={modalState.form.name} onChange={(event) => setModalState((current) => ({ ...current, form: { ...current.form, name: event.target.value } }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Name (Malayalam)
                  <input value={modalState.form.nameMl} onChange={(event) => setModalState((current) => ({ ...current, form: { ...current.form, nameMl: event.target.value } }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                </label>

                {modalState.type === "category" ? (
                  <>
                    <label className="text-sm font-semibold text-slate-700">
                      Icon
                      <input value={modalState.form.icon} onChange={(event) => setModalState((current) => ({ ...current, form: { ...current.form, icon: event.target.value } }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      AI Tip
                      <textarea value={modalState.form.aiTip} onChange={(event) => setModalState((current) => ({ ...current, form: { ...current.form, aiTip: event.target.value } }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="text-sm font-semibold text-slate-700">
                      Description
                      <textarea value={modalState.form.description} onChange={(event) => setModalState((current) => ({ ...current, form: { ...current.form, description: event.target.value } }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Description (Malayalam)
                      <textarea value={modalState.form.descriptionMl} onChange={(event) => setModalState((current) => ({ ...current, form: { ...current.form, descriptionMl: event.target.value } }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    </label>
                  </>
                )}

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-700">Active</span>
                  <Toggle checked={modalState.form.isActive} onChange={(value) => setModalState((current) => ({ ...current, form: { ...current.form, isActive: value } }))} />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="button" onClick={saveModal} disabled={Boolean(savingKey)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {savingKey ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
