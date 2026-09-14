import { CalendarClock } from "lucide-react";
import { getExams } from "@/lib/study-queries";
import { ruMonthDay } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { ExamCard, NewExamButton } from "@/components/app/study2-items";

export const metadata = { title: "Сессия" };
export const dynamic = "force-dynamic";

export default async function SessionPage() {
  const exams = await getExams();

  if (exams.length === 0) {
    return (
      <div>
        <PageHeader
          title="Сессия"
          subtitle="Экзамены и зачёты с обратным отсчётом и готовностью."
        />
        <EmptyState
          icon={<CalendarClock size={22} />}
          title="Сессия пустая"
          description="Добавь экзамены и зачёты — увидишь обратный отсчёт до каждого, будешь отмечать готовность и оценки. Ближайшие всплывут в «Сегодня»."
          action={<NewExamButton>Добавить экзамен</NewExamButton>}
        />
      </div>
    );
  }

  const upcoming = exams.filter((e) => !e.done);
  const done = exams.filter((e) => e.done);
  const next = upcoming[0];

  return (
    <div>
      <PageHeader title="Сессия" actions={<NewExamButton />} />

      {next && next.daysLeft != null && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <div className="text-[13px] text-muted">Ближайшее испытание</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-[22px] font-semibold text-text">
              {next.subjectName}
            </span>
            <span
              className={cn(
                "text-[15px] font-semibold tabular",
                next.daysLeft <= 3 ? "text-danger" : "text-muted",
              )}
            >
              {next.daysLeft <= 0
                ? "сегодня"
                : next.daysLeft === 1
                  ? "завтра"
                  : `через ${next.daysLeft} дн.`}
            </span>
          </div>
          <div className="mt-0.5 text-[13px] text-faint">
            {ruMonthDay(next.date)}
            {next.time ? ` · ${next.time}` : ""}
            {next.location ? ` · ${next.location}` : ""}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Предстоят
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upcoming.map((e) => (
              <ExamCard key={e.id} exam={e} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Сдано
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {done.map((e) => (
              <ExamCard key={e.id} exam={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
