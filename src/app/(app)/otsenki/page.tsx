import { GraduationCap } from "lucide-react";
import {
  getAcademicOverview,
  getAttendanceStatsBySubject,
  getGrades,
} from "@/lib/study-queries";
import { cn } from "@/lib/cn";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import {
  SubjectAverageCard,
  GradeRow,
  NewGradeButton,
} from "@/components/app/study2-items";

export const metadata = { title: "Оценки" };
export const dynamic = "force-dynamic";

export default async function GradesPage() {
  const [overview, attendance, recent] = await Promise.all([
    getAcademicOverview(),
    getAttendanceStatsBySubject(),
    getGrades({ limit: 20 }),
  ]);

  const withGrades = overview.subjects.filter((s) => s.count > 0);
  const withoutGrades = overview.subjects.filter((s) => s.count === 0);

  if (overview.subjects.length === 0) {
    return (
      <div>
        <PageHeader title="Оценки" subtitle="Средний балл и успеваемость по предметам." />
        <EmptyState
          icon={<GraduationCap size={22} />}
          title="Сначала заведи предметы"
          description="Оценки ставятся по предметам. Добавь предмет в разделе «Предметы» — потом сможешь вести оценки и считать средний балл."
        />
      </div>
    );
  }

  const gpaTone =
    overview.gpaPct >= 0.85
      ? "text-success"
      : overview.gpaPct >= 0.65
        ? "text-warning"
        : "text-danger";

  return (
    <div>
      <PageHeader title="Оценки" actions={<NewGradeButton />} />

      {/* GPA */}
      {overview.gradeCount > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[13px] text-muted">Средний балл</div>
              <div className={cn("mt-1 text-[32px] font-semibold tabular", gpaTone)}>
                {overview.gpa5.toFixed(2)}
                <span className="text-[15px] font-normal text-faint"> / 5</span>
              </div>
            </div>
            <div className="text-right text-[12.5px] text-faint">
              <div>{Math.round(overview.gpaPct * 100)}% от максимума</div>
              <div>{overview.gradeCount} оценок</div>
              {overview.weightedByCredits && <div>с учётом кредитов</div>}
            </div>
          </div>
        </div>
      )}

      {/* Предметы с оценками */}
      {withGrades.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            По предметам
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {withGrades.map((s) => {
              const a = attendance.get(s.subjectId);
              return (
                <SubjectAverageCard
                  key={s.subjectId}
                  avg={s}
                  attendance={a ? { pct: a.pct, absent: a.absent } : null}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Предметы без оценок */}
      {withoutGrades.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Пока без оценок
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {withoutGrades.map((s) => (
              <SubjectAverageCard key={s.subjectId} avg={s} />
            ))}
          </div>
        </section>
      )}

      {/* Последние оценки */}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Последние оценки
          </h2>
          <div className="flex flex-col">
            {recent.map((g) => (
              <GradeRow key={g.id} grade={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
