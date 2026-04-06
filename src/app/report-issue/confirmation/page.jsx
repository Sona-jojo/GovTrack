import Link from "next/link";
import { HistoryBackLink } from "@/components/ui/history-back-link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { getServerLang } from "@/lib/language";
import { pick } from "@/lib/language-utils";

export default async function ReportIssueConfirmationPage({ searchParams }) {
  const lang = await getServerLang();
  const query = await searchParams;
  const trackId = query.trackId ?? "N/A";

  return (
    <main className="ui-bg min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <section className="ui-glass mx-auto w-full max-w-2xl rounded-3xl p-7 text-center sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <p className="ui-surface inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-emerald-900 uppercase">
            {pick(lang, "Step 3 of 3", "3 ലെ ഘട്ടം 3")}
          </p>
          <LanguageSwitcher lang={lang} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
          {pick(lang, "Thank You for Reporting", "റിപ്പോർട്ട് ചെയ്തതിന് നന്ദി")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          {pick(
            lang,
            "Thank you for reporting! Your complaint has been submitted successfully.",
            "റിപ്പോർട്ട് ചെയ്തതിന് നന്ദി! നിങ്ങളുടെ പരാതി വിജയകരമായി സമർപ്പിച്ചിട്ടുണ്ട്.",
          )}
          <br />
          {pick(lang, "You can use this ID to track the status of your issue.", "നിങ്ങളുടെ പ്രശ്നത്തിന്റെ നില ട്രാക്ക് ചെയ്യാൻ ഈ ഐഡി ഉപയോഗിക്കാം.")}
        </p>

        <div className="ui-surface mt-6 rounded-2xl p-4">
          <p className="text-xs font-semibold tracking-wide text-blue-700 uppercase">
            {pick(lang, "Your Track ID", "നിങ്ങളുടെ ട്രാക്ക് ഐഡി")}
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-900">{trackId}</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/track-issue"
            className="ui-button-primary inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition"
          >
            {pick(lang, "Track Issue", "പ്രശ്നം ട്രാക്ക് ചെയ്യുക")}
          </Link>
          <HistoryBackLink
            fallbackHref="/"
            className="ui-glass inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {pick(lang, "Back to Home", "ഹോം പേജിലേക്കു മടങ്ങുക")}
          </HistoryBackLink>
        </div>
      </section>
    </main>
  );
}
