"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { pick } from "@/lib/language-utils";
import { BackArrowButton } from "@/components/ui/back-arrow-button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { formatExactDateTime } from "@/lib/date-time";

// Icon components for better visual appeal
const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00-.293.707l-2.828 2.829a1 1 0 101.414 1.415L9 10.414V6z" clipRule="evenodd" />
  </svg>
);

const AlertIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

function fmt(value) {
  return formatExactDateTime(value, "-");
}

function isValidPhoneNumber(value) {
  return /^\d{10}$/.test(String(value || "").trim());
}

function isValidGmailAddress(value) {
  return /^[^\s@]+@gmail\.com$/i.test(String(value || "").trim());
}

function getRatingLabel(rating) {
  if (rating <= 1) return "Poor";
  if (rating === 2) return "Fair";
  if (rating === 3) return "Good";
  if (rating === 4) return "Very Good";
  return "Excellent";
}

function normalizeCitizenStatus(status) {
  if (["submitted", "under_review"].includes(status)) return "pending";
  if (["assigned", "inspection_scheduled"].includes(status)) return "assigned";
  if (["in_progress", "partially_resolved", "on_hold"].includes(status)) return "in_progress";
  if (["resolved", "closed"].includes(status)) return "resolved";
  if (status === "overdue") return "overdue";
  return "pending";
}

function Countdown({ deadline, status }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return undefined;
    const intervalId = setInterval(tick, 60000);
    return () => clearInterval(intervalId);
    function tick() {
      setNow(Date.now());
    }
  }, [deadline, status]);

  const timeLeft = useMemo(() => {
    if (!deadline) return "-";
    const target = new Date(deadline).getTime();
    if (Number.isNaN(target)) return "-";

    const diff = target - now;
    const abs = Math.abs(diff);
    const days = Math.floor(abs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
    const label = `${days}d ${hours}h ${minutes}m`;

    if (diff < 0 && status !== "resolved" && status !== "closed") {
      return `Overdue by ${label}`;
    }
    return `${label} remaining`;
  }, [deadline, now, status]);

  return <span>{timeLeft}</span>;
}

