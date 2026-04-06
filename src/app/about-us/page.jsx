import { HistoryBackLink } from "@/components/ui/history-back-link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { getServerLang } from "@/lib/language";
import { pick } from "@/lib/language-utils";

export default async function AboutUsPage() {
  const lang = await getServerLang();
  return (
    <main className="ui-bg min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <section className="ui-glass mx-auto w-full max-w-5xl rounded-3xl p-6 sm:p-9">
        <div className="flex items-center justify-between gap-3">
          <p className="ui-surface inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-widest text-violet-700 uppercase">
            {pick(lang, "Public Digital Service", "പൊതു ഡിജിറ്റൽ സേവനം")}
          </p>
          <LanguageSwitcher lang={lang} />
        </div>
        <div className="ui-rainbow-bar mt-4 mb-2 h-1 w-20 rounded-full" />
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="ui-gradient-text">{pick(lang, "About Smart Public Issue Reporting System", "സ്മാർട്ട് പൊതു പ്രശ്ന റിപ്പോർട്ടിങ് സിസ്റ്റത്തെക്കുറിച്ച്")}</span>
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          {pick(
            lang,
            "This platform helps citizens report local public issues and monitor progress transparently. It connects citizens and Panchayath officials through a clear, structured, and accountable issue-resolution process.",
            "ഈ പ്ലാറ്റ്ഫോം പൗരന്മാർക്ക് പ്രാദേശിക പൊതുപ്രശ്നങ്ങൾ റിപ്പോർട്ട് ചെയ്യാനും പുരോഗതി സുതാര്യമായി നിരീക്ഷിക്കാനും സഹായിക്കുന്നു. വ്യക്തവും ക്രമബദ്ധവും ഉത്തരവാദിത്തമുള്ള പ്രശ്നപരിഹാര പ്രക്രിയയിലൂടെ പൗരന്മാരെയും പഞ്ചായത്ത് ഉദ്യോഗസ്ഥരെയും ഇത് ബന്ധിപ്പിക്കുന്നു.",
          )}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="ui-card-hover rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
            <h2 className="text-sm font-bold text-slate-800">{pick(lang, "Transparency", "സുതാര്യത")}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {pick(lang, "Track issue status from submission to closure.", "സമർപ്പണത്തിൽ നിന്ന് പരിഹാരത്തോളം സ്റ്റാറ്റസ് ട്രാക്ക് ചെയ്യാം.")}
            </p>
          </article>
          <article className="ui-card-hover rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
            <h2 className="text-sm font-bold text-slate-800">{pick(lang, "Accessibility", "ലഭ്യത")}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {pick(lang, "Citizen-friendly service with simple forms and clear navigation.", "ലളിതമായ ഫോമുകളും വ്യക്തമായ നാവിഗേഷനും ഉള്ള പൗരസൗഹൃദ സേവനം.")}
            </p>
          </article>
          <article className="ui-card-hover rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
            <h2 className="text-sm font-bold text-slate-800">{pick(lang, "Accountability", "ഉത്തരവാദിത്തം")}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {pick(lang, "Department-based workflows improve official follow-up and closure.", "ഡിപ്പാർട്ട്മെന്റ് അധിഷ്ഠിത പ്രവാഹം ഔദ്യോഗിക ഫോളോ-അപ്പും പരിഹാരവും മെച്ചപ്പെടുത്തുന്നു.")}
            </p>
          </article>
        </div>

        <div className="ui-surface mt-8 rounded-2xl p-5">
          <h2 className="text-lg font-extrabold text-slate-900">{pick(lang, "How It Works", "ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="ui-card-hover rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4">
              <p className="text-xs font-bold tracking-widest text-violet-600 uppercase">
                {pick(lang, "Step 1", "ഘട്ടം 1")}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {pick(lang, "Citizen reports issue by category and location.", "പൗരൻ വിഭാഗവും സ്ഥലവും ചേർത്ത് പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുന്നു.")}
              </p>
            </div>
            <div className="ui-card-hover rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4">
              <p className="text-xs font-bold tracking-widest text-sky-600 uppercase">
                {pick(lang, "Step 2", "ഘട്ടം 2")}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {pick(lang, "Officials review, assign, and process resolution.", "ഉദ്യോഗസ്ഥർ പരിശോധിച്ച് ചുമതല നൽകി പരിഹാരനടപടി നടത്തുന്നു.")}
              </p>
            </div>
            <div className="ui-card-hover rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4">
              <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
                {pick(lang, "Step 3", "ഘട്ടം 3")}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {pick(lang, "Citizens track using Track ID and receive updates.", "പൗരന്മാർ ട്രാക്ക് ഐഡി ഉപയോഗിച്ച് നില നിരീക്ഷിച്ച് അപ്ഡേറ്റുകൾ ലഭിക്കുന്നു.")}
              </p>
            </div>
          </div>
        </div>

        <HistoryBackLink
          fallbackHref="/"
          className="ui-glass mt-8 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
        >
          {pick(lang, "Back to Home", "ഹോം പേജിലേക്കു മടങ്ങുക")}
        </HistoryBackLink>
      </section>
    </main>
  );
}
