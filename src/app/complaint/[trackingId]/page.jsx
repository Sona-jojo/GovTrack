"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { pick } from "@/lib/language-utils";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  TRANSITIONS,
} from "@/lib/constants";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { BackArrowButton } from "@/components/ui/back-arrow-button";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatStaffDisplayLabel } from "@/lib/api/staff-management";

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

function fmt(value) {
  if (!value) return "-";
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${day}-${month}-${year}, ${hour12}:${minutes} ${ampm}`;
}

function getTimelineTone(status) {
  if (status === "resolved" || status === "closed") {
    return { dot: "bg-emerald-500", title: "text-emerald-700" };
  }
  if (status === "in_progress") {
    return { dot: "bg-blue-600", title: "text-blue-700" };
  }
  if (status === "overdue") {
    return { dot: "bg-red-600", title: "text-red-700" };
  }
  if (status === "rejected" || status === "on_hold") {
    return { dot: "bg-rose-500", title: "text-rose-700" };
  }
  return { dot: "bg-teal-500", title: "text-teal-700" };
}

export default function ComplaintDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const trackingId = decodeURIComponent(params?.trackingId || "");
  const { user, profile } = useAuth();

  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [record, setRecord] = useState(null);

  const [staff, setStaff] = useState([]);
  const [actionStatus, setActionStatus] = useState("");
  const [actionAssignTo, setActionAssignTo] = useState("");
  const [actionAssignRole, setActionAssignRole] = useState("engineer");
  const [actionDeadline, setActionDeadline] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [copyDone, setCopyDone] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [ratingSaved, setRatingSaved] = useState(false);
  const [toasts, setToasts] = useState([]);

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

  // Role-based back navigation
  const getBackHref = () => {
    if (profile?.role === "secretary") return "/dashboard/secretary";
    if (profile?.role === "engineer") return "/dashboard/engineer";
    if (profile?.role === "clerk") return "/dashboard/clerk";
    if (searchParams.get("from") === "track") return "/track-issue";
    return "/"; // Public users go home
  };
  const backHref = getBackHref();

  const isSecretaryForComplaint =
    profile?.role === "secretary" && record && profile.local_body_id === record.local_body_id;
  const isAssigneeForComplaint =
    (profile?.role === "engineer" || profile?.role === "clerk") &&
    record &&
    user?.id &&
    user.id === record.assigned_to;
  const canEdit = Boolean(isSecretaryForComplaint || isAssigneeForComplaint);
  const isCitizenTrackingFlow = searchParams.get("from") === "track";
  const showRoleActions = canEdit && !isCitizenTrackingFlow;
  const isResolved = record?.status === "resolved" || record?.status === "closed";
  const isOverdue = record?.status === "overdue";
  const isPublicTrackingView = isCitizenTrackingFlow || !profile?.role;
  const publicReporterLabel = record?.is_anonymous
    ? pick(lang, "Anonymous report", "അജ്ഞാത റിപ്പോർട്ട്")
    : (record?.support_count > 1
      ? pick(lang, "Shared citizen reports", "പല പൗര റിപ്പോർട്ടുകൾ")
      : pick(lang, "Private citizen report", "സ്വകാര്യ പൗര റിപ്പോർട്ട്"));
  const showCitizenRating = isResolved && isPublicTrackingView;

  const nextStatusOptions = useMemo(() => {
    // Show all statuses instead of filtered transitions
    return STATUSES.filter((s) => s !== record?.status);
  }, [record?.status]);

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => s.role === actionAssignRole && String(s.status || "").toLowerCase() === "active");
  }, [staff, actionAssignRole]);

  const timelineLogs = useMemo(() => {
    const logs = Array.isArray(record?.status_logs) ? [...record.status_logs] : [];
    if (logs.length === 0 && record) {
      return [
        {
          id: "submitted-initial",
          new_status: record.status || "submitted",
          changed_at: record.created_at || record.updated_at,
          remarks: pick(
            lang,
            "Issue logged and awaiting official update.",
            "Issue logged and awaiting official update."
          ),
          profiles: null,
        },
      ];
    }
    return logs;
  }, [record, lang]);

  const mapLinks = useMemo(() => {
    if (!record?.latitude || !record?.longitude) return null;
    const lat = Number(record.latitude);
    const lng = Number(record.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return {
      google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
    };
  }, [record?.latitude, record?.longitude]);

  const fetchComplaint = async () => {
    if (!trackingId) {
      setError("Tracking ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/complaints/track/${encodeURIComponent(trackingId)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Complaint not found");
      setRecord(json.data);
    } catch (err) {
      setError(err.message || "Complaint not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cookieLang = document.cookie.match(/site_lang=(\w+)/)?.[1] || "en";
    setLang(cookieLang);
  }, []);

  useEffect(() => {
    fetchComplaint();
  }, [trackingId]);

  useEffect(() => {
    if (!record) return;
    setActionStatus(record.status || "");
    setActionAssignTo(record.assigned_to || "");
    setActionAssignRole(record.assigned_role || "engineer");
    setActionDeadline(record.resolution_deadline ? new Date(record.resolution_deadline).toISOString().slice(0, 16) : "");
    setActionRemarks("");
    setActionError("");
    setActionSuccess("");
  }, [record?.id]);

  useEffect(() => {
    if (!isSecretaryForComplaint || !record?.local_body_id) {
      setStaff([]);
      return;
    }

    let alive = true;

    const fetchStaff = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
        const token = data?.session?.access_token || "";

        const res = await fetch(`/api/staff/${record.local_body_id}?status=active`, {
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
  }, [isSecretaryForComplaint, record?.local_body_id]);

  useEffect(() => {
    if (!record?.tracking_id || typeof window === "undefined") return;
    const saved = localStorage.getItem(`rating_${record.tracking_id}`);
    if (!saved) {
      setRating(0);
      setFeedback("");
      setRatingSaved(false);
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setRating(Number(parsed.rating) || 0);
      setFeedback(parsed.feedback || "");
      setRatingSaved(true);
    } catch {
      setRating(0);
      setFeedback("");
      setRatingSaved(false);
    }
  }, [record?.tracking_id]);

  const handleRoleUpdate = async () => {
    if (!record?.id || !canEdit) return;

    const payload = {};
    const statusChanged = actionStatus && actionStatus !== record.status;

    if (statusChanged) payload.status = actionStatus;
    if (actionRemarks.trim()) payload.remarks = actionRemarks.trim();

    if (isSecretaryForComplaint) {
      if (actionAssignTo) payload.assigned_to = actionAssignTo;
      if (actionAssignRole) payload.assigned_role = actionAssignRole;
      if (actionDeadline) payload.resolution_deadline = new Date(actionDeadline).toISOString();
    }

    if (Object.keys(payload).length === 0) {
      setActionError(pick(lang, "No changes to update", "അപ്ഡേറ്റ് ചെയ്യാൻ മാറ്റങ്ങളൊന്നുമില്ല"));
      return;
    }

    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/complaints/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Update failed");

      setActionSuccess(pick(lang, "Complaint updated successfully", "പരാതി വിജയകരമായി അപ്ഡേറ്റ് ചെയ്തു"));
      pushToast("success", "Update saved", pick(lang, "Complaint updated successfully", "പരാതി വിജയകരമായി അപ്ഡേറ്റ് ചെയ്തു"));
      await fetchComplaint();
    } catch (err) {
      setActionError(err.message || "Update failed");
      pushToast("error", "Update failed", err.message || "Please try again");
    } finally {
      setActionLoading(false);
    }
  };

  const copyTrackingId = async () => {
    if (!record?.tracking_id || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(record.tracking_id);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 1200);
    } catch {}
  };

  const saveRating = () => {
    if (!record?.tracking_id || rating < 1 || typeof window === "undefined") return;
    localStorage.setItem(
      `rating_${record.tracking_id}`,
      JSON.stringify({
        rating,
        feedback: feedback.trim(),
        updatedAt: new Date().toISOString(),
      })
    );
    setRatingSaved(true);
    pushToast("success", "Rating saved", pick(lang, "Thanks! Your feedback was saved.", "നന്ദി! നിങ്ങളുടെ പ്രതികരണം സംരക്ഷിച്ചു."));
  };

  const downloadResolutionPdf = () => {
    if (!record || !isResolved || typeof window === "undefined") return;
    const lines = [
      "GOVTRACK - ISSUE RESOLUTION REPORT",
      "",
      `Tracking ID: ${record.tracking_id || "-"}`,
      `Status: ${STATUS_LABELS[record.status] || record.status || "-"}`,
      `Category: ${record.category || "-"}`,
      `Sub Category: ${record.sub_category || "-"}`,
      `Priority: ${record.priority || "-"}`,
      `Local Body: ${record.local_bodies?.name || "-"}`,
      `Reported At: ${fmt(record.created_at)}`,
      `Resolved At: ${fmt(record.resolved_at || record.updated_at)}`,
      "",
      "Description:",
      record.description || "-",
      "",
      "Status Timeline:",
      ...(record.status_logs || []).map(
        (log) =>
          `- ${STATUS_LABELS[log.new_status] || log.new_status} (${fmt(log.changed_at)})${
            log.remarks ? ` | ${log.remarks}` : ""
          }`
      ),
      "",
      "Generated by GovTrack",
    ];

    const html = `
      <html>
        <head>
          <title>Resolution Report - ${record.tracking_id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 12px; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.55; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>GovTrack Resolution Report</h1>
          <pre>${lines.join("\n")}</pre>
        </body>
      </html>
    `;

    const reportWindow = window.open("", "_blank", "width=900,height=700");
    if (!reportWindow) return;
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 sm:py-14">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {/* Gradient Background with Blurred Shapes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-40 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-white to-white" />
      </div>

      {/* Breadcrumb Navigation */}
      <div className="mx-auto mb-6 max-w-6xl px-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900 transition">Home</Link>
          <span>/</span>
          <Link href={isCitizenTrackingFlow ? "/track-issue" : backHref} className="hover:text-slate-900 transition">
            {isCitizenTrackingFlow ? "Track" : "Dashboard"}
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{pick(lang, "Details", "വിവരങ്ങൾ")}</span>
        </div>
      </div>

      {/* Main Container */}
      <section className="mx-auto w-full max-w-6xl">
        {/* Header with Glassmorphism */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl border border-white/50 shadow-xl p-6 sm:p-8 animate-fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <BackArrowButton href={backHref} lang={lang} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
                  {pick(lang, "Complaint Details", "പരാതി വിശദാംശങ്ങൾ")}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {pick(lang, "View and manage your issue report", "നിങ്ങളുടെ പരാതി റിപ്പോർട്ട് കാണുക")}
                </p>
              </div>
            </div>
            <LanguageSwitcher lang={lang} />
          </div>
          
          {/* Status Badge in Header */}
          {record && (
            <div className="mt-4 flex flex-wrap gap-3 items-center">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm font-semibold ${STATUS_COLORS[record.status]?.split(' ').slice(-2).join(' ') || 'text-slate-700'}`}>
                  {STATUS_LABELS[record.status] || record.status}
                </span>
              </div>
              {record.priority && (
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${PRIORITY_COLORS[record.priority]?.replace('text-', 'bg-').replace('border', 'border') || 'bg-gray-100'} border`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V9" />
                  </svg>
                  <span className="text-sm font-semibold">{PRIORITY_LABELS[record.priority] || record.priority}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-xl border border-blue-200/50 p-8 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-slate-700 font-medium">{pick(lang, "Loading complaint details...", "പരാതി വിശദാംശങ്ങൾ ലോഡ് ചെയ്യുന്നു...")}</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl bg-gradient-to-r from-red-50/80 to-rose-50/80 backdrop-blur-xl border-2 border-red-200 border-l-4 border-l-red-600 p-6 flex gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">{pick(lang, "Error Loading Complaint", "പരാതി ലോഡ് ചെയ്യാൻ പരാജയപ്പെട്ടു")}</h3>
              <p className="text-red-800 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {record && !loading && (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Main Content Area */}
            <div className="space-y-6 lg:col-span-2">
              {/* Overdue Alert */}
              {isOverdue && (
                <div className="rounded-2xl bg-gradient-to-r from-red-50/80 to-rose-50/80 backdrop-blur-xl border-2 border-red-200 border-l-4 border-l-red-600 p-6 shadow-lg animate-pulse-slow">
                  <div className="flex gap-4">
                    <svg className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m0-14H8a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-4z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-900">
                        {pick(lang, "⚠ Deadline Exceeded", "⚠ നിശ്ചിത സമയ പരിധി കഴിഞ്ഞു")}
                      </h3>
                      <p className="mt-2 text-red-800">
                        {pick(lang, "This issue has exceeded the resolution deadline and has been escalated to the Panchayath Secretary.", "ഈ പരാതി നിശ്ചിത സമയ പരിധി കഴിഞ്ഞു നിൽക്കുകയും പഞ്ചായത്ത് സെക്രട്ടറിയിലേക്ക് എസ്കലേറ്റ് ചെയ്യപ്പെട്ടുകയും ചെയ്തു.")}
                      </p>
                      <p className="mt-3 font-semibold text-red-900">
                        {pick(lang, "Deadline was:", "നിശ്ചിത സമയപരിധി ഉണ്ടായിരുന്നത്:")}: {fmt(record.resolution_deadline)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Overview Section with Grid Cards */}
              <div className="rounded-2xl bg-gradient-to-br from-white/80 to-blue-50/60 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 sm:px-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    {pick(lang, "Overview", "അവലോകനം")}
                  </h2>
                </div>
                
                <div className="p-6 sm:p-8">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Tracking ID Card */}
                    <div className="group rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-4 hover:shadow-lg hover:scale-105 transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <button
                          onClick={copyTrackingId}
                          className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                        >
                          {copyDone ? "✓" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs font-semibold uppercase text-slate-600 mb-2">{pick(lang, "Tracking ID", "ട്രാക്കിംഗ് അയ്ഡി")}</p>
                      <p className="font-mono text-sm font-bold text-blue-900">{record.tracking_id}</p>
                    </div>

                    {/* Priority Card */}
                    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 p-4 hover:shadow-lg transition-all">
                      <svg className="w-5 h-5 text-amber-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs font-semibold uppercase text-slate-600 mb-2">{pick(lang, "Priority", "പ്രാധാന്യം")}</p>
                      <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold text-sm ${PRIORITY_COLORS[record.priority] || 'bg-gray-100 text-gray-800'}`}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        {PRIORITY_LABELS[record.priority] || record.priority || "-"}
                      </p>
                    </div>

                    {/* Status Card */}
                    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-4 hover:shadow-lg transition-all">
                      <svg className="w-5 h-5 text-emerald-600 mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs font-semibold uppercase text-slate-600 mb-2">{pick(lang, "Status", "സ്ഥിതി")}</p>
                      <p className={`inline-block rounded-full px-3 py-1 font-semibold text-sm ${STATUS_COLORS[record.status] || 'bg-slate-100 text-slate-800'}`}>
                        {STATUS_LABELS[record.status] || record.status}
                      </p>
                    </div>

                    {/* Category Card - Spans 2 */}
                    <div className="sm:col-span-2 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 p-4 hover:shadow-lg transition-all">
                      <svg className="w-5 h-5 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <p className="text-xs font-semibold uppercase text-slate-600 mb-2">{pick(lang, "Category", "വിഭാഗം")}</p>
                      <p className="font-semibold text-slate-900">{record.category}{record.sub_category ? ` • ${record.sub_category}` : ""}</p>
                    </div>

                    {/* Reported Date Card */}
                    <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 p-4 hover:shadow-lg transition-all">
                      <svg className="w-5 h-5 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-semibold uppercase text-slate-600 mb-2">{pick(lang, "Reported", "റിപ്പോർട്ട്")}</p>
                      <p className="text-sm text-slate-900 font-semibold">{fmt(record.created_at)}</p>
                    </div>
                  </div>

                  {/* Description - Full Width */}
                  <div className="mt-4 rounded-xl bg-white border-2 border-slate-200 p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <svg className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-xs font-semibold uppercase text-slate-600">{pick(lang, "Description", "വിവരണം")}</p>
                    </div>
                    <p className="text-slate-900 text-sm leading-relaxed whitespace-pre-wrap">{record.description || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div className="rounded-2xl bg-gradient-to-br from-white/80 to-emerald-50/60 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 sm:px-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {pick(lang, "Location", "സ്ഥാനം")}
                  </h2>
                </div>
                
                <div className="p-6 sm:p-8 space-y-4">
                  {/* Address Card */}
                  <div className="rounded-xl bg-gradient-to-br from-white to-slate-50 border-2 border-emerald-200 p-4 hover:shadow-lg transition-all">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "Address", "വിലാസം")}</p>
                        <p className="text-slate-900 text-sm font-semibold">{record.location_text || record.location || "-"}</p>
                      </div>
                    </div>
                  </div>

                  {(record.location_mismatch || record.ward_mismatch) && (
                    <div className="space-y-2">
                      {record.location_mismatch && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                          ⚠ Possible Wrong Panchayath
                        </div>
                      )}
                      {record.ward_mismatch && (
                        <div className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900">
                          ⚠ Possible Wrong Ward
                        </div>
                      )}
                    </div>
                  )}

                  {/* Map Links */}
                  {mapLinks && (
                    <div className="flex gap-3 flex-wrap">
                      <a
                        href={mapLinks.google}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V9" />
                        </svg>
                        {pick(lang, "Google Maps", "Google Maps")}
                      </a>
                      <a
                        href={mapLinks.osm}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        {pick(lang, "OpenStreetMap", "OpenStreetMap")}
                      </a>
                    </div>
                  )}

                  {/* Coordinates Card */}
                  {record.latitude && record.longitude && (
                    <div className="rounded-xl bg-gradient-to-br from-white to-slate-50 border-2 border-teal-200 p-4 font-mono">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase text-slate-600 mb-2">{pick(lang, "Coordinates", "കോ-ഓർഡിനേറ്റുകൾ")}</p>
                          <div className="inline-flex gap-2">
                            <span className="px-3 py-1 rounded-lg bg-teal-100 text-teal-900 text-xs font-semibold">
                              {record.latitude}
                            </span>
                            <span className="px-3 py-1 rounded-lg bg-teal-100 text-teal-900 text-xs font-semibold">
                              {record.longitude}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {timelineLogs.length > 0 && (
                <div id="status-timeline" className="rounded-2xl bg-gradient-to-br from-white/80 to-violet-50/60 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-4 sm:px-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      {pick(lang, "Status Timeline", "സ്ഥിതി സമയരേഖ")}
                    </h2>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    <div className="relative space-y-6">
                      {timelineLogs.map((log, i) => {
                        const tone = getTimelineTone(log.new_status);
                        const isLast = i === timelineLogs.length - 1;
                        return (
                          <div key={log.id || i} className="relative pl-16 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                            {/* Timeline Line */}
                            {!isLast && (
                              <div className="absolute left-6 top-16 h-12 w-1 bg-gradient-to-b from-violet-400 to-violet-200" />
                            )}
                            
                            {/* Timeline Circle */}
                            <div className={`absolute left-0 top-0 inline-flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg ${tone.dot}`}>
                              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>

                            {/* Timeline Card */}
                            <div className={`rounded-xl border-2 p-4 transition-all hover:shadow-lg ${tone.card}`}>
                              <h3 className={`text-xl font-bold ${tone.title}`}>
                                {STATUS_LABELS[log.new_status] || log.new_status}
                              </h3>
                              <p className="mt-2 text-sm text-slate-600 font-medium">{fmt(log.changed_at)}</p>
                              
                              {log.remarks && (
                                <div className="mt-3 rounded-lg bg-white/50 border-l-4 border-slate-300 p-3">
                                  <p className="text-slate-700 text-sm">{log.remarks}</p>
                                </div>
                              )}
                              
                              {log.profiles && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                                  <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                  </svg>
                                  <span className="font-semibold">{log.profiles.name}</span>
                                  <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full capitalize">{log.profiles.role}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {record.complaint_images?.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-br from-white/80 to-pink-50/60 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 sm:px-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                      </svg>
                      {pick(lang, "Attached Images", "ഘടിപ്പിച്ച ചിത്രങ്ങൾ")}
                    </h2>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {record.complaint_images.map((img) => (
                        <a
                          key={img.id}
                          href={img.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative overflow-hidden rounded-xl border-2 border-pink-200 shadow-md hover:shadow-xl transition-all"
                        >
                          <img
                            src={img.image_url}
                            alt={img.image_type}
                            className="h-32 w-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                            <span className="text-white text-xs font-semibold text-center px-2">{img.image_type}</span>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-br from-white/80 to-cyan-50/60 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 sm:px-8">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h1a1 1 0 001-1v-6a1 1 0 00-1-1h-1z" />
                    </svg>
                    {pick(lang, "Additional Details", "കൂടുതൽ വിവരങ്ങൾ")}
                  </h2>
                </div>
                
                <div className="p-6 space-y-3">
                  {/* Local Body */}
                  <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.581m0 0H9m5.581 0a2 2 0 100-4 2 2 0 000 4zM9 7h.01M9 17h.01" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "Local Body", "പ്രാദേശിക സ്ഥാപനം")}</p>
                        <p className="text-slate-900 font-semibold text-sm">{record.local_bodies?.name || record.panchayath || "Not Assigned Yet"}</p>
                      </div>
                    </div>
                  </div>

                  {/* District */}
                  <div className="rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "District", "ജില്ല")}</p>
                        <p className="text-slate-900 font-semibold text-sm">{record.district || record.local_bodies?.district || "Not Assigned Yet"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Role */}
                  <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "Assigned Role", "ചുമതലപ്പെടുത്തിയ റോൾ")}</p>
                        <p className="text-slate-900 font-semibold text-sm capitalize">{record.assigned_role || "Not Assigned Yet"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Assigned To */}
                  <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V9" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "Assigned To", "ചുമതലപ്പെടുത്തിയ വ്യക്തി")}</p>
                        <p className="text-slate-900 font-semibold text-sm">{record.assignee?.name || "Not Assigned Yet"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div className="rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "Deadline", "അവസാന തീയതി")}</p>
                        <p className="text-slate-900 font-semibold text-sm">{fmt(record.resolution_deadline)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Escalation Count */}
                  <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "Escalations", "Escalations")}</p>
                        <p className="text-slate-900 font-semibold text-sm">{record.escalation_count ?? 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Updated At */}
                  <div className="rounded-xl bg-gradient-to-br from-slate-100 to-gray-100 border-2 border-slate-300 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "Updated", "അപ്ഡേറ്റ്")}</p>
                        <p className="text-slate-900 font-semibold text-sm">{fmt(record.updated_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Resolved At */}
                  <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "Resolved", "പരിഹരിച്ചു")}</p>
                        <p className="text-slate-900 font-semibold text-sm">{fmt(record.resolved_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Citizen Info */}
                  <div className="rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V9" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">{pick(lang, "Citizen", "പൗരൻ")}</p>
                        <p className="text-slate-900 font-semibold text-sm">
                          {isPublicTrackingView
                            ? publicReporterLabel
                            : (record.reporter_name || record.reporter_phone || record.reporter_email || pick(lang, "Not Assigned Yet", "ഇതുവരെ നിശ്ചയിച്ചിട്ടില്ല"))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {showRoleActions && (
                <div className="rounded-2xl bg-gradient-to-br from-white/80 to-violet-50/60 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      {pick(lang, "Role Actions", "റോൾ ആക്ഷനുകൾ")}
                    </h2>
                  </div>

                  <div className="p-6 space-y-4">
                    {!profile?.role && (
                      <div className="rounded-lg bg-blue-50 border-l-4 border-blue-500 p-4">
                        <p className="text-sm text-blue-800 font-medium">
                          {pick(lang, "Public users can view details only. Editing is disabled.", "പൊതു ഉപയോക്താക്കൾക്ക് വിവരങ്ങൾ കാണാം. എഡിറ്റിംഗ് അനുവദനീയമല്ല.")}
                        </p>
                      </div>
                    )}

                    {profile?.role && !canEdit && (
                      <div className="rounded-lg bg-amber-50 border-l-4 border-amber-500 p-4">
                        <p className="text-sm text-amber-800 font-medium">
                          {pick(lang, "You are signed in, but this complaint is not editable for your role.", "നിങ്ങൾ ലോഗിൻ ചെയ്തിരിക്കുന്നു, പക്ഷേ ഈ പരാതിയിൽ നിങ്ങളുടെ റോളിന് എഡിറ്റ് അവകാശമില്ല.")}
                        </p>
                      </div>
                    )}

                    {canEdit && (
                      <div className="space-y-4">
                        {/* Status Select */}
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                            {pick(lang, "Update Status", "നിലവാരം അപ്ഡേറ്റ് ചെയ്യുക")}
                          </label>
                          <select
                            value={actionStatus}
                            onChange={(e) => setActionStatus(e.target.value)}
                            className="w-full rounded-lg border-2 border-violet-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                          >
                            <option value="">Select status…</option>
                            {STATUSES.filter((status) => status !== "overdue" || status === record.status).map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status] || status}
                                {status === record.status ? " (current)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {isSecretaryForComplaint && (
                          <>
                            {/* Assign Role Select */}
                            <div>
                              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                                {pick(lang, "Assign Role", "റോൾ നിയോഗിക്കുക")}
                              </label>
                              <select
                                value={actionAssignRole}
                                onChange={(e) => {
                                  setActionAssignRole(e.target.value);
                                  setActionAssignTo("");
                                }}
                                className="w-full rounded-lg border-2 border-violet-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-violet-500"
                              >
                                <option value="engineer">Engineer</option>
                                <option value="clerk">Clerk</option>
                              </select>
                            </div>

                            {/* Assign To Select */}
                            <div>
                              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                                {pick(lang, "Assign To", "ചുമതല നൽകുക")}
                              </label>
                              <select
                                value={actionAssignTo}
                                onChange={(e) => setActionAssignTo(e.target.value)}
                                className="w-full rounded-lg border-2 border-violet-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-violet-500"
                              >
                                <option value="">
                                  {filteredStaff.length === 0 
                                    ? `No ${actionAssignRole}s available` 
                                    : `Select ${actionAssignRole}…`}
                                </option>
                                {filteredStaff.map((s) => (
                                  <option key={s.id} value={s.id}>{formatStaffDisplayLabel(s)}</option>
                                ))}
                              </select>
                              {staff.length === 0 && (
                                <p className="mt-1.5 text-xs text-red-600 font-semibold">⚠️ No staff found for this local body</p>
                              )}
                              {staff.length > 0 && filteredStaff.length === 0 && (
                                <p className="mt-1.5 text-xs text-amber-600 font-semibold">⚠️ No {actionAssignRole}s in this local body</p>
                              )}
                            </div>

                            {/* Deadline Input */}
                            <div>
                              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                                {pick(lang, "Set Deadline", "അവസാന തീയതി നിശ്ചയിക്കുക")}
                              </label>
                              <input
                                type="datetime-local"
                                value={actionDeadline}
                                onChange={(e) => setActionDeadline(e.target.value)}
                                className="w-full rounded-lg border-2 border-violet-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-violet-500"
                              />
                            </div>
                          </>
                        )}

                        {/* Remarks Textarea */}
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-700 mb-2">{pick(lang, "Remarks", "കുറിപ്പുകൾ")}</label>
                          <textarea
                            rows={3}
                            value={actionRemarks}
                            onChange={(e) => setActionRemarks(e.target.value)}
                            placeholder={pick(lang, "Add note for status update", "സ്ഥിതി അപ്ഡേറ്റിനുള്ള കുറിപ്പ് നൽകുക")}
                            className="w-full rounded-lg border-2 border-violet-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 resize-none"
                          />
                        </div>

                        {/* Status Messages */}
                        {actionError && (
                          <div className="rounded-lg bg-red-50 border-l-4 border-red-500 p-3">
                            <p className="text-sm text-red-800 font-medium">{actionError}</p>
                          </div>
                        )}
                        {actionSuccess && (
                          <div className="rounded-lg bg-emerald-50 border-l-4 border-emerald-500 p-3">
                            <p className="text-sm text-emerald-800 font-medium">{actionSuccess}</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <button
                          type="button"
                          onClick={handleRoleUpdate}
                          disabled={actionLoading}
                          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-3 text-sm font-bold text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {actionLoading
                            ? pick(lang, "Updating...", "അപ്ഡേറ്റ് ചെയ്യുന്നു...")
                            : pick(lang, "Save Changes", "മാറ്റങ്ങൾ സേവ് ചെയ്യുക")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {isResolved && (
                <div className="rounded-2xl bg-gradient-to-br from-white/80 to-emerald-50/60 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {pick(lang, "Resolution Report", "Resolution Report")}
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {pick(lang, "Download a printable PDF report of this complaint and its resolution details.", "Download a printable PDF report of this complaint and its resolution details.")}
                    </p>
                    <button
                      type="button"
                      onClick={downloadResolutionPdf}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-3 text-sm font-bold text-white hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {pick(lang, "Download PDF Report", "Download PDF Report")}
                    </button>
                  </div>
                </div>
              )}

              {showCitizenRating && (
                <div className="rounded-2xl bg-gradient-to-br from-white/80 to-amber-50/60 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {pick(lang, "Rate This Resolution", "Rating")}
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-3">{pick(lang, "How satisfied are you with the resolution?", "How satisfied are you?")}</label>
                      <div className="flex gap-3 justify-center">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setRating(n);
                              setRatingSaved(false);
                            }}
                            className={`group relative rounded-xl px-4 py-3 transition-all transform hover:scale-110 ${
                              rating >= n
                                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                            aria-label={`rate-${n}`}
                          >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap">
                              {n === 1 && "Poor"}
                              {n === 2 && "Fair"}
                              {n === 3 && "Good"}
                              {n === 4 && "Very Good"}
                              {n === 5 && "Excellent"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-2">{pick(lang, "Your Feedback", "കുറിപ്പുകൾ")}</label>
                      <textarea
                        value={feedback}
                        onChange={(e) => {
                          setFeedback(e.target.value);
                          setRatingSaved(false);
                        }}
                        rows={3}
                        placeholder={pick(lang, "Share your feedback about the resolution (optional)", "കുറിപ്പ് നൽകുക")}
                        className="w-full rounded-lg border-2 border-amber-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={saveRating}
                      disabled={rating < 1}
                      className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 px-4 py-3 text-sm font-bold text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {pick(lang, "Save Rating", "Save Rating")}
                    </button>

                    {ratingSaved && (
                      <div className="rounded-lg bg-emerald-50 border-l-4 border-emerald-500 p-3">
                        <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {pick(lang, "Thanks! Your rating has been saved.", "Thanks! Rating saved.")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Back Button */}
              <div className="text-center pt-2">
                <Link href="/track-issue" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all hover:scale-105">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {pick(lang, "Back to Tracking", "ട്രാക്കിങ്ങിലേക്ക് മടങ്ങുക")}
                </Link>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}



