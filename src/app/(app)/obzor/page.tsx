import { getDashboard } from "@/lib/dashboard-queries";
import { appTimeZone, todayISO, ruFull } from "@/lib/dates";
import { Dashboard } from "@/components/app/dashboard";

export const metadata = { title: "Обзор" };
export const dynamic = "force-dynamic";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function DashboardPage() {
  const data = await getDashboard();
  const tz = appTimeZone();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  const greeting =
    hour < 5
      ? "Доброй ночи"
      : hour < 12
        ? "Доброе утро"
        : hour < 18
          ? "Добрый день"
          : "Добрый вечер";
  const dateLabel = cap(ruFull(todayISO()));

  return (
    <Dashboard
      data={data}
      greeting={greeting}
      dateLabel={dateLabel}
      timeZone={tz}
    />
  );
}
