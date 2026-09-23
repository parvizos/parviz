import { getTerms } from "@/lib/term-queries";
import { TermsView } from "@/components/app/term-items";

export const metadata = { title: "Семестры" };
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const terms = await getTerms();
  return <TermsView terms={terms} />;
}
