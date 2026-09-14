import { notFound } from "next/navigation";
import { DayView } from "@/components/app/DayView";
import { isValidISO } from "@/lib/dates";

export const metadata = { title: "Ежедневник" };
export const dynamic = "force-dynamic";

export default async function DnevnikDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidISO(date)) notFound();
  return <DayView date={date} />;
}
