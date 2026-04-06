import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang } from "@/lib/language-utils";

export async function getServerLang() {
  const cookieStore = await cookies();
  const value = cookieStore.get(LANG_COOKIE)?.value;
  return normalizeLang(value);
}
