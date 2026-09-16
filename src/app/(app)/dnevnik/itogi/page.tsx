import Link from "next/link";
import { ArrowLeft, NotebookText, Smile, CheckCircle2 } from "lucide-react";
import {
  getJournalBetween,
  getClosedTaskCountBetween,
} from "@/lib/queries";
import { summarizeJournal } from "@/lib/journal-summary";
import { MOODS, moodOf } from "@/lib/journal-format";
import { todayISO, addDaysISO, ruWeekday, ruMonthDayShort } from "@/lib/dates";
import { excerpt } from "@/lib/text";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/misc";
import type { ReactNode } from "react";

export const metadata = { title: "Итоги дневника" };
export const dynamic = "force-dynamic";

function plDays(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "день";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "дня";
  return "дней";
}

function StatCard({
  icon,
  value,
  label,
  sub,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-text">
        {icon}
      </div>
      <div className="text-[24px] font-semibold leading-none tracking-tight text-text">
        {value}
      </div>
      <div className="mt-1.5 text-[13px] text-muted">{label}</div>
      {sub && <div className="mt-0.5 text-[12px] text-faint">{sub}</div>}
    </div>
  );
}

export default async function JournalSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.p === "month" ? "month" : "week";
  const n = period === "month" ? 30 : 7;
  const to = todayISO();
  const from = addDaysISO(to, -(n - 1));

  const [entries, tasksClosed] = await Promise.all([
    getJournalBetween(from, to),
    getClosedTaskCountBetween(from, to),
  ]);
  const s = summarizeJournal(entries);
  const avgMoodObj = s.avgMood != null ? moodOf(Math.round(s.avgMood)) : null;
  const maxMood = Math.max(...s.moodDist, 1);

  const seg =
    "flex h-9 items-center rounded-lg px-4 text-[13px] font-medium transition-colors";

  return (
    <div>
      <Link
        href="/dnevnik"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Ежедневник
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight text-text">
          Итоги
        </h1>
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          <Link
            href="/dnevnik/itogi?p=week"
            className={cn(
              seg,
              period === "week"
                ? "bg-accent text-accent-fg"
                : "text-muted hover:text-text",
            )}
          >
            Неделя
          </Link>
          <Link
            href="/dnevnik/itogi?p=month"
            className={cn(
              seg,
              period === "month"
                ? "bg-accent text-accent-fg"
                : "text-muted hover:text-text",
            )}
          >
            Месяц
          </Link>
        </div>
      </div>

      <p className="mb-4 px-1 text-[12.5px] text-faint">
        Последние {n} {plDays(n)} · {ruMonthDayShort(from)} — {ruMonthDayShort(to)}
      </p>

      {s.count === 0 && tasksClosed === 0 ? (
        <EmptyState
          icon={<NotebookText size={22} />}
          title="Пока пусто"
          description="За этот период ещё нет записей. Начни вести дневник — здесь появятся итоги."
        />
      ) : (
        <>
          {/* Карточки */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              icon={<NotebookText size={17} />}
              value={s.count}
              label="Записей"
              sub={`из ${n} ${plDays(n)}`}
            />
            <StatCard
              icon={<Smile size={17} />}
              value={
                s.avgMood != null ? (
                  <span className="flex items-baseline gap-1.5">
                    {avgMoodObj?.emoji}
                    <span className="text-[18px] text-muted tabular">
                      {s.avgMood.toFixed(1)}
                    </span>
                  </span>
                ) : (
                  "—"
                )
              }
              label="Среднее настроение"
              sub={s.moodCount > 0 ? `по ${s.moodCount} ${plDays(s.moodCount)}` : undefined}
            />
            <StatCard
              icon={<CheckCircle2 size={17} />}
              value={tasksClosed}
              label="Задач закрыто"
            />
          </div>

          {/* Настроение по дням */}
          {s.moodCount > 0 && (
            <section className="mb-6">
              <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
                Настроение
              </h2>
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
                {MOODS.slice()
                  .reverse()
                  .map((m) => {
                    const c = s.moodDist[m.value - 1];
                    return (
                      <div key={m.value} className="flex items-center gap-3">
                        <span className="w-6 text-[18px]">{m.emoji}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${(c / maxMood) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-[12.5px] text-muted tabular">
                          {c}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Лучшие дни */}
          {s.bestDays.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
                Лучшие дни
              </h2>
              <div className="flex flex-col gap-1.5">
                {s.bestDays.map((e) => {
                  const m = moodOf(e.mood);
                  return (
                    <Link
                      key={e.id}
                      href={`/dnevnik/${e.date}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-surface-2"
                    >
                      <span className="text-[18px]">{m ? m.emoji : "·"}</span>
                      <span className="w-24 shrink-0 text-[12.5px] text-muted">
                        {ruWeekday(e.date)}, {ruMonthDayShort(e.date)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">
                        {excerpt(e.body, 90) || (m ? m.label : "")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Топ-теги */}
          {s.topTags.length > 0 && (
            <section>
              <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
                Частые теги
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {s.topTags.map(({ tag, count }) => (
                  <Link
                    key={tag}
                    href={`/dnevnik/poisk?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-[12.5px] font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-text"
                  >
                    #{tag}
                    <span className="text-faint tabular">{count}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
