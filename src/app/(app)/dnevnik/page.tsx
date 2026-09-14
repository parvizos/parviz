import { DayView } from "@/components/app/DayView";
import { todayISO } from "@/lib/dates";

export const metadata = { title: "Ежедневник" };
export const dynamic = "force-dynamic";

export default function DnevnikPage() {
  return <DayView date={todayISO()} />;
}
