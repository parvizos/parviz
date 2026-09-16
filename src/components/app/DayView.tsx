import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  getJournalEntry,
  getDayTasks,
  getLessonsForWeekday,
  getRecentJournalEntries,
} from "@/lib/queries";
import {
  todayISO,
  addDaysISO,
  isoWeekday,
  ruFull,
  ruMonthDayShort,
  ruWeekday,
  diffDays,
} from "@/lib/dates";
import { moodOf } from "@/lib/journal-format";
import { tagsOf } from "@/lib/journal-tags";
import { excerpt } from "@/lib/text";
import { JournalEditor } from "./JournalEditor";
import { DayJump } from "./DayJump";
import { TaskGroup } from "./TaskGroup";
import { QuickAdd } from "./QuickAdd";
import { LessonRow } from "./study-items";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function DayView({ date }: { date: string }) {
  const today = todayISO();
  const [entry, tasks, lessons, recent] = await Promise.all([
    getJournalEntry(date),
    getDayTasks(date),
    getLessonsForWeekday(isoWeekday(date)),
    getRecentJournalEntries(30),
  ]);

  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status !== "open");
  const prev = addDaysISO(date, -1);
  const next = addDaysISO(date, 1);
  const isToday = date === today;

  const d = diffDays(today, date);
  const badge =
    d === 0 ? "сегодня" : d === -1 ? "вчера" : d === 1 ? "завтра" : null;

  const recentOther = recent
    .filter((e) => e.date !== date && (e.body || e.mood))
    .slice(0, 8);

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:bg-surface-2 hover:text-text";

  return (
    <div>
      {/* Навигация по дням */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link href={`/dnevnik/${prev}`} className={arrow} aria-label="Предыдущий день">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-center text-[20px] font-semibold tracking-tight text-text">
              {cap(ruFull(date))}
            </h1>
            {badge && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-soft-text">
                {badge}
              </span>
            )}
          </div>
          <Link href={`/dnevnik/${next}`} className={arrow} aria-label="Следующий день">
            <ChevronRight size={18} />
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2">
          <DayJump date={date} />
          {!isToday && (
            <Link
              href="/dnevnik"
              className="flex h-9 items-center rounded-xl border border-border px-3 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              Сегодня
            </Link>
          )}
          <Link
            href="/dnevnik/poisk"
            aria-label="Поиск по дневнику"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <Search size={15} /> Поиск
          </Link>
        </div>
      </div>

      {/* Дневник */}
      <div className="mb-8">
        <JournalEditor
          date={date}
          initialMood={entry?.mood ?? null}
          initialBody={entry?.body ?? null}
          initialTags={tagsOf(entry?.tags)}
        />
      </div>

      {/* Пары */}
      {lessons.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Пары
          </h2>
          <div className="flex flex-col gap-2">
            {lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} />
            ))}
          </div>
        </section>
      )}

      {/* План дня */}
      <section className="mb-8">
        <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
          План дня
        </h2>
        <div className="mb-4">
          <QuickAdd
            prefill={{ scheduledDate: date }}
            placeholder="Запланировать на этот день…"
          />
        </div>
        {open.length > 0 && (
          <TaskGroup tasks={open} today={today} showDate={false} />
        )}
        {done.length > 0 && (
          <TaskGroup
            title="Сделано"
            count={done.length}
            tasks={done}
            today={today}
            showDate={false}
          />
        )}
        {tasks.length === 0 && (
          <p className="px-1 text-[13.5px] text-faint">
            На этот день ничего не запланировано.
          </p>
        )}
      </section>

      {/* Недавние записи */}
      {recentOther.length > 0 && (
        <section>
          <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Недавние записи
          </h2>
          <div className="flex flex-col gap-1.5">
            {recentOther.map((e) => {
              const m = moodOf(e.mood);
              const ts = tagsOf(e.tags);
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
                  {ts.length > 0 && (
                    <span className="hidden shrink-0 items-center gap-1 sm:flex">
                      {ts.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted"
                        >
                          #{t}
                        </span>
                      ))}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
