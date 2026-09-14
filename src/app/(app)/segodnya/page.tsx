import Link from "next/link";
import { Sun, Wallet } from "lucide-react";
import { getTodayTasks, getTodayLessons, getAccountOptions } from "@/lib/queries";
import { getDuePlanned, getDueDebts } from "@/lib/finance-queries";
import { todayISO, ruFull } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import { TaskGroup } from "@/components/app/TaskGroup";
import { QuickAdd } from "@/components/app/QuickAdd";
import { PlannedRow, DebtCard } from "@/components/app/finance2-items";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Сегодня" };
export const dynamic = "force-dynamic";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function TodayPage() {
  const today = todayISO();
  const [{ overdue, today: todayTasks }, lessons, duePlans, dueDebts, accountOptions] =
    await Promise.all([
      getTodayTasks(),
      getTodayLessons(),
      getDuePlanned(),
      getDueDebts(),
      getAccountOptions(),
    ]);
  const hasMoney = duePlans.length > 0 || dueDebts.length > 0;
  const empty =
    overdue.length === 0 && todayTasks.length === 0 && !hasMoney;

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
