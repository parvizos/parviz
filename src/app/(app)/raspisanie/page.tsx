import { GraduationCap } from "lucide-react";
import { getScheduleByDay, getSubjectOptions } from "@/lib/queries";
import { todayISO, isoWeekday } from "@/lib/dates";
import { WEEKDAYS } from "@/lib/study-format";
import { cn } from "@/lib/cn";
import { LessonRow } from "@/components/app/study-items";
import { NewLessonButton, NewSubjectButton } from "@/components/app/study-buttons";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Расписание" };
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [days, subjects] = await Promise.all([
    getScheduleByDay(),
    getSubjectOptions(),
  ]);
  const todayWd = isoWeekday(todayISO());

  if (subjects.length === 0) {
    return (
      <div>
        <PageHeader title="Расписание" subtitle="Недельные пары по дням." />
        <EmptyState
          icon={<GraduationCap size={22} />}
          title="Сначала добавь предметы"
          description="Расписание строится из занятий по предметам. Создай первый предмет — потом расставишь пары по дням."
          action={<NewSubjectButton />}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Расписание"
        subtitle="Недельные пары по дням."
        actions={<NewLessonButton day={todayWd}>Занятие</NewLessonButton>}
      />

      <div className="flex flex-col gap-5">
        {WEEKDAYS.map((wd) => {
          const day = days.find((d) => d.iso === wd.iso);
          const isToday = wd.iso === todayWd;
          const list = day?.lessons ?? [];
          return (
            <section key={wd.iso}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <h2
                  className={cn(
                    "text-[13px] font-semibold uppercase tracking-wide",
                    isToday ? "text-accent-soft-text" : "text-muted",
                  )}
                >
                  {wd.full}
                </h2>
                {isToday && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-soft-text">
                    сегодня
                  </span>
                )}
              </div>
              {list.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {list.map((l) => (
                    <LessonRow key={l.id} lesson={l} />
                  ))}
                </div>
              ) : (
                <p className="px-1 text-[13px] text-faint">Нет занятий</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
