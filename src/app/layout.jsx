import "./globals.css";
import { Space_Grotesk } from "next/font/google";
import { getServerLang } from "@/lib/language";
import { AuthProvider } from "@/components/auth/auth-provider";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata = {
  title: "GovTrack – Smart Civic Issue Reporting",
  description:
    "Report and track public issues in your Panchayath. A transparent, digital civic governance platform.",
};

export default async function RootLayout({ children }) {
  const lang = await getServerLang();

  return (
    <html lang={lang} className={spaceGrotesk.variable}>
      <body className="min-h-screen font-[family-name:var(--font-space-grotesk)] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