export function TrackingView({ lang = "en" }) {
  const searchParams = useSearchParams();
  const [trackingId, setTrackingId] = useState("");
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showFinder, setShowFinder] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupSearched, setLookupSearched] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRecord, setFeedbackRecord] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  useEffect(() => {
    const prefillId = searchParams.get("tracking_id") || "";
    if (prefillId) {
      setTrackingId(prefillId);
    }
  }, [searchParams]);

  const citizenStatus = normalizeCitizenStatus(record?.status);
  const reportedAt = record?.latest_reported_at || record?.created_at;
  const timelineSteps = useMemo(
    () => [
      {
        id: "reported",
        label: pick(lang, "Reported", "Reported"),
        done: Boolean(reportedAt),
      },
      {
        id: "assigned",
        label: pick(lang, "Assigned", "Assigned"),
        done: ["assigned", "inspection_scheduled", "in_progress", "partially_resolved", "resolved", "closed", "overdue"].includes(record?.status),
      },
      {
        id: "in_progress",
        label: pick(lang, "In Progress", "In Progress"),
        done: ["in_progress", "partially_resolved", "resolved", "closed", "overdue"].includes(record?.status),
      },
      {
        id: "resolved",
        label: pick(lang, "Resolved", "Resolved"),
        done: ["resolved", "closed"].includes(record?.status),
      },
    ],
    [lang, reportedAt, record?.status]
  );

  const resolutionImages = useMemo(() => {
    if (!record?.complaint_images?.length) return [];
    const resolutionOnly = record.complaint_images.filter((img) =>
      String(img.image_type || "").toLowerCase().includes("resolution")
    );
    return resolutionOnly.length > 0 ? resolutionOnly : record.complaint_images;
  }, [record?.complaint_images]);

  const search = async (e) => {
    e.preventDefault();
    setError("");
    setRecord(null);
    const id = trackingId.trim();
    if (!id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/complaints/track/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Not found");
      setRecord(json.data);
    } catch (err) {
      setError(err.message || pick(lang, "Not found", "Not found"));
    } finally {
      setLoading(false);
    }
  };

  const findComplaints = async (e) => {
    e.preventDefault();
    setLookupError("");
    setLookupResults([]);
    setLookupSearched(false);

    const phone = lookupPhone.trim();
    const email = lookupEmail.trim().toLowerCase();

    if (!phone && !email) {
      setLookupError(
        pick(
          lang,
          "Enter phone number or email to find your complaints.",
          "Enter phone number or email to find your complaints."
        )
      );
      return;
    }

    if (phone && !isValidPhoneNumber(phone)) {
      setLookupError(
        pick(
          lang,
          "Phone number must be exactly 10 digits.",
          "ഫോൺ നമ്പർ 10 അക്കങ്ങൾ ആയിരിക്കണം."
        )
      );
      return;
    }

    if (email && !isValidGmailAddress(email)) {
      setLookupError(
        pick(
          lang,
          "Email must be a valid @gmail.com address.",
          "ഇമെയിൽ വിലാസം @gmail.com ആയിരിക്കണം."
        )
      );
      return;
    }

    setLookupLoading(true);
    try {
      const res = await fetch("/api/complaints/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone || undefined, email: email || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Lookup failed");

      setLookupResults(json.data?.complaints || []);
      setLookupSearched(true);
    } catch (err) {
      setLookupError(err.message || pick(lang, "Unable to find complaints right now.", "Unable to find complaints right now."));
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    if (!record?.id || !(record.status === "resolved" || record.status === "closed")) {
      setFeedbackRecord(null);
      setRating(0);
      setFeedbackText("");
      setFeedbackError("");
      return;
    }

    let alive = true;
    const loadFeedback = async () => {
      setFeedbackLoading(true);
      try {
        const res = await fetch(`/api/feedback/get/${encodeURIComponent(record.id)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load feedback");
        }

        if (!alive) return;
        const existing = json.data || null;
        setFeedbackRecord(existing);
        if (existing) {
          setRating(Number(existing.rating) || 0);
          setFeedbackText(existing.feedback || "");
        }
      } catch (err) {
        if (!alive) return;
        setFeedbackError(err?.message || "Failed to load feedback");
      } finally {
        if (alive) setFeedbackLoading(false);
      }
    };

    loadFeedback();
    return () => {
      alive = false;
    };
  }, [record?.id, record?.status]);

  const submitFeedback = async () => {
    if (!record?.id || rating < 1 || feedbackSubmitting || feedbackRecord) return;

    setFeedbackSubmitting(true);
    setFeedbackError("");
    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: record.id,
          rating,
          feedback: feedbackText.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Unable to submit feedback");
      }

      setFeedbackRecord(json.data || null);
    } catch (err) {
      setFeedbackError(err?.message || "Unable to submit feedback");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <main className="ui-bg min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackArrowButton href="/" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pick(lang, "Track Your Complaint", "Track Your Complaint")}</h1>
              <p className="mt-1 text-sm text-gray-600">{pick(lang, "Monitor the status and progress of your issue", "Monitor the status and progress of your issue")}</p>
            </div>
          </div>
          <LanguageSwitcher lang={lang} />
        </div>

        {/* Main Search Section */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-lg ring-1 ring-white/50 backdrop-blur-sm sm:p-8">
          <form onSubmit={search} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800" htmlFor="track-id">
                {pick(lang, "Enter Your Track ID", "Enter Your Track ID")}
              </label>
              <p className="mt-1 text-xs text-gray-600">{pick(lang, "Format: NP-KTM-YYYY-XXXX", "Format: NP-KTM-YYYY-XXXX")}</p>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <input
                  id="track-id"
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  placeholder="NP-KTM-2024-0001"
                  className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !trackingId.trim()}
                className="ui-button-primary flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <SearchIcon />
                {loading ? pick(lang, "Searching...", "Searching...") : pick(lang, "Track Issue", "Track Issue")}
              </button>
            </div>

            {error && (
              <div className="flex gap-3 rounded-lg border-l-4 border-red-500 bg-red-50 p-3">
                <AlertIcon className="text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Toggle Forgot ID Section */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowFinder((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <svg className={`h-5 w-5 transition-transform ${showFinder ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {showFinder
              ? pick(lang, "Hide Alternative Search", "Hide Alternative Search")
              : pick(lang, "Can't Find Your Track ID?", "Can't Find Your Track ID?")}
          </button>

          {showFinder && (
            <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 ring-1 ring-white/50 backdrop-blur-sm sm:p-8">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">{pick(lang, "Find Your Complaints", "Find Your Complaints")}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {pick(
                    lang,
                    "Enter the phone number or email you used when reporting to find all your complaints.",
                    "Enter the phone number or email you used when reporting to find all your complaints."
                  )}
                </p>
              </div>

              <form onSubmit={findComplaints} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="tel"
                    value={lookupPhone}
                    onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder={pick(lang, "Phone Number", "Phone Number")}
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    className="rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                  <input
                    type="email"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder={pick(lang, "Email Address", "Email Address")}
                    pattern="^[^\\s@]+@gmail\\.com$"
                    className="rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={lookupLoading || (!lookupPhone.trim() && !lookupEmail.trim())}
                  className="ui-button-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <SearchIcon />
                  {lookupLoading ? pick(lang, "Searching...", "Searching...") : pick(lang, "Find My Complaints", "Find My Complaints")}
                </button>
              </form>

              {lookupError && (
                <div className="mt-4 flex gap-3 rounded-lg border-l-4 border-red-500 bg-red-50 p-3">
                  <AlertIcon className="text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{lookupError}</p>
                </div>
              )}

              {lookupSearched && lookupResults.length === 0 && !lookupError && (
                <div className="mt-4 flex gap-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3">
                  <AlertIcon className="text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">{pick(lang, "No complaints found with that contact information", "No complaints found with that contact information")}</p>
                </div>
              )}

              {lookupResults.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">{pick(lang, "Found Complaints", "Found Complaints")} ({lookupResults.length})</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {lookupResults.map((item) => (
                      <Link
                        key={item.tracking_id}
                        href={`/complaint/${encodeURIComponent(item.tracking_id)}?from=track`}
                        className="group rounded-lg border-2 border-gray-200 bg-white p-4 transition hover:border-amber-400 hover:shadow-md hover:scale-105"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-blue-700 group-hover:text-blue-900">{item.tracking_id}</p>
                            <p className="mt-1 text-xs text-gray-600">{item.category || "-"}</p>
                            <p className="mt-2 text-xs text-gray-500">{fmt(item.created_at)}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[item.status] || "bg-slate-100 text-slate-800"}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {record && (
          <div className="mt-8 space-y-6">
            {/* Status Card */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-6 shadow-lg ring-1 ring-white/50 sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{pick(lang, "Complaint Status", "Complaint Status")}</h2>
                <div className={`flex items-center gap-2 rounded-full px-4 py-2 font-semibold ${STATUS_COLORS[record.status] || "bg-slate-100 text-slate-800"}`}>
                  <div className="h-2 w-2 rounded-full bg-current opacity-75" />
                  {STATUS_LABELS[record.status] || record.status}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Track ID Card */}
                <div className="group rounded-xl border-2 border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md hover:scale-105">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500">{pick(lang, "Track ID", "Track ID")}</p>
                      <p className="mt-2 font-mono text-sm font-bold text-gray-900">{record.tracking_id || "-"}</p>
                    </div>
                    <svg className="h-5 w-5 text-gray-400 transition group-hover:text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                </div>

                {/* Status Card */}
                <div className="group rounded-xl border-2 border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md hover:scale-105">
                  <p className="text-xs font-semibold uppercase text-gray-500">{pick(lang, "Current Status", "Current Status")}</p>
                  <p className={`mt-2 text-sm font-bold ${citizenStatus === "overdue" ? "text-red-700" : citizenStatus === "resolved" ? "text-green-700" : "text-gray-900"}`}>
                    {citizenStatus === "pending"
                      ? pick(lang, "Pending", "Pending")
                      : citizenStatus === "assigned"
                      ? pick(lang, "Assigned", "Assigned")
                      : citizenStatus === "in_progress"
                      ? pick(lang, "In Progress", "In Progress")
                      : citizenStatus === "resolved"
                      ? pick(lang, "Resolved", "Resolved")
                      : pick(lang, "Overdue", "Overdue")}
                  </p>
                </div>

                {/* Department Card */}
                <div className="group rounded-xl border-2 border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md hover:scale-105">
                  <p className="text-xs font-semibold uppercase text-gray-500">{pick(lang, "Assigned To", "Assigned To")}</p>
                  <p className="mt-2 text-sm font-bold text-gray-900">{record.assigned_role || record.local_bodies?.name || pick(lang, "Pending", "Pending")}</p>
                </div>

                {/* Deadline Card */}
                <div className={`group rounded-xl border-2 p-4 transition hover:shadow-md hover:scale-105 ${record.status === "overdue" ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
                  <p className="text-xs font-semibold uppercase text-gray-500">{pick(lang, "Deadline", "Deadline")}</p>
                  <p className={`mt-2 text-sm font-bold ${record.status === "overdue" ? "text-red-700" : "text-gray-900"}`}>{fmt(record.resolution_deadline)}</p>
                  <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${record.status === "overdue" ? "text-red-700" : "text-blue-700"}`}>
                    <ClockIcon />
                    <Countdown deadline={record.resolution_deadline} status={record.status} />
                  </p>
                </div>
              </div>

              {record.status === "overdue" && (
                <div className="mt-6 flex gap-3 rounded-xl border-l-4 border-red-500 bg-red-50 p-4">
                  <AlertIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-900">{pick(lang, "Issue Overdue", "Issue Overdue")}</h4>
                    <p className="mt-1 text-sm text-red-700">
                      {pick(lang, "This issue has exceeded the resolution deadline and has been marked for escalation to higher authorities.", "This issue has exceeded the resolution deadline and has been marked for escalation to higher authorities.")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Section */}
            <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-8">
              <h3 className="mb-6 text-lg font-bold text-gray-900">{pick(lang, "Resolution Timeline", "Resolution Timeline")}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {timelineSteps.map((step, index) => (
                  <div key={step.id} className="relative">
                    <div className={`rounded-xl border-2 p-4 transition ${step.done ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                      <div className="flex flex-col items-center gap-2 text-center">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            step.done ? "bg-green-600 text-white" : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          {step.done ? <CheckIcon /> : index + 1}
                        </span>
                        <p className="text-xs font-semibold text-gray-800">{step.label}</p>
                      </div>
                    </div>
                    {index < timelineSteps.length - 1 && (
                      <div className={`absolute -right-1.5 top-1/2 h-1 w-3 -translate-y-1/2 transform ${step.done ? "bg-green-600" : "bg-gray-300"}`} />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-gray-600">
                <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                </svg>
                {pick(lang, "Reported", "Reported")}: {fmt(reportedAt)}
              </p>
            </div>

            {/* Resolution Images Section */}
            {resolutionImages.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-8">
                <h3 className="mb-6 text-lg font-bold text-gray-900">{pick(lang, "Resolution Proof Images", "Resolution Proof Images")}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {resolutionImages.map((img) => (
                    <a
                      key={img.id}
                      href={img.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative overflow-hidden rounded-xl border-2 border-gray-200 transition hover:border-blue-300 hover:shadow-lg"
                    >
                      <Image
                        src={img.image_url}
                        alt={img.image_type || "proof"}
                        width={360}
                        height={220}
                        className="h-32 w-full object-cover transition group-hover:scale-110"
                        unoptimized
                      />
                      <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100">
                        <p className="pb-2 text-center text-xs font-semibold text-white">{img.image_type || "image"}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {(record.status === "resolved" || record.status === "closed") && (
              <div className="overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-white/80 via-amber-50/70 to-orange-50/70 p-6 shadow-lg backdrop-blur sm:p-8">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <h3 className="text-lg font-bold text-gray-900">{pick(lang, "Rate This Resolution", "Rate This Resolution")}</h3>
                </div>

                {feedbackLoading ? (
                  <div className="mt-4 h-24 animate-pulse rounded-xl border border-amber-200 bg-white/70" />
                ) : feedbackRecord ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <p className="text-sm font-semibold text-emerald-900">{pick(lang, "Thank you for your feedback!", "Thank you for your feedback!")}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={`track-saved-star-${n}`} className={feedbackRecord.rating >= n ? "text-amber-500" : "text-slate-300"}>⭐</span>
                        ))}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-700">{getRatingLabel(Number(feedbackRecord.rating) || 0)}</span>
                    </div>
                    {feedbackRecord.feedback ? (
                      <p className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">💬 {feedbackRecord.feedback}</p>
                    ) : (
                      <p className="text-xs text-slate-600">{pick(lang, "No additional comments provided.", "No additional comments provided.")}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{pick(lang, "How satisfied are you?", "How satisfied are you?")}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={`track-star-${n}`}
                            type="button"
                            onClick={() => setRating(n)}
                            className={`group rounded-xl px-3 py-2 transition hover:-translate-y-0.5 ${
                              rating >= n
                                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow"
                                : "bg-white text-slate-400 border border-slate-200"
                            }`}
                          >
                            <span>⭐</span>
                            <span className="ml-1 text-xs font-semibold">{n}</span>
                            <span className="pointer-events-none absolute opacity-0" aria-hidden="true">{getRatingLabel(n)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">💬 {pick(lang, "Share your experience (optional)", "Share your experience (optional)")}</label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value.slice(0, 300))}
                        rows={4}
                        maxLength={300}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                      />
                      <p className="mt-1 text-right text-xs text-slate-500">{feedbackText.length}/300</p>
                    </div>

                    {feedbackError && (
                      <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-700">{feedbackError}</div>
                    )}

                    <button
                      type="button"
                      onClick={submitFeedback}
                      disabled={rating < 1 || feedbackSubmitting}
                      className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {feedbackSubmitting ? pick(lang, "Submitting...", "Submitting...") : pick(lang, "Submit Feedback", "Submit Feedback")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* View Full Details CTA */}
            <div className="flex justify-center">
              <Link
                href={`/complaint/${encodeURIComponent(record.tracking_id)}?from=track`}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-xl hover:scale-105"
              >
                {pick(lang, "View Full Complaint Details", "View Full Complaint Details")}
                <svg className="h-5 w-5 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
