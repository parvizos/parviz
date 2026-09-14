import type { ReactNode } from "react";
import { LineChart as LineChartIcon, GraduationCap } from "lucide-react";
import {
  getAcademicOverview,
  getGpaByMonth,
  getFocusByWeek,
  getGradeDistribution,
  getAttendanceSummary,
  getStudyStats,
  getTopicProgressBySubject,
} from "@/lib/study-queries";
import { formatDuration } from "@/lib/study-format";
import { areaColor } from "@/lib/task-format";
import { cn } from "@/lib/cn";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import {
  GpaLineChart,
  HoursBarChart,
  GradeDistributionChart,
} from "@/components/app/study-charts";

export const metadata = { title: "Аналитика учёбы" };
export const dynamic = "force-dynamic";

export default async function StudyAnalyticsPage() {
  const [overview, gpaSeries, focusWeeks, dist, attendance, study, topicProg] =
    await Promise.all([
      getAcademicOverview(),
      getGpaByMonth(9),
      getFocusByWeek(8),
      getGradeDistribution(),
      getAttendanceSummary(),
      getStudyStats(),
      getTopicProgressBySubject(),
    ]);

  const withGrades = overview.subjects.filter((s) => s.count > 0);
  const totalGrades = dist.reduce((s, b) => s + b.count, 0);
  const nothing =
    totalGrades === 0 &&
    study.totalSeconds === 0 &&
    attendance.total === 0 &&
    topicProg.size === 0;

  if (nothing) {
    return (
      <div>
        <PageHeader
          title="Аналитика учёбы"
          subtitle="Динамика среднего балла, часы фокуса, оценки и темы."
        />
        <EmptyState
          icon={<LineChartIcon size={22} />}
          title="Пока нечего анализировать"
          description="Появятся оценки, отметки посещения и время в «Фокусе» — здесь соберётся вся картина по учёбе: тренды, распределение оценок, готовность по темам."
        />
      </div>
    );
  }

  const gpaTone =
    overview.gpaPct >= 0.85 ? "text-success" : overview.gpaPct >= 0.65 ? "text-warning" : "text-danger";

  // Готовность по темам — предметы, где темы заведены.
  const topicRows = overview.subjects
    .map((s) => ({ subject: s, prog: topicProg.get(s.subjectId) }))
    .filter((r) => r.prog && r.prog.total > 0);

  return (
    <div>
      <PageHeader
        title="Аналитика учёбы"
        subtitle="Динамика среднего балла, часы фокуса, оценки и темы."
      />

      {/* Ключевые цифры */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat
          label="Средний балл"
          value={overview.gradeCount > 0 ? overview.gpa5.toFixed(2) : "—"}
          tone={overview.gradeCount > 0 ? gpaTone : undefined}
        />
        <Stat
          label="Посещаемость"
          value={attendance.total > 0 ? `${Math.round(attendance.pct * 100)}%` : "—"}
          tone={attendance.total > 0 && attendance.pct < 0.75 ? "text-danger" : undefined}
        />
        <Stat
          label="Фокус за неделю"
          value={study.weekSeconds > 0 ? formatDuration(study.weekSeconds) : "—"}
        />
      </div>

      {/* GPA по месяцам */}
      {overview.gradeCount > 0 && (
        <Card title="Средний балл по месяцам" hint="Накопительно, к 5-балльной">
          <GpaLineChart points={gpaSeries} />
        </Card>
      )}

      {/* Фокус по неделям */}
      {study.totalSeconds > 0 && (
        <Card title="Фокус по неделям">
          <HoursBarChart points={focusWeeks} />
        </Card>
      )}

      {/* Распределение оценок */}
      {totalGrades > 0 && (
        <Card title="Распределение оценок" hint={`${totalGrades} оценок, к 5-балльной`}>
          <GradeDistributionChart bars={dist} />
        </Card>
      )}

      {/* Готовность по темам */}
      {topicRows.length > 0 && (
        <section className="mb-2">
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Готовность по темам
          </h2>
          <div className="flex flex-col gap-2.5">
            {topicRows.map(({ subject, prog }) => (
              <div key={subject.subjectId} className="flex items-center gap-3">
                <div className="w-36 shrink-0 truncate text-[13px] text-text">
                  {subject.icon ? `${subject.icon} ` : ""}
                  {subject.name}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(prog?.pct ?? 0) * 100}%`,
                      background: areaColor(subject.color),
                    }}
                  />
                </div>
                <div className="w-16 shrink-0 text-right text-[12.5px] text-muted tabular">
                  {prog?.known}/{prog?.total}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {withGrades.length === 0 && totalGrades === 0 && (
        <div className="mt-4 flex items-center gap-2 px-1 text-[13px] text-faint">
          <GraduationCap size={15} /> Добавь оценки — появится динамика балла и
          распределение.
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
      <div className="text-[12px] text-muted">{label}</div>
      <div className={cn("mt-0.5 text-[18px] font-semibold tabular text-text", tone)}>
        {value}
      </div>
    </div>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3">
        <h2 className="text-[14px] font-semibold text-text">{title}</h2>
        {hint && <p className="mt-0.5 text-[12.5px] text-faint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
