import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getSubject,
  getSubjectLessons,
  getSubjectHomework,
  getSubjectNotes,
} from "@/lib/queries";
import {
  getGrades,
  getSubjectAverages,
  getSubjectExams,
  getAttendanceStatsBySubject,
  getSubjectAttendance,
} from "@/lib/study-queries";
import { todayISO, ruMonthDayShort } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import { weekdayFull, ATTENDANCE_META } from "@/lib/study-format";
import { cn } from "@/lib/cn";
import { TaskGroup } from "@/components/app/TaskGroup";
import { QuickAdd } from "@/components/app/QuickAdd";
import { LessonRow, NoteCard } from "@/components/app/study-items";
import {
  GradeRow,
  ExamCard,
  NewGradeButton,
  NewExamButton,
} from "@/components/app/study2-items";
import {
  EditSubjectButton,
  NewLessonButton,
  NewNoteButton,
} from "@/components/app/study-buttons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getSubject(id);
  return { title: s?.name ?? "Предмет" };
}

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subject = await getSubject(id);
  if (!subject) notFound();

  const [lessons, homework, notes, grades, averages, exams, attStatsMap, attHistory] =
    await Promise.all([
      getSubjectLessons(id),
      getSubjectHomework(id),
      getSubjectNotes(id),
      getGrades({ subjectId: id }),
      getSubjectAverages(),
      getSubjectExams(id),
      getAttendanceStatsBySubject(),
      getSubjectAttendance(id),
    ]);
  const today = todayISO();
  const avg = averages.find((a) => a.subjectId === id) ?? null;
  const att = attStatsMap.get(id) ?? null;
  const upcomingExams = exams.filter((e) => !e.done);
  const openHw = homework.filter((t) => t.status === "open");
  const doneHw = homework.filter((t) => t.status !== "open");

  // Занятия по дням недели.
  const byDay = new Map<number, typeof lessons>();
  for (const l of lessons) {
    const arr = byDay.get(l.dayOfWeek) ?? [];
    arr.push(l);
    byDay.set(l.dayOfWeek, arr);
  }

  return (
    <div>
      <Link
        href="/predmety"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Предметы
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[20px]"
            style={{
              background: `color-mix(in oklab, ${areaColor(subject.color)} 16%, transparent)`,
              color: areaColor(subject.color),
            }}
          >
            {subject.icon || subject.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-text">
              {subject.name}
            </h1>
            {subject.teacher && (
              <p className="mt-0.5 text-sm text-muted">{subject.teacher}</p>
            )}
          </div>
        </div>
        <EditSubjectButton
          subject={{
            id: subject.id,
            name: subject.name,
            teacher: subject.teacher,
            color: subject.color,
            icon: subject.icon,
            areaId: subject.areaId,
            credits: subject.credits,
          }}
        />
      </div>

      {/* Расписание */}
      <section className="mb-8">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Расписание
          </h2>
          <NewLessonButton subjectId={id} variant="soft">
            Занятие
          </NewLessonButton>
        </div>
        {lessons.length > 0 ? (
          <div className="flex flex-col gap-3">
            {[...byDay.entries()].map(([day, list]) => (
              <div key={day}>
                <div className="mb-1.5 px-1 text-[12px] font-medium text-faint">
                  {weekdayFull(day)}
                </div>
                <div className="flex flex-col gap-2">
                  {list.map((l) => (
                    <LessonRow key={l.id} lesson={l} showSubject={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-1 text-[13.5px] text-faint">
            Пар пока нет. Добавь занятие — оно появится в общем расписании.
          </p>
        )}
      </section>

      {/* Успеваемость */}
      <section className="mb-8">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
              Оценки
            </h2>
            {avg && avg.count > 0 && (
              <span className="text-[13px] font-semibold tabular text-text">
                {avg.avgOnScale != null
                  ? `${avg.avgOnScale.toFixed(2)} / ${avg.commonMax}`
                  : `${Math.round(avg.avgPct * 100)}%`}
              </span>
            )}
          </div>
          <NewGradeButton subjectId={id} variant="soft">
            Оценка
          </NewGradeButton>
        </div>
        {grades.length > 0 ? (
          <>
            <div className="flex flex-col">
              {grades.map((g) => (
                <GradeRow key={g.id} grade={g} showSubject={false} />
              ))}
            </div>
            {avg?.need && (
              <p className="mt-2 px-2 text-[12.5px] text-faint">
                Чтобы средний дошёл до {avg.need.target}, нужно{" "}
                <span className="font-medium text-muted">
                  {(Math.ceil(avg.need.need * 10) / 10).toFixed(1)}
                </span>{" "}
                на следующей работе.
              </p>
            )}
          </>
        ) : (
          <p className="px-1 text-[13.5px] text-faint">
            Оценок пока нет. Добавь — посчитается средний балл.
          </p>
        )}
      </section>

      {/* Экзамены */}
      {(upcomingExams.length > 0 || exams.length > 0) && (
        <section className="mb-8">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
              Сессия
            </h2>
            <NewExamButton subjectId={id} variant="soft">
              Экзамен
            </NewExamButton>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {exams.map((e) => (
              <ExamCard key={e.id} exam={e} />
            ))}
          </div>
        </section>
      )}
      {upcomingExams.length === 0 && exams.length === 0 && (
        <section className="mb-8">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
              Сессия
            </h2>
            <NewExamButton subjectId={id} variant="soft">
              Экзамен
            </NewExamButton>
          </div>
          <p className="px-1 text-[13.5px] text-faint">
            Экзаменов и зачётов нет. Добавь — увидишь обратный отсчёт.
          </p>
        </section>
      )}

      {/* Посещаемость */}
      <section className="mb-8">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Посещаемость
          </h2>
          {att && att.total > 0 && (
            <span
              className={cn(
                "text-[13px] font-semibold tabular",
                att.pct < 0.75 ? "text-danger" : "text-text",
              )}
            >
              {Math.round(att.pct * 100)}%
            </span>
          )}
        </div>
        {att && att.total > 0 ? (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {(["present", "late", "absent", "excused"] as const).map((s) =>
                att[s] > 0 ? (
                  <span
                    key={s}
                    className="rounded-lg bg-surface-2 px-2.5 py-1 text-[12.5px] text-muted"
                  >
                    {ATTENDANCE_META[s].label}: {att[s]}
                  </span>
                ) : null,
              )}
            </div>
            <div className="flex flex-col divide-y divide-border">
              {attHistory.slice(0, 8).map((r) => {
                const meta = ATTENDANCE_META[r.status];
                const toneCls =
                  meta.tone === "success"
                    ? "text-success"
                    : meta.tone === "warning"
                      ? "text-warning"
                      : meta.tone === "danger"
                        ? "text-danger"
                        : "text-muted";
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 text-[13px]"
                  >
                    <span className="text-muted">{ruMonthDayShort(r.date)}</span>
                    <span className={cn("font-medium", toneCls)}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="px-1 text-[13.5px] text-faint">
            Отмечай посещение пар в «Сегодня» — здесь будет статистика и процент.
          </p>
        )}
      </section>

      {/* Домашка */}
      <section className="mb-8">
        <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Домашка
        </h2>
        <div className="mb-4">
          <QuickAdd
            prefill={{ subjectId: id }}
            placeholder="Добавить домашнее задание…"
          />
        </div>
        {openHw.length > 0 && (
          <TaskGroup tasks={openHw} today={today} showSubject={false} />
        )}
        {doneHw.length > 0 && (
          <TaskGroup
            title="Сделано"
            count={doneHw.length}
            tasks={doneHw}
            today={today}
            showSubject={false}
          />
        )}
        {homework.length === 0 && (
          <p className="px-1 text-[13.5px] text-faint">
            Домашки нет. Добавленные задания попадут в «Сегодня» и «Предстоящее».
          </p>
        )}
      </section>

      {/* Конспекты */}
      <section>
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Конспекты
          </h2>
          <NewNoteButton subjectId={id}>Конспект</NewNoteButton>
        </div>
        {notes.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </div>
        ) : (
          <p className="px-1 text-[13.5px] text-faint">
            Конспектов пока нет.
          </p>
        )}
      </section>
    </div>
  );
}
