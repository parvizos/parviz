import Link from "next/link";
import { Sun, Wallet, CalendarClock } from "lucide-react";
import { getTodayTasks, getTodayLessons, getAccountOptions } from "@/lib/queries";
import { getDuePlanned, getDueDebts } from "@/lib/finance-queries";
import { getUpcomingExams, getAttendanceForDate } from "@/lib/study-queries";
import { todayISO, ruFull } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import { TaskGroup } from "@/components/app/TaskGroup";
import { QuickAdd } from "@/components/app/QuickAdd";
import { PlannedRow, DebtCard } from "@/components/app/finance2-items";
import { ExamCard, AttendanceControls } from "@/components/app/study2-items";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Сегодня" };
export const dynamic = "force-dynamic";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function TodayPage() {
  const today = todayISO();
  const [
    { overdue, today: todayTasks },
    lessons,
    duePlans,
    dueDebts,
    accountOptions,
    upcomingExams,
    attToday,
  ] = await Promise.all([
    getTodayTasks(),
    getTodayLessons(),
    getDuePlanned(),
    getDueDebts(),
    getAccountOptions(),
    getUpcomingExams(10),
    getAttendanceForDate(todayISO()),
  ]);
  const hasMoney = duePlans.length > 0 || dueDebts.length > 0;
  const empty =
    overdue.length === 0 &&
    todayTasks.length === 0 &&
    !hasMoney &&
    upcomingExams.length === 0;

  return (
    <div>
      <PageHeader title="Сегодня" subtitle={cap(ruFull(today))} />

      {lessons.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
            Пары сегодня
          </div>
          <div className="flex flex-col gap-2">
            {lessons.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2"
              >
                <span
                  className="h-9 w-1 shrink-0 rounded-full"
                  style={{ background: areaColor(l.subjectColor) }}
                />
                <Link
                  href={`/predmety/${l.subjectId}`}
                  className="flex min-w-0 flex-1 items-baseline gap-2.5 transition-opacity hover:opacity-80"
                >
                  <span className="shrink-0 text-[13px] font-semibold tabular text-text">
                    {l.startTime || "—"}
                    {l.endTime ? `–${l.endTime}` : ""}
                  </span>
                  <span className="truncate text-[12.5px] text-muted">
                    {l.subjectName}
                    {l.location ? ` · ${l.location}` : ""}
                  </span>
                </Link>
                <AttendanceControls
                  subjectId={l.subjectId}
                  lessonId={l.id}
                  date={today}
                  current={attToday.get(l.id) ?? null}
                />
              </div>
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

      {upcomingExams.length > 0 && (
        <section className="mt-7">
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <CalendarClock size={15} className="text-muted" />
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
              Скоро экзамены
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upcomingExams.map((e) => (
              <ExamCard key={e.id} exam={e} />
            ))}
          </div>
        </section>
      )}

      {hasMoney && (
        <section className="mt-7">
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <Wallet size={15} className="text-muted" />
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
              Деньги
            </h2>
          </div>

          {duePlans.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {duePlans.map((p) => (
                <PlannedRow key={p.id} plan={p} />
              ))}
            </div>
          )}

          {dueDebts.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {dueDebts.map((d) => (
                <DebtCard key={d.id} debt={d} accountOptions={accountOptions} />
              ))}
            </div>
          )}
        </section>
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
