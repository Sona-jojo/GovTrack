"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6 sm:w-full">
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
            <button type="button" onClick={() => onDismiss(toast.id)} className="text-sm font-bold opacity-70 transition hover:opacity-100">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold transition ${checked ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-slate-700"}`}
    >
      <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"}`}>
        <span className="h-4 w-4 rounded-full bg-white" />
      </span>
      <span>{label}</span>
    </button>
  );
}

function SectionCard({ icon, title, subtitle, children, actions }) {
  return (
    <section className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)] backdrop-blur-xl transition duration-300 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
            <span>{icon}</span>
            <span>{title}</span>
          </h2>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function SecretarySettingsPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [panchayathInfo, setPanchayathInfo] = useState({
    name: "-",
    district: "-",
    assignedRole: "secretary",
  });

  const [settings, setSettings] = useState({
    complaintRules: {
      preferredResolutionDays: 3,
      priorityHandlingNote: "",
      autoAssignEnabled: false,
    },
    notificationPreferences: {
      newComplaints: true,
      overdueComplaints: true,
      escalations: true,
    },
    staffAssignmentPreferences: {
      defaultAssignRole: "engineer",
      workloadSuggestionEnabled: false,
    },
    languagePreference: { lang: "en" },
  });

  const [saving, setSaving] = useState({
    profile: false,
    complaintRules: false,
    notifications: false,
    assignment: false,
    language: false,
  });

  const pushToast = (type, title, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, type, title, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const dismissToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (!loading && (!profile || profile.role !== "secretary")) {
      router.replace("/login");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile || profile.role !== "secretary") return;

    let active = true;

    const loadSettings = async () => {
      setPageLoading(true);
      try {
        const res = await fetch("/api/secretary/settings/get", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Unable to load settings");
        }

        if (!active) return;

        const data = json.data || {};
        setProfileForm((prev) => ({
          ...prev,
          name: data.profile?.name || "",
          email: data.profile?.email || "",
          phone: data.profile?.phone || "",
          newPassword: "",
          confirmPassword: "",
        }));
        setPanchayathInfo({
          name: data.panchayathInfo?.name || "-",
          district: data.panchayathInfo?.district || "-",
          assignedRole: data.panchayathInfo?.assignedRole || "secretary",
        });
        setSettings(data.settings || settings);

        const preferredLang = data.settings?.languagePreference?.lang;
        if (preferredLang === "en" || preferredLang === "ml") {
          document.cookie = `site_lang=${preferredLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
          try {
            window.localStorage.setItem("site_lang", preferredLang);
          } catch {}
        }

        if (data.tableReady === false) {
          pushToast("error", "Settings table missing", "Run sql/secretary-settings-config.sql to persist secretary settings.");
        }
      } catch (err) {
        if (active) {
          pushToast("error", "Load failed", err?.message || "Unable to load settings");
        }
      } finally {
        if (active) setPageLoading(false);
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, [profile?.id, profile?.role]);

  const hasPasswordInput = useMemo(
    () => Boolean(profileForm.newPassword || profileForm.confirmPassword),
    [profileForm.newPassword, profileForm.confirmPassword],
  );

  const saveSection = async (savingKey, action, payload, successTitle, successMessage) => {
    setSaving((prev) => ({ ...prev, [savingKey]: true }));
    try {
      const res = await fetch("/api/secretary/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Save failed");
      }
      pushToast("success", successTitle, successMessage);
      return true;
    } catch (err) {
      pushToast("error", "Save failed", err?.message || "Unable to save settings");
      return false;
    } finally {
      setSaving((prev) => ({ ...prev, [savingKey]: false }));
    }
  };

  const handleProfileSave = async () => {
    if (!profileForm.name.trim()) {
      pushToast("error", "Validation error", "Name is required.");
      return;
    }
    if (!profileForm.email.trim()) {
      pushToast("error", "Validation error", "Email is required.");
      return;
    }
    if (hasPasswordInput) {
      if (profileForm.newPassword.length < 8) {
        pushToast("error", "Validation error", "New password must be at least 8 characters.");
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        pushToast("error", "Validation error", "New and confirm password must match.");
        return;
      }
    }

    const ok = await saveSection(
      "profile",
      "update_profile",
      profileForm,
      "Profile saved",
      "Your profile settings were updated.",
    );

    if (ok) {
      setProfileForm((prev) => ({ ...prev, newPassword: "", confirmPassword: "" }));
    }
  };

  const handleComplaintRulesSave = async () => {
    await saveSection(
      "complaintRules",
      "update_complaint_rules",
      settings.complaintRules,
      "Complaint rules saved",
      "Local complaint handling rules were updated.",
    );
  };

  const handleNotificationsSave = async () => {
    await saveSection(
      "notifications",
      "update_notification_preferences",
      settings.notificationPreferences,
      "Notification preferences saved",
      "Complaint alert preferences were updated.",
    );
  };

  const handleAssignmentSave = async () => {
    await saveSection(
      "assignment",
      "update_staff_assignment_preferences",
      settings.staffAssignmentPreferences,
      "Assignment preferences saved",
      "Default assignment preferences were updated.",
    );
  };

  const handleLanguageSave = async () => {
    const selectedLang = settings.languagePreference.lang === "ml" ? "ml" : "en";
    document.cookie = `site_lang=${selectedLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    try {
      window.localStorage.setItem("site_lang", selectedLang);
    } catch {}

    await saveSection(
      "language",
      "update_language_preference",
      settings.languagePreference,
      "Language saved",
      selectedLang === "ml" ? "Malayalam selected." : "English selected.",
    );
  };

  if (loading || pageLoading) {
    return <main className="ui-bg flex min-h-screen items-center justify-center"><div className="h-6 w-40 animate-pulse rounded bg-slate-200" /></main>;
  }

  return (
    <AppShell role="secretary" pageTitle="Settings" profileName={profile?.name || "Secretary"}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] border border-white/50 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white shadow-[0_30px_60px_-32px_rgba(15,23,42,0.7)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-200">Secretary Settings</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">⚙️ Secretary Settings</h1>
          <p className="mt-3 max-w-3xl text-sm text-blue-100 sm:text-base">Manage your profile and local configurations</p>
        </div>

        <SectionCard
          icon="👤"
          title="Profile Settings"
          subtitle="Update your profile details and password for secretary access."
          actions={
            <button
              type="button"
              onClick={handleProfileSave}
              disabled={saving.profile}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving.profile ? "Saving..." : "Save Profile"}
            </button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Name
              <input
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Phone Number
              <input
                value={profileForm.phone}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="hidden sm:block" />
            <label className="text-sm font-semibold text-slate-700">
              New Password
              <input
                type="password"
                value={profileForm.newPassword}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="At least 8 characters"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Confirm Password
              <input
                type="password"
                value={profileForm.confirmPassword}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard icon="🏛" title="Panchayath Info" subtitle="Assigned location details (read-only).">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Panchayath</p>
              <p className="mt-1 font-semibold text-slate-900">{panchayathInfo.name || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">District</p>
              <p className="mt-1 font-semibold text-slate-900">{panchayathInfo.district || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Assigned Role</p>
              <p className="mt-1 font-semibold capitalize text-slate-900">{panchayathInfo.assignedRole || "secretary"}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon="⏱"
          title="Local Complaint Rules"
          subtitle="Configure complaint handling rules for your workflow."
          actions={
            <button
              type="button"
              onClick={handleComplaintRulesSave}
              disabled={saving.complaintRules}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving.complaintRules ? "Saving..." : "Save Rules"}
            </button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Preferred Resolution Time (days)
              <input
                type="number"
                min={1}
                max={30}
                value={settings.complaintRules.preferredResolutionDays}
                onChange={(e) => setSettings((prev) => ({
                  ...prev,
                  complaintRules: {
                    ...prev.complaintRules,
                    preferredResolutionDays: Number(e.target.value || 1),
                  },
                }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-end">
              <Toggle
                checked={settings.complaintRules.autoAssignEnabled}
                onChange={(next) => setSettings((prev) => ({
                  ...prev,
                  complaintRules: { ...prev.complaintRules, autoAssignEnabled: next },
                }))}
                label="Auto-assign to staff"
              />
            </div>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Priority Handling Note (optional)
              <textarea
                rows={3}
                value={settings.complaintRules.priorityHandlingNote}
                onChange={(e) => setSettings((prev) => ({
                  ...prev,
                  complaintRules: {
                    ...prev.complaintRules,
                    priorityHandlingNote: e.target.value,
                  },
                }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard
          icon="🔔"
          title="Notification Preferences"
          subtitle="Choose which complaint alerts you want to receive."
          actions={
            <button
              type="button"
              onClick={handleNotificationsSave}
              disabled={saving.notifications}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving.notifications ? "Saving..." : "Save Notifications"}
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              checked={settings.notificationPreferences.newComplaints}
              onChange={(next) => setSettings((prev) => ({
                ...prev,
                notificationPreferences: { ...prev.notificationPreferences, newComplaints: next },
              }))}
              label="Get alerts for new complaints"
            />
            <Toggle
              checked={settings.notificationPreferences.overdueComplaints}
              onChange={(next) => setSettings((prev) => ({
                ...prev,
                notificationPreferences: { ...prev.notificationPreferences, overdueComplaints: next },
              }))}
              label="Get alerts for overdue complaints"
            />
            <Toggle
              checked={settings.notificationPreferences.escalations}
              onChange={(next) => setSettings((prev) => ({
                ...prev,
                notificationPreferences: { ...prev.notificationPreferences, escalations: next },
              }))}
              label="Get escalation notifications"
            />
          </div>
        </SectionCard>

        <SectionCard
          icon="👥"
          title="Staff Assignment Preferences"
          subtitle="Default role and assignment behavior for complaint routing."
          actions={
            <button
              type="button"
              onClick={handleAssignmentSave}
              disabled={saving.assignment}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving.assignment ? "Saving..." : "Save Assignment"}
            </button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Default assign to
              <select
                value={settings.staffAssignmentPreferences.defaultAssignRole}
                onChange={(e) => setSettings((prev) => ({
                  ...prev,
                  staffAssignmentPreferences: {
                    ...prev.staffAssignmentPreferences,
                    defaultAssignRole: e.target.value,
                  },
                }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="engineer">Engineer</option>
                <option value="clerk">Clerk</option>
              </select>
            </label>
            <div className="flex items-end">
              <Toggle
                checked={settings.staffAssignmentPreferences.workloadSuggestionEnabled}
                onChange={(next) => setSettings((prev) => ({
                  ...prev,
                  staffAssignmentPreferences: {
                    ...prev.staffAssignmentPreferences,
                    workloadSuggestionEnabled: next,
                  },
                }))}
                label="Enable workload-based suggestion"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon="🌐"
          title="Language Preference"
          subtitle="Set dashboard language for this browser and secretary profile."
          actions={
            <button
              type="button"
              onClick={handleLanguageSave}
              disabled={saving.language}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving.language ? "Saving..." : "Save Language"}
            </button>
          }
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSettings((prev) => ({
                ...prev,
                languagePreference: { lang: "en" },
              }))}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${settings.languagePreference.lang === "en" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({
                ...prev,
                languagePreference: { lang: "ml" },
              }))}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${settings.languagePreference.lang === "ml" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}
            >
              Malayalam
            </button>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
