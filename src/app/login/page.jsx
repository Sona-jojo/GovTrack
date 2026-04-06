import { getServerLang } from "@/lib/language";
import { pick } from "@/lib/language-utils";
import { OfficialLoginForm } from "@/components/auth/OfficialLoginForm";
import { HistoryBackLink } from "@/components/ui/history-back-link";
import Image from "next/image";

export default async function LoginPage() {
  const lang = await getServerLang();

  return (
    <main className="ui-login-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="ui-noise-overlay pointer-events-none absolute inset-0" />
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ui-blob absolute -left-16 top-[15%] h-80 w-80 bg-blue-500/25 blur-3xl" />
        <div className="ui-blob absolute right-[-60px] top-[28%] h-72 w-72 bg-violet-500/25 blur-3xl" style={{ animationDelay: "1.7s" }} />
        <div className="ui-blob absolute left-[42%] bottom-[-120px] h-96 w-96 bg-cyan-200/35 blur-3xl" style={{ animationDelay: "3.2s" }} />
        <div className="ui-rainbow-bar absolute top-0 left-0 right-0 h-1" />
      </div>

      <div className="animate-rise-in relative z-10 w-full max-w-xl">
        <div className="mb-5 text-center sm:mb-6">
          <div className="ui-float mx-auto mb-3 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-white/95 to-indigo-100/80 p-3.5 shadow-[0_16px_40px_-24px_rgba(30,64,175,0.65)] ring-1 ring-white/70">
            <Image
              src="/coconut-tree.svg"
              alt=""
              width={48}
              height={48}
            />
          </div>
          <h1 className="mt-2 flex items-center justify-center gap-2 text-3xl font-extrabold sm:text-4xl">
            <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-base text-white shadow-lg">🔒</span>
            <span className="ui-gradient-text">{pick(lang, "Government Staff Login", "സർക്കാർ ജീവനക്കാർ ലോഗിൻ")}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {pick(
              lang,
              "Secure access for officials and administrators",
              "ഉദ്യോഗസ്ഥർക്കും അഡ്മിനിസ്ട്രേറ്റർമാർക്കുമുള്ള സുരക്ഷിത പ്രവേശനം",
            )}
          </p>
          <p
            className="mt-1 text-xs font-medium tracking-wide text-slate-500"
            title={pick(lang, "This portal is monitored and restricted to authorized personnel.", "ഈ പോർട്ടൽ അധികൃതർക്കായി മാത്രം സുരക്ഷിതമായി പരിമിതപ്പെടുത്തിയിരിക്കുന്നു.")}
          >
            {pick(lang, "Authorized personnel only", "അധികൃത വ്യക്തികൾക്ക് മാത്രം")}
          </p>
        </div>

        <div className="ui-glass relative rounded-[20px] p-6 pt-11 sm:p-8 sm:pt-12">
          <div className="absolute left-4 top-3 sm:left-5 sm:top-4">
            <HistoryBackLink
              fallbackHref="/"
              preferHistory={false}
              className="group inline-flex items-center gap-1.5 rounded-lg border border-white/70 bg-white/50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur transition duration-300 hover:-translate-x-0.5 hover:border-blue-200 hover:bg-white/80 hover:text-blue-700"
            >
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-0.5">←</span>
              <span>{pick(lang, "Back", "തിരികെ")}</span>
            </HistoryBackLink>
          </div>
          <OfficialLoginForm />
        </div>
      </div>
    </main>
  );
}
