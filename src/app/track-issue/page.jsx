import { getServerLang } from "@/lib/language";
import { TrackingView } from "@/components/citizen/tracking-view";

export default async function TrackIssuePage() {
  const lang = await getServerLang();
  return <TrackingView lang={lang} />;
}
