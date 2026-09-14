import { getStudyStats } from "@/lib/study-queries";
import { getSubjectOptions } from "@/lib/queries";
import { formatDuration } from "@/lib/study-format";
import { areaColor } from "@/lib/task-format";
import { PageHeader } from "@/components/ui/misc";
import { StudyTimer } from "@/components/app/StudyTimer";

export const metadata = { title: "Фокус" };
export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const [stats, subjectOptions] = await Promise.all([
    getStudyStats(),
    getSubjectOptions(),
  ]);

  const maxWeek = stats.bySubjectWeek[0]?.seconds ?? 0;

  return (
    <div>
      <PageHeader
        title="Фокус"
        subtitle="Таймер концентрации и учёт вложенного времени."
      />

      <div className="mb-6">
        <StudyTimer subjectOptions={subjectOptions} />
      </div>

      {/* Итоги */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Сегодня" seconds={stats.todaySeconds} />
        <Stat label="За неделю" seconds={stats.weekSeconds} />
        <Stat label="Всего" seconds={stats.totalSeconds} />
      </div>

      {/* По предметам за неделю */}
      {stats.bySubjectWeek.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            За неделю по предметам
          </h2>
          <div className="flex flex-col gap-2.5">
            {stats.bySubjectWeek.map((s) => (
              <div key={s.subjectId ?? "none"} className="flex items-center gap-3">
                <div className="w-32 shrink-0 truncate text-[13px] text-text">
                  {s.name}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxWeek > 0 ? Math.max((s.seconds / maxWeek) * 100, 3) : 0}%`,
                      background: areaColor(s.color),
                    }}
                  />
                </div>
                <div className="w-24 shrink-0 text-right text-[12.5px] text-muted tabular">
                  {formatDuration(s.seconds)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, seconds }: { label: string; seconds: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-0.5 text-[17px] font-semibold tabular text-text">
        {seconds > 0 ? formatDuration(seconds) : "—"}
      </div>
    </div>
  );
}
