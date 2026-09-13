import { CalendarClock } from "lucide-react";
import { getUpcomingTasks } from "@/lib/queries";
import { todayISO, relativeLabel } from "@/lib/dates";
import { TaskGroup } from "@/components/app/TaskGroup";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Предстоящее" };

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function UpcomingPage() {
  const today = todayISO();
  const groups = await getUpcomingTasks();

  return (
    <div>
      <PageHeader
        title="Предстоящее"
        subtitle="Запланированные задачи по дням — что ждёт впереди."
      />

      {groups.length > 0 ? (
        groups.map((g) => (
          <TaskGroup
            key={g.date}
            title={cap(relativeLabel(g.date, today))}
            count={g.tasks.length}
            tasks={g.tasks}
            today={today}
            showDate={false}
          />
        ))
      ) : (
        <EmptyState
          icon={<CalendarClock size={22} />}
          title="Ничего не запланировано"
          description="Поставь задачам даты — и они появятся здесь, аккуратно разложенные по дням."
        />
      )}
    </div>
  );
}
