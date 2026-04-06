import { getServerLang } from "@/lib/language";
import { MultiStepForm } from "@/components/citizen/multi-step-form";

export default async function DepartmentPage({ params }) {
  const lang = await getServerLang();
  const resolvedParams = await params;
  const department = decodeURIComponent(resolvedParams?.department || "");

  return <MultiStepForm lang={lang} initialCategory={department} />;
}

      
