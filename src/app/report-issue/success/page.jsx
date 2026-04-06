"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { pick } from "@/lib/language-utils";

function SuccessContent() {
  const searchParams = useSearchParams();
  const trackingId = searchParams.get("trackingId");
  const priority = searchParams.get("priority");
  const isDuplicate = searchParams.get("duplicate") === "1";
  const supportCount = Number(searchParams.get("supportCount") || "0");

  const [fetchedPriority, setFetchedPriority] = useState("");
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const lang =
    typeof window !== "undefined" ? localStorage.getItem("lang") || "en" : "en";

  const effectivePriority = fetchedPriority || priority || "";

  useEffect(() => {
    // For duplicate reports the tracking ID belongs to the original complaint.
    if (isDuplicate) return;

    let cancelled = false;

    async function loadSavedPriority() {
      if (!trackingId) return;
      try {
        const res = await fetch(
          `/api/complaints/track/${encodeURIComponent(trackingId)}`
        );
        const json = await res.json();
        if (!cancelled && json?.success && json?.data?.priority) {
          setFetchedPriority(json.data.priority);
        }
      } catch {
        // Keep query-param priority as fallback.
      }
    }

    loadSavedPriority();
    return () => {
      cancelled = true;
    };
  }, [trackingId, isDuplicate]);

  const resolutionMeta = useMemo(() => {
    switch (effectivePriority) {
      case "low":
        return {
          label: pick(lang, "Low Priority", "Low Priority"),
          eta: pick(lang, "7 days", "7 days"),
          icon: "🟢",
          tone: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-900",
          badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
          note: pick(
            lang,
            "Standard queue handling is in progress.",
            "Standard queue handling is in progress."
          ),
        };
      case "high":
        return {
          label: pick(lang, "Medium/High Priority", "Medium/High Priority"),
          eta: pick(lang, "3 days", "3 days"),
          icon: "🟡",
          tone: "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-900",
          badge: "bg-amber-100 text-amber-700 border-amber-200",
          note: pick(
            lang,
            "This issue is prioritized for faster action.",
            "This issue is prioritized for faster action."
          ),
        };
      case "urgent":
        return {
          label: pick(lang, "Urgent Priority", "Urgent Priority"),
          eta: pick(lang, "24 hours", "24 hours"),
          icon: "🔴",
          tone: "border-rose-200 bg-gradient-to-br from-red-50 to-orange-50 text-rose-900",
          badge: "bg-rose-100 text-rose-700 border-rose-200",
          note: pick(
            lang,
            "Immediate review and escalation workflow has started.",
            "Immediate review and escalation workflow has started."
          ),
        };
      default:
        return {
          label: pick(lang, "Standard Priority", "Standard Priority"),
          eta: pick(lang, "5-7 days", "5-7 days"),
          icon: "🟡",
          tone: "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-900",
          badge: "bg-amber-100 text-amber-700 border-amber-200",
          note: pick(
            lang,
            "Work on this issue will commence shortly.",
            "Work on this issue will commence shortly."
          ),
        };
    }
  }, [effectivePriority, lang]);

  const timeline = useMemo(
    () => [
      {
        id: "1",
        icon: "📥",
        title: pick(lang, "Submitted", "Submitted"),
        text: pick(
          lang,
          "Your complaint has been registered in the local authority system.",
          "Your complaint has been registered in the local authority system."
        ),
      },
      {
        id: "2",
        icon: "🧭",
        title: pick(lang, "Screening", "Screening"),
        text: pick(
          lang,
          "Secretary team reviews details and assigns the right department.",
          "Secretary team reviews details and assigns the right department."
        ),
      },
      {
        id: "3",
        icon: "🛠️",
        title: pick(lang, "Action", "Action"),
        text: pick(
          lang,
          "Field team starts work and status updates become visible in tracking.",
          "Field team starts work and status updates become visible in tracking."
        ),
      },
      {
        id: "4",
        icon: "✅",
        title: pick(lang, "Resolution", "Resolution"),
        text: pick(
          lang,
          "Issue is resolved within the estimated timeline and marked complete.",
          "Issue is resolved within the estimated timeline and marked complete."
        ),
      },
    ],
    [lang]
  );

  const copyTrackingId = async () => {
    if (!trackingId || typeof navigator === "undefined") return;

    try {
      await navigator.clipboard.writeText(trackingId);
      setCopied(true);
      setShowTooltip(true);
      setShowToast(true);

      setTimeout(() => setCopied(false), 1800);
      setTimeout(() => setShowTooltip(false), 1400);
      setTimeout(() => setShowToast(false), 1800);
    } catch {
      setCopied(false);
      setShowTooltip(false);
      setShowToast(false);
    }
  };

  const downloadReceipt = () => {
    if (!trackingId || typeof window === "undefined") return;

    const generatedOn = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const priorityLabel = resolutionMeta.label;
    const duplicateLabel = isDuplicate ? "Linked to existing complaint" : "New complaint";

    const content = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GovTrack Receipt</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #64748b;
        --line: #dbe4f0;
        --blue: #2563eb;
        --blue-weak: #eff6ff;
        --teal: #0f766e;
        --bg: #f8fbff;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(135deg, #e0f2fe 0%, #f8fafc 45%, #eef2ff 100%);
        color: var(--ink);
      }

      .page {
        max-width: 780px;
        margin: 0 auto;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.75);
        border-radius: 28px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
        overflow: hidden;
      }

      .hero {
        padding: 28px 28px 22px;
        background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0ea5e9 100%);
        color: white;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .title {
        margin: 18px 0 10px;
        font-size: 30px;
        line-height: 1.1;
        font-weight: 900;
      }

      .subtitle {
        margin: 0;
        max-width: 56ch;
        color: rgba(255, 255, 255, 0.86);
        font-size: 14px;
        line-height: 1.6;
      }

      .content {
        padding: 28px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .card {
        border: 1px solid var(--line);
        border-radius: 20px;
        background: white;
        padding: 18px;
      }

      .card-label {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .card-value {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        line-height: 1.35;
      }

      .tracking-box {
        margin: 18px 0;
        padding: 18px;
        border: 1px solid #bfdbfe;
        border-radius: 22px;
        background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
      }

      .tracking-label {
        margin: 0 0 10px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #2563eb;
      }

      .tracking-id {
        margin: 0;
        padding: 16px 18px;
        border-radius: 18px;
        background: white;
        border: 1px dashed #93c5fd;
        font-size: 28px;
        font-weight: 900;
        letter-spacing: 0.08em;
        color: #0f172a;
        text-align: center;
        word-break: break-all;
      }

      .status-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .status-pill {
        border-radius: 18px;
        padding: 14px;
        border: 1px solid var(--line);
        background: #fff;
      }

      .status-pill strong {
        display: block;
        font-size: 12px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 6px;
      }

      .status-pill span {
        font-size: 15px;
        font-weight: 800;
        color: var(--ink);
      }

      .footer {
        padding: 18px 28px 28px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
      }

      .footer-note {
        margin: 0;
        padding-top: 14px;
        border-top: 1px solid var(--line);
      }

      @media print {
        body { background: white; padding: 0; }
        .page { border-radius: 0; box-shadow: none; border: none; }
      }

      @media (max-width: 640px) {
        body { padding: 14px; }
        .hero, .content, .footer { padding-left: 18px; padding-right: 18px; }
        .grid, .status-row { grid-template-columns: 1fr; }
        .title { font-size: 24px; }
        .tracking-id { font-size: 20px; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <header class="hero">
        <div class="brand">GovTrack Complaint Receipt</div>
        <h1 class="title">Your complaint is officially registered.</h1>
        <p class="subtitle">
          Keep this receipt safe. You can use the Tracking ID below to check progress or share it with support staff when needed.
        </p>
      </header>

      <section class="content">
        <div class="tracking-box">
          <p class="tracking-label">Tracking ID</p>
          <p class="tracking-id">${trackingId}</p>
        </div>

        <div class="grid">
          <article class="card">
            <p class="card-label">Receipt Type</p>
            <p class="card-value">${duplicateLabel}</p>
          </article>
          <article class="card">
            <p class="card-label">Priority</p>
            <p class="card-value">${priorityLabel}</p>
          </article>
          <article class="card">
            <p class="card-label">Estimated Resolution</p>
            <p class="card-value">${resolutionMeta.eta}</p>
          </article>
          <article class="card">
            <p class="card-label">Generated On</p>
            <p class="card-value">${generatedOn}</p>
          </article>
        </div>

        <div class="status-row">
          <div class="status-pill">
            <strong>Submitted</strong>
            <span>Complaint logged</span>
          </div>
          <div class="status-pill">
            <strong>Tracking</strong>
            <span>Available anytime</span>
          </div>
          <div class="status-pill">
            <strong>Next Step</strong>
            <span>Monitor updates</span>
          </div>
        </div>
      </section>

      <footer class="footer">
        <p class="footer-note">
          This receipt is generated for the citizen complaint record. If you lose the Tracking ID, you may need to contact support or the local office to recover the status information.
        </p>
      </footer>
    </div>
  </body>
</html>`;

    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `govtrack-receipt-${trackingId}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(140deg,#e0f2fe_0%,#ede9fe_46%,#ffffff_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-16 top-8 h-52 w-52 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="absolute right-8 top-1/4 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="absolute bottom-12 left-1/3 h-48 w-48 rounded-full bg-fuchsia-200/20 blur-3xl" />

        <div className="absolute inset-0 opacity-35">
          {Array.from({ length: 14 }).map((_, idx) => (
            <span
              key={`confetti-${idx}`}
              className="success-confetti-dot absolute block h-1.5 w-1.5 rounded-full"
              style={{
                left: `${8 + idx * 6}%`,
                top: `${-6 - (idx % 3) * 4}%`,
                animationDelay: `${idx * 120}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <section className="animate-fadeIn relative z-10 mx-auto w-full max-w-2xl rounded-[20px] border border-white/55 bg-[rgba(255,255,255,0.75)] p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl sm:p-8">
        <div className="mb-7 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-300/70 via-teal-300/70 to-sky-300/60 blur-xl" />
            <div className="success-check-pulse relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 shadow-[0_14px_30px_-16px_rgba(5,150,105,0.75)] sm:h-28 sm:w-28">
              <span className="text-5xl font-black text-white sm:text-6xl">✓</span>
            </div>
          </div>
        </div>

        <h1 className="text-[30px] font-extrabold leading-tight text-slate-900">
          {isDuplicate
            ? pick(lang, "Issue Already Reported", "Issue Already Reported")
            : pick(lang, "Complaint Registered!", "Complaint Registered!")}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 sm:text-base">
          {isDuplicate
            ? pick(
                lang,
                "This issue has already been reported by another citizen. Your report has been added to the existing complaint.",
                "This issue has already been reported by another citizen. Your report has been added to the existing complaint."
              )
            : pick(
                lang,
                "Thank you. Your issue has been successfully submitted to the local authorities.",
                "Thank you. Your issue has been successfully submitted to the local authorities."
              )}
        </p>

        {isDuplicate && (
          <div className="mb-7 mt-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 text-left">
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber-700">
              {pick(lang, "Duplicate Report Linked", "Duplicate Report Linked")}
            </p>
            <p className="text-sm text-amber-900">
              {pick(
                lang,
                "Your report is now linked with the existing complaint and will strengthen priority for action.",
                "Your report is now linked with the existing complaint and will strengthen priority for action."
              )}
            </p>
            {supportCount > 0 && (
              <p className="mt-2 text-sm font-semibold text-amber-800">
                {pick(lang, "Total citizen reports", "Total citizen reports")}: {supportCount}
              </p>
            )}
          </div>
        )}

        <div className="group mb-7 rounded-2xl border border-blue-200 bg-[linear-gradient(145deg,#eff6ff_0%,#f0f9ff_100%)] p-5 text-left shadow-[0_14px_28px_-22px_rgba(30,64,175,0.45)] transition duration-300 hover:shadow-[0_18px_32px_-22px_rgba(30,64,175,0.6)] sm:p-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600 sm:text-sm">
              {pick(lang, "Your Tracking ID", "Your Tracking ID")}
            </p>
            <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              {pick(lang, "Most Important", "Most Important")}
            </span>
          </div>

          <p className="rounded-xl border border-blue-200 bg-white px-3 py-4 text-center font-mono text-2xl font-extrabold tracking-wide text-blue-900 sm:text-4xl">
            {trackingId || "-"}
          </p>

          <div className="relative mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <button
                type="button"
                onClick={copyTrackingId}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => !copied && setShowTooltip(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md sm:w-auto"
              >
                <span aria-hidden="true">📋</span>
                {copied
                  ? pick(lang, "Copied", "Copied")
                  : pick(lang, "Copy ID", "Copy ID")}
              </button>

              {showTooltip && (
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                  {copied
                    ? pick(lang, "Copied!", "Copied!")
                    : pick(lang, "Copy", "Copy")}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={downloadReceipt}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition duration-300 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-md sm:w-auto"
            >
              <span aria-hidden="true">⬇️</span>
              {pick(lang, "Download Receipt", "Download Receipt")}
            </button>
          </div>

        </div>

        <div
          className={`mb-7 animate-fadeIn rounded-2xl border p-5 text-left transition duration-300 ${resolutionMeta.tone}`}
          style={{ animationDelay: "120ms" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.15em] sm:text-sm">
              ⏱️ {pick(lang, "Estimated Resolution", "Estimated Resolution")}
            </p>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${resolutionMeta.badge}`}>
              {resolutionMeta.icon} {resolutionMeta.label}
            </span>
          </div>

          <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">{resolutionMeta.eta}</p>
          <p className="mt-2 text-sm font-medium">{resolutionMeta.note}</p>
        </div>

        <div className="mb-7 rounded-2xl border border-slate-200 bg-white/80 p-5 text-left shadow-sm">
          <h3 className="mb-5 text-lg font-bold text-slate-900">
            {pick(lang, "What Happens Next?", "What Happens Next?")}
          </h3>

          <ol className="space-y-4">
            {timeline.map((step, idx) => (
              <li
                key={step.id}
                className="relative animate-fadeIn pl-12"
                style={{ animationDelay: `${180 + idx * 80}ms` }}
              >
                <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-sm">
                  {step.icon}
                </span>
                {idx < timeline.length - 1 && (
                  <span
                    className="absolute left-4 top-8 h-8 w-px bg-gradient-to-b from-blue-300 to-indigo-200"
                    aria-hidden="true"
                  />
                )}
                <p className="text-sm font-bold text-slate-800">{step.title}</p>
                <p className="text-sm text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/track-issue?tracking_id=${trackingId}`}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-center text-sm font-bold text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.9)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_18px_34px_-16px_rgba(79,70,229,0.85)]"
          >
            {pick(lang, "Track Complaint", "Track Complaint")} →
          </Link>

          <Link
            href="/"
            className="flex-1 rounded-xl border-2 border-slate-300 bg-white px-6 py-3.5 text-center text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-100"
          >
            {pick(lang, "Go Home", "Go Home")}
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-left">
          <p className="text-sm font-semibold text-blue-800">
            <span aria-hidden="true">ℹ️</span>{" "}
            {pick(lang, "You can track your complaint anytime using your Tracking ID.", "You can track your complaint anytime using your Tracking ID.")}
          </p>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <Link
            href="/contact-us"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900 hover:underline"
          >
            <span aria-hidden="true">🛟</span>
            {pick(lang, "Need help? Contact support", "Need help? Contact support")}
          </Link>
        </div>
      </section>

      {showToast && (
        <div className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2 animate-fadeIn rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xl">
          {pick(lang, "Tracking ID copied", "Tracking ID copied")}
        </div>
      )}

      <style jsx>{`
        .success-check-pulse {
          animation: successPulse 2.3s ease-in-out infinite;
        }

        @keyframes successPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 14px 30px -16px rgba(5, 150, 105, 0.75);
          }
          50% {
            transform: scale(1.045);
            box-shadow:
              0 0 0 10px rgba(16, 185, 129, 0.14),
              0 16px 36px -14px rgba(5, 150, 105, 0.85);
          }
        }

        .success-confetti-dot {
          background: linear-gradient(180deg, #60a5fa 0%, #c4b5fd 100%);
          animation: confettiDrop 2.6s ease-out forwards;
          opacity: 0;
        }

        @keyframes confettiDrop {
          0% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.75;
          }
          100% {
            transform: translateY(95vh) rotate(240deg);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[linear-gradient(140deg,#e0f2fe_0%,#ede9fe_46%,#ffffff_100%)] px-4 py-8">
          <div className="mx-auto max-w-2xl animate-pulse rounded-[20px] border border-white/60 bg-white/70 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl">
            <div className="mx-auto h-20 w-20 rounded-full bg-slate-200" />
            <div className="mt-4 h-8 rounded-md bg-slate-200" />
            <div className="mt-3 h-4 rounded-md bg-slate-200" />
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
