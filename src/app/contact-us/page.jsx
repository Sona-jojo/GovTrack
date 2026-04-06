import Link from "next/link";
import { HistoryBackLink } from "@/components/ui/history-back-link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { getServerLang } from "@/lib/language";
import { pick } from "@/lib/language-utils";

export default async function ContactUsPage() {
  const lang = await getServerLang();
  return (
    <main className="ui-bg min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <section className="ui-glass mx-auto w-full max-w-5xl rounded-3xl p-6 sm:p-9">
        <div className="flex items-center justify-between gap-3">
          <p className="ui-surface inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-emerald-900 uppercase">
            {pick(lang, "Citizen Help Desk", "പൗര സഹായ ഡെസ്ക്")}
          </p>
          <LanguageSwitcher lang={lang} />
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {pick(lang, "Contact Us", "ബന്ധപ്പെടുക")}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          {pick(
            lang,
            "For help with issue reporting, tracking, or platform usage, contact the Panchayath support desk during office hours.",
            "പ്രശ്ന റിപ്പോർട്ടിംഗ്, ട്രാക്കിംഗ്, അല്ലെങ്കിൽ പ്ലാറ്റ്ഫോം ഉപയോഗത്തിൽ സഹായം വേണമെങ്കിൽ ഓഫീസ് സമയത്ത് പഞ്ചായത്ത് സഹായ ഡെസ്കിനെ ബന്ധപ്പെടുക.",
          )}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="ui-surface rounded-2xl p-5">
            <h2 className="text-base font-semibold text-slate-900">
              {pick(lang, "Citizen Support Desk", "പൗര സഹായ ഡെസ്ക്")}
            </h2>
            <p className="mt-3 text-sm text-slate-700">
              {pick(lang, "Panchayath Service Center", "പഞ്ചായത്ത് സേവന കേന്ദ്രം")}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Email: support@panchayath.gov
            </p>
            <p className="mt-1 text-sm text-slate-700">Phone: +91 00000 00000</p>
          </article>

          <article className="ui-surface rounded-2xl p-5">
            <h2 className="text-base font-semibold text-slate-900">{pick(lang, "Office Hours", "ഓഫീസ് സമയം")}</h2>
            <p className="mt-3 text-sm text-slate-700">
              {pick(lang, "Monday to Friday: 10:00 AM to 5:00 PM", "തിങ്കൾ മുതൽ വെള്ളി വരെ: രാവിലെ 10:00 മുതൽ വൈകിട്ട് 5:00 വരെ")}
            </p>
            <p className="mt-1 text-sm text-slate-700">{pick(lang, "Saturday: 10:00 AM to 1:00 PM", "ശനി: രാവിലെ 10:00 മുതൽ ഉച്ചയ്ക്ക് 1:00 വരെ")}</p>
            <p className="mt-1 text-sm text-slate-700">{pick(lang, "Sunday: Closed", "ഞായർ: അവധി")}</p>
          </article>
        </div>

        <div className="ui-surface mt-6 rounded-xl px-4 py-3 text-sm text-amber-800">
          {pick(
            lang,
            "For emergencies related to public safety, contact local emergency authorities directly.",
            "പൊതുസുരക്ഷയുമായി ബന്ധപ്പെട്ട അടിയന്തര സാഹചര്യങ്ങളിൽ, പ്രാദേശിക അടിയന്തര സേവന അധികാരികളെ നേരിട്ട് ബന്ധപ്പെടുക.",
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <HistoryBackLink
            fallbackHref="/"
            className="ui-glass inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
          >
            {pick(lang, "Back to Home", "ഹോം പേജിലേക്കു മടങ്ങുക")}
          </HistoryBackLink>
          <Link
            href="/report-issue"
            className="ui-button-primary inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          >
            {pick(lang, "Report an Issue", "പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക")}
          </Link>
        </div>
      </section>
    </main>
  );
}
