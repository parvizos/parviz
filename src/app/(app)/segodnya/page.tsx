import Link from "next/link";
import { Sun } from "lucide-react";
import { getTodayTasks, getTodayLessons } from "@/lib/queries";
import { todayISO, ruFull } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import { TaskGroup } from "@/components/app/TaskGroup";
import { QuickAdd } from "@/components/app/QuickAdd";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Сегодня" };

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function TodayPage() {
  const today = todayISO();
  const [{ overdue, today: todayTasks }, lessons] = await Promise.all([
    getTodayTasks(),
    getTodayLessons(),
  ]);
  const empty = overdue.length === 0 && todayTasks.length === 0;

  return (
    <div>
      <PageHeader title="Сегодня" subtitle={cap(ruFull(today))} />

      {lessons.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
            Пары сегодня
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {lessons.map((l) => (
              <Link
                key={l.id}
                href={`/predmety/${l.subjectId}`}
                className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 transition-colors hover:border-border-strong hover:bg-surface-2"
              >
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ background: areaColor(l.subjectColor) }}
                />
                <div>
                  <div className="text-[13px] font-semibold tabular text-text">
                    {l.startTime || "—"}
                    {l.endTime ? `–${l.endTime}` : ""}
                  </div>
                  <div className="max-w-[180px] truncate text-[12.5px] text-muted">
                    {l.subjectName}
                    {l.location ? ` · ${l.location}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-7">
        <QuickAdd
          prefill={{ scheduledDate: today }}
          placeholder="Что нужно сделать сегодня?"
        />
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
