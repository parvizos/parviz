import { Sun } from "lucide-react";
import { getTodayTasks } from "@/lib/queries";
import { todayISO, ruFull } from "@/lib/dates";
import { TaskGroup } from "@/components/app/TaskGroup";
import { QuickAdd } from "@/components/app/QuickAdd";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Сегодня" };

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function TodayPage() {
  const today = todayISO();
  const { overdue, today: todayTasks } = await getTodayTasks();
  const empty = overdue.length === 0 && todayTasks.length === 0;

  return (
    <div>
      <PageHeader title="Сегодня" subtitle={cap(ruFull(today))} />

      <div className="mb-7">
        <QuickAdd prefill={{ scheduledDate: today }} placeholder="Что нужно сделать сегодня?" />
      </div>

      {overdue.length > 0 && (
        <TaskGroup
          title="Просрочено"
          count={overdue.length}
          tasks={overdue}
          today={today}
          tone="danger"
        />
      )}

      {todayTasks.length > 0 && (
        <TaskGroup
          title="На сегодня"
          count={todayTasks.length}
          tasks={todayTasks}
          today={today}
          showDate={false}
        />
      )}

      {empty && (
        <EmptyState
          icon={<Sun size={22} />}
          title="На сегодня всё чисто"
          description="Нет ни просроченных, ни запланированных на сегодня задач. Добавь новую или спокойно выдохни."
        />
      )}
    </div>
  );
}
