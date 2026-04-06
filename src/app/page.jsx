import Image from "next/image";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { getServerLang } from "@/lib/language";
import { pick } from "@/lib/language-utils";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

function formatMetric(value) {
  if (value === null || value === undefined) return "--";
  return Number(value).toLocaleString("en-IN");
}

async function getLandingStats() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!url || !key) return null;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });

  const activeStatuses = [
    "submitted",
    "under_review",
    "assigned",
    "inspection_scheduled",
    "in_progress",
    "overdue",
    "partially_resolved",
    "on_hold",
  ];

  const [totalQ, resolvedQ, activeQ, urgentQ] = await Promise.all([
    supabase.from("complaints").select("id", { count: "exact", head: true }),
    supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .in("status", ["resolved", "closed"]),
    supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .in("status", activeStatuses),
    supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("priority", "urgent"),
  ]);

  if (totalQ.error || resolvedQ.error || activeQ.error || urgentQ.error) {
    return null;
  }

  return {
    total: totalQ.count ?? 0,
    resolved: resolvedQ.count ?? 0,
    active: activeQ.count ?? 0,
    urgent: urgentQ.count ?? 0,
  };
}

async function getImportantNoticeCount() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return 0;

  try {
    const supabase = createServerClient(url, serviceKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    });

    const { count, error } = await supabase
      .from("public_notices")
      .select("id", { count: "exact", head: true })
      .eq("priority", "urgent")
      .eq("is_active", true);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export default async function HomePage() {
  const lang = await getServerLang();
  const [stats, importantNoticeCount] = await Promise.all([
    getLandingStats(),
    getImportantNoticeCount(),
  ]);

  const total = stats?.total ?? null;
  const resolved = stats?.resolved ?? null;
  const active = stats?.active ?? null;
  const urgent = stats?.urgent ?? null;


  const steps = [
    {
      id: "01",
      icon: "🧭",
      title: pick(lang, "Choose Category", "Choose Category"),
      desc: pick(
        lang,
        "Open Report Issue and select the exact issue type with clear details.",
        "Open Report Issue and select the exact issue type with clear details."
      ),
    },
    {
      id: "02",
      icon: "📸",
      title: pick(lang, "Add Location & Photos", "Add Location & Photos"),
      desc: pick(
        lang,
        "Detect location, verify address, and attach photos for faster verification.",
        "Detect location, verify address, and attach photos for faster verification."
      ),
    },
    {
      id: "03",
      icon: "📝",
      title: pick(lang, "Submit & Save Track ID", "Submit & Save Track ID"),
      desc: pick(
        lang,
        "Submit the complaint and keep your tracking ID to monitor progress.",
        "Submit the complaint and keep your tracking ID to monitor progress."
      ),
    },
    {
      id: "04",
      icon: "📡",
      title: pick(lang, "Track Status Updates", "Track Status Updates"),
      desc: pick(
        lang,
        "Use Track Issue anytime to see review, assignment, and resolution status.",
        "Use Track Issue anytime to see review, assignment, and resolution status."
      ),
    },
  ];

  const visualJourney = [
    {
      id: "1",
      title: pick(lang, "Spot", "Spot"),
      icon: "🕳️",
      subtitle: pick(lang, "Notice the civic issue", "Notice the civic issue"),
      ring: "from-cyan-400 to-blue-500",
      bg: "from-cyan-50 to-blue-100",
    },
    {
      id: "2",
      title: pick(lang, "Snap", "Snap"),
      icon: "📸",
      subtitle: pick(lang, "Capture and add location", "Capture and add location"),
      ring: "from-blue-500 to-indigo-500",
      bg: "from-blue-50 to-indigo-100",
    },
    {
      id: "3",
      title: pick(lang, "Solve", "Solve"),
      icon: "✅",
      subtitle: pick(lang, "Track updates till closure", "Track updates till closure"),
      ring: "from-teal-400 to-cyan-500",
      bg: "from-teal-50 to-cyan-100",
    },
  ];

  return (
    <>
      <main className="ui-bg relative min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/landing-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/94 via-white/90 to-white/94" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-10 h-96 w-96 ui-blob bg-blue-200/25 blur-3xl" />
          <div className="absolute -right-24 top-40 h-80 w-80 ui-blob bg-indigo-200/20 blur-3xl" style={{ animationDelay: "2s" }} />
          <div className="absolute bottom-32 left-1/4 h-72 w-72 ui-blob bg-sky-200/16 blur-3xl" style={{ animationDelay: "4s" }} />
          <div className="absolute bottom-10 right-1/4 h-64 w-64 ui-blob bg-violet-200/14 blur-3xl" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6">
          <header className="py-4 sm:py-5">
            <div className="flex w-full flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex flex-1 items-center gap-3">
              <Image src="/coconut-tree.svg" alt="" width={36} height={36} />
              <div className="min-w-0">
                <p className="truncate text-xl font-extrabold tracking-tight text-gray-800 sm:text-2xl">
                  {pick(lang, "GovTrack", "GovTrack")}
                </p>
                <p className="max-w-[34ch] text-[11px] font-medium leading-snug text-gray-600 sm:text-xs">
                  {pick(lang, "Smart Civic Issue Reporting & Tracking Platform", "Smart Civic Issue Reporting & Tracking Platform")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/notices"
                prefetch={true}
                className="relative inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md transition duration-300 hover:scale-[1.03] hover:shadow-lg sm:px-4 sm:text-xs"
              >
                <span>🔔</span>
                {pick(lang, "View Notices", "അറിയിപ്പുകൾ കാണുക")}
                {importantNoticeCount > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {importantNoticeCount > 9 ? "9+" : importantNoticeCount}
                  </span>
                )}
              </Link>
              <LanguageSwitcher lang={lang} />
              <Link
                href="/login"
                prefetch={true}
                className="whitespace-nowrap rounded-lg border border-slate-300 bg-white/70 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 backdrop-blur transition hover:bg-white hover:shadow-sm sm:px-3 sm:text-xs"
              >
                {pick(lang, "Official Login", "ഓദ്യോഗിക ലോഗിൻ")}
              </Link>
            </div>
          </div>
          </header>

          <section className="w-full pb-16 pt-12 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="ui-float mx-auto mb-6 w-fit">
              <Image src="/coconut-tree.svg" alt="" width={80} height={80} priority />
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 sm:text-5xl">
              {pick(
                lang,
                "Report Local Civic Problems and Track Resolution Online",
                "Report Local Civic Problems and Track Resolution Online"
              )}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-gray-700 sm:text-lg">
              {pick(
                lang,
                "For citizens: report issues like roads, drainage, lights, and sanitation, then track updates using your Track ID.",
                "സിറ്റിസൺസിനായി: റോഡ്, ഡ്രെയിനേജ്, ലൈറ്റ്, ശുചിത്വം തുടങ്ങിയ പ്രശ്നങ്ങൾ റിപ്പോർട്ട് ചെയ്യുക, തുടർന്ന് Track ID ഉപയോഗിച്ച് സ്റ്റാറ്റസ് പരിശോധിക്കുക."
              )}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/report-issue"
                prefetch={true}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-9 py-4 text-base font-bold text-white shadow-lg transition hover:scale-105 hover:shadow-xl active:scale-95"
              >
                <span className="text-lg">📢</span>
                {pick(lang, "Report an Issue", "പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക")}
              </Link>

              <Link
                href="/track-issue"
                prefetch={true}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-9 py-4 text-base font-bold text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
              >
                <span className="text-lg">🔍</span>
                {pick(lang, "Track My Complaint", "പ്രശ്നം ട്രാക്ക് ചെയ്യുക")}
              </Link>
            </div>
          </div>

          <section className="mt-14 ui-glass mx-auto w-full rounded-3xl p-7 sm:p-9">
            <div className="ui-rainbow-bar mb-5 h-1 w-16 rounded-full" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                  {pick(lang, "Live Service Snapshot", "Live Service Snapshot")}
                </p>
                <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">
                  <span className="ui-gradient-text">{pick(lang, "Issue Analytics", "Issue Analytics")}</span>
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {pick(lang, "Auto-updated from complaint records", "Auto-updated from complaint records")}
              </p>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: pick(lang, "Total Reported", "Total Reported"),
                  value: formatMetric(total),
                  tone: "from-blue-500 to-blue-700",
                  bg: "from-blue-50 to-blue-100",
                  border: "border-blue-200",
                  icon: "📊",
                  badge: "bg-blue-100 text-blue-700 border-blue-200",
                },
                {
                  label: pick(lang, "Resolved/Closed", "Resolved/Closed"),
                  value: formatMetric(resolved),
                  tone: "from-emerald-500 to-emerald-700",
                  bg: "from-emerald-50 to-emerald-100",
                  border: "border-emerald-200",
                  icon: "✅",
                  badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
                },
                {
                  label: pick(lang, "Active Cases", "Active Cases"),
                  value: formatMetric(active),
                  tone: "from-orange-500 to-orange-700",
                  bg: "from-orange-50 to-orange-100",
                  border: "border-amber-200",
                  icon: "🛠️",
                  badge: "bg-orange-100 text-orange-700 border-orange-200",
                },
                {
                  label: pick(lang, "Urgent Cases", "Urgent Cases"),
                  value: formatMetric(urgent),
                  tone: "from-red-500 to-red-700",
                  bg: "from-red-50 to-red-100",
                  border: "border-rose-200",
                  icon: "🚨",
                  badge: "bg-red-100 text-red-700 border-red-200",
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className={`group relative overflow-hidden rounded-2xl border ${item.border} bg-gradient-to-br ${item.bg} p-5 shadow-sm transition hover:scale-105 hover:shadow-xl`}
                >
                  <div className={`absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r ${item.tone}`} />
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-2 text-base ${item.badge} shadow-sm`}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <p
                    className={`mt-1 bg-gradient-to-r ${item.tone} bg-clip-text text-4xl font-extrabold text-transparent`}
                  >
                    {item.value}
                  </p>
                </article>
              ))}
            </div>

          </section>

          <section className="mt-10 ui-glass mx-auto w-full rounded-3xl p-7 sm:p-9">
            <div className="ui-rainbow-bar mb-5 h-1 w-16 rounded-full" />
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                {pick(lang, "First Time Here?", "First Time Here?")}
              </p>
              <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">
                <span className="ui-gradient-text">{pick(lang, "How To Report An Issue", "How To Report An Issue")}</span>
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {steps.map((step, idx) => {
                const stepColors = [
                  { bg: "from-blue-500 to-indigo-500",   light: "from-blue-50 to-indigo-50",   border: "border-blue-200",  num: "bg-blue-100 text-blue-700 border-blue-300" },
                  { bg: "from-indigo-500 to-violet-500", light: "from-indigo-50 to-violet-50", border: "border-indigo-200", num: "bg-indigo-100 text-indigo-700 border-indigo-300" },
                  { bg: "from-violet-500 to-purple-500", light: "from-violet-50 to-purple-50", border: "border-violet-200", num: "bg-violet-100 text-violet-700 border-violet-300" },
                  { bg: "from-sky-500 to-blue-500",      light: "from-sky-50 to-blue-50",      border: "border-sky-200",    num: "bg-sky-100 text-sky-700 border-sky-300" },
                ];
                const c = stepColors[idx % stepColors.length];
                return (
                  <article
                    key={step.id}
                    className={`group relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.light} p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-lg`}
                  >
                    <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${c.bg}`} />
                    <div className="ml-2 flex items-center gap-3">
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-extrabold ${c.num} shadow-sm`} aria-label={`Step ${step.id}`}>
                        {step.id}
                      </span>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-lg shadow-sm">
                        {step.icon}
                      </span>
                      <h3 className="text-base font-bold text-slate-800">{step.title}</h3>
                    </div>
                    <p className="ml-2 mt-3 text-sm leading-6 text-slate-600">{step.desc}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="ui-journey-wrap relative mx-auto mt-12 w-full overflow-hidden rounded-[2rem] border border-white/50 p-7 shadow-xl sm:p-9">
            <div className="ui-rainbow-bar mb-5 h-1 w-16 rounded-full" />
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
                {pick(lang, "Fast Complaint Flow", "Fast Complaint Flow")}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-800 sm:text-3xl">
                {pick(lang, "Spot. Snap. Solve.", "Spot. Snap. Solve.")}
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                {pick(
                  lang,
                  "Report in minutes and stay informed as your issue moves to resolution.",
                  "Report in minutes and stay informed as your issue moves to resolution."
                )}
              </p>
            </div>

            <div className="relative mt-8">
              <div className="pointer-events-none absolute left-[14%] right-[14%] top-20 hidden md:block" aria-hidden="true">
                <div className="ui-journey-path h-px w-full" />
              </div>

              <div className="grid gap-8 md:grid-cols-3">
                {visualJourney.map((step) => (
                  <article key={step.id} className="relative text-center">
                    <div className={`mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br ${step.bg} p-3 shadow-[0_18px_42px_-24px_rgba(14,116,144,0.45)]`}>
                      <div className={`ui-journey-ring flex h-full w-full items-center justify-center rounded-full border-[9px] bg-white text-5xl shadow-inner bg-gradient-to-br ${step.ring}`}>
                        <span className="rounded-full bg-white/92 px-5 py-4 shadow-sm">{step.icon}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-5xl font-extrabold leading-none text-slate-800">{step.id}</p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight text-sky-600">{step.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{step.subtitle}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-9 flex justify-center">
              <Link
                href="/report-issue"
                prefetch={true}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-3 text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {pick(lang, "Get Started", "Get Started")} ↗
              </Link>
            </div>
          </section>
          </section>

          <footer className="mx-auto max-w-lg px-1 pb-10 text-center">
          <div className="mb-3 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
          <div className="flex items-center justify-center gap-5 text-sm">
            <Link href="/about-us" className="font-medium text-blue-700 transition hover:text-blue-900 hover:underline">
              {pick(lang, "About Us", "ഞങ്ങളെ കുറിച്ച്")}
            </Link>
            <span className="text-blue-300">·</span>
            <Link href="/contact-us" prefetch={true} className="font-medium text-blue-700 transition hover:text-blue-900 hover:underline">
              {pick(lang, "Contact Us", "ബന്ധപ്പെടുക")}
            </Link>
          </div>
          <p className="mt-3 text-xs font-medium text-slate-400">© {new Date().getFullYear()} GovTrack</p>
          </footer>
        </div>
      </main>
    </>
  );
}
