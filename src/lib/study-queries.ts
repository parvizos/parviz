/*
 * Продвинутая учёба — read-модели: оценки и средний балл (GPA),
 * экзамены с обратным отсчётом, посещаемость, статистика таймера.
 */

import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, schemaReady } from "@/db";
import {
  subjects,
  grades,
  exams,
  attendance,
  studySessions,
  lessons,
  type Grade,
  type Exam,
  type Attendance,
  type AttendanceStatus,
} from "@/db/schema";
import { todayISO, diffDays, addDaysISO } from "@/lib/dates";

export type { AttendanceStatus };

/* ───────────────────────────  Оценки / GPA  ─────────────────────────── */

export type GradeRow = Grade & {
  subjectName: string;
  subjectColor: string | null;
  subjectIcon: string | null;
};

export async function getGrades(
  opts: { subjectId?: string; limit?: number } = {},
): Promise<GradeRow[]> {
  await schemaReady();
  const conds: SQL[] = [];
  if (opts.subjectId) conds.push(eq(grades.subjectId, opts.subjectId));
  let q = db
    .select({
      ...getTableColumns(grades),
      subjectName: subjects.name,
      subjectColor: subjects.color,
      subjectIcon: subjects.icon,
    })
    .from(grades)
    .innerJoin(subjects, eq(grades.subjectId, subjects.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(grades.date), desc(grades.createdAt))
    .$dynamic();
  if (opts.limit) q = q.limit(opts.limit);
  return q;
}

/** Какая оценка нужна на след. работе, чтобы средний дорос до ближайшей ступени. */
function neededForNext(
  sumPct: number,
  weight: number,
  max: number,
  avgOnScale: number,
): { target: number; need: number } | null {
  // Ступени по 0.5 выше текущего среднего, не выше максимума.
  for (let t = Math.floor(avgOnScale * 2 + 1) / 2; t <= max + 1e-9; t += 0.5) {
    if (t <= avgOnScale + 1e-9) continue;
    // (sumPct + need/max) / (weight + 1) >= t/max
    const need = t * (weight + 1) - max * sumPct;
    if (need <= max + 1e-9) {
      return { target: t, need: Math.max(need, 0) };
    }
  }
  return null;
}

export type SubjectAverage = {
  subjectId: string;
  name: string;
  color: string | null;
  icon: string | null;
  credits: number | null;
  count: number;
  avgPct: number; // 0..1, взвешенный
  commonMax: number | null; // единая шкала, если все оценки по ней
  avgOnScale: number | null; // средний на общей шкале (напр. 4.3 из 5)
  need: { target: number; need: number } | null;
};

export async function getSubjectAverages(): Promise<SubjectAverage[]> {
  await schemaReady();
  const [subs, allGrades] = await Promise.all([
    db
      .select()
      .from(subjects)
      .where(isNull(subjects.archivedAt))
      .orderBy(asc(subjects.position), asc(subjects.createdAt)),
    db.select().from(grades),
  ]);

  const bySubject = new Map<string, Grade[]>();
  for (const g of allGrades) {
    const arr = bySubject.get(g.subjectId) ?? [];
    arr.push(g);
    bySubject.set(g.subjectId, arr);
  }

  return subs.map((s) => {
    const gs = bySubject.get(s.id) ?? [];
    let sumPct = 0;
    let weight = 0;
    let commonMax: number | null = gs.length ? gs[0].maxValue : null;
    for (const g of gs) {
      sumPct += (g.value / g.maxValue) * g.weight;
      weight += g.weight;
      if (commonMax !== null && g.maxValue !== commonMax) commonMax = null;
    }
    const avgPct = weight > 0 ? sumPct / weight : 0;
    const avgOnScale = commonMax !== null ? avgPct * commonMax : null;
    const need =
      commonMax !== null && weight > 0 && avgOnScale !== null
        ? neededForNext(sumPct, weight, commonMax, avgOnScale)
        : null;
    return {
      subjectId: s.id,
      name: s.name,
      color: s.color,
      icon: s.icon,
      credits: s.credits,
      count: gs.length,
      avgPct,
      commonMax,
      avgOnScale,
      need,
    };
  });
}

export type AcademicOverview = {
  subjects: SubjectAverage[];
  gpaPct: number;
  gpa5: number; // средний, приведённый к 5-балльной
  gradeCount: number;
  weightedByCredits: boolean;
};

export async function getAcademicOverview(): Promise<AcademicOverview> {
  const averages = await getSubjectAverages();
  const withGrades = averages.filter((a) => a.count > 0);
  const weightedByCredits =
    withGrades.length > 0 &&
    withGrades.every((a) => a.credits != null && a.credits > 0);

  let sum = 0;
  let w = 0;
  for (const a of withGrades) {
    const cw = weightedByCredits ? (a.credits as number) : 1;
    sum += a.avgPct * cw;
    w += cw;
  }
  const gpaPct = w > 0 ? sum / w : 0;
  return {
    subjects: averages,
    gpaPct,
    gpa5: gpaPct * 5,
    gradeCount: withGrades.reduce((s, a) => s + a.count, 0),
    weightedByCredits,
  };
}

/* ─────────────────────────────  Экзамены  ─────────────────────────── */

export type ExamRow = Exam & {
  subjectName: string;
  subjectColor: string | null;
  subjectIcon: string | null;
  done: boolean;
  daysLeft: number | null;
};

function toExamRow(
  r: Exam & { subjectName: string; subjectColor: string | null; subjectIcon: string | null },
  today: string,
): ExamRow {
  const done = r.passedAt != null;
  return {
    ...r,
    done,
    daysLeft: done ? null : diffDays(today, r.date),
  };
}

export async function getExams(): Promise<ExamRow[]> {
  await schemaReady();
  const today = todayISO();
  const rows = await db
    .select({
      ...getTableColumns(exams),
      subjectName: subjects.name,
      subjectColor: subjects.color,
      subjectIcon: subjects.icon,
    })
    .from(exams)
    .innerJoin(subjects, eq(exams.subjectId, subjects.id))
    .orderBy(asc(exams.date), asc(exams.time));
  return rows.map((r) => toExamRow(r, today));
}

export async function getSubjectExams(subjectId: string): Promise<ExamRow[]> {
  const all = await getExams();
  return all.filter((e) => e.subjectId === subjectId);
}

/** Ближайшие несданные экзамены в окне дней — для «Сегодня». */
export async function getUpcomingExams(withinDays = 14): Promise<ExamRow[]> {
  await schemaReady();
  const today = todayISO();
  const limit = addDaysISO(today, withinDays);
  const rows = await db
    .select({
      ...getTableColumns(exams),
      subjectName: subjects.name,
      subjectColor: subjects.color,
      subjectIcon: subjects.icon,
    })
    .from(exams)
    .innerJoin(subjects, eq(exams.subjectId, subjects.id))
    .where(and(isNull(exams.passedAt), sql`${exams.date} <= ${limit}`))
    .orderBy(asc(exams.date), asc(exams.time));
  return rows.map((r) => toExamRow(r, today));
}

/* ───────────────────────────  Посещаемость  ─────────────────────────── */

export type AttendanceStats = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  pct: number; // (present + late) / total
};

function emptyStats(): AttendanceStats {
  return { present: 0, absent: 0, late: 0, excused: 0, total: 0, pct: 1 };
}

export async function getAttendanceStatsBySubject(): Promise<
  Map<string, AttendanceStats>
> {
  await schemaReady();
  const rows = await db
    .select({
      subjectId: attendance.subjectId,
      status: attendance.status,
      c: sql<number>`count(*)`,
    })
    .from(attendance)
    .groupBy(attendance.subjectId, attendance.status);

  const map = new Map<string, AttendanceStats>();
  for (const r of rows) {
    const s = map.get(r.subjectId) ?? emptyStats();
    s[r.status] = r.c;
    map.set(r.subjectId, s);
  }
  for (const s of map.values()) {
    // «excused» (уважительные) не считаем пропуском и не тянем вниз процент.
    const counted = s.present + s.absent + s.late;
    s.total = s.present + s.absent + s.late + s.excused;
    s.pct = counted > 0 ? (s.present + s.late) / counted : 1;
  }
  return map;
}

export type AttendanceRow = Attendance & { lessonKind: string | null };

export async function getSubjectAttendance(
  subjectId: string,
): Promise<AttendanceRow[]> {
  await schemaReady();
  return db
    .select({
      ...getTableColumns(attendance),
      lessonKind: lessons.kind,
    })
    .from(attendance)
    .leftJoin(lessons, eq(attendance.lessonId, lessons.id))
    .where(eq(attendance.subjectId, subjectId))
    .orderBy(desc(attendance.date), desc(attendance.createdAt));
}

/** Отметки за дату по слотам расписания (для быстрой отметки в «Сегодня»). */
export async function getAttendanceForDate(
  date: string,
): Promise<Map<string, AttendanceStatus>> {
  await schemaReady();
  const rows = await db
    .select({ lessonId: attendance.lessonId, status: attendance.status })
    .from(attendance)
    .where(eq(attendance.date, date));
  const map = new Map<string, AttendanceStatus>();
  for (const r of rows) if (r.lessonId) map.set(r.lessonId, r.status);
  return map;
}

/* ───────────────────────────  Таймер / фокус  ─────────────────────────── */

export type StudyStats = {
  todaySeconds: number;
  weekSeconds: number;
  totalSeconds: number;
  bySubjectWeek: {
    subjectId: string | null;
    name: string;
    color: string | null;
    seconds: number;
  }[];
};

export async function getStudyStats(): Promise<StudyStats> {
  await schemaReady();
  const today = todayISO();
  const weekStart = addDaysISO(today, -6);

  const [todayRow, totalRow, weekBySubject] = await Promise.all([
    db
      .select({ s: sql<number>`coalesce(sum(${studySessions.seconds}), 0)` })
      .from(studySessions)
      .where(eq(studySessions.date, today)),
    db
      .select({ s: sql<number>`coalesce(sum(${studySessions.seconds}), 0)` })
      .from(studySessions),
    db
      .select({
        subjectId: studySessions.subjectId,
        name: subjects.name,
        color: subjects.color,
        seconds: sql<number>`sum(${studySessions.seconds})`,
      })
      .from(studySessions)
      .leftJoin(subjects, eq(studySessions.subjectId, subjects.id))
      .where(gte(studySessions.date, weekStart))
      .groupBy(studySessions.subjectId)
      .orderBy(desc(sql`sum(${studySessions.seconds})`)),
  ]);

  const weekSeconds = weekBySubject.reduce((s, r) => s + r.seconds, 0);
  return {
    todaySeconds: todayRow[0]?.s ?? 0,
    weekSeconds,
    totalSeconds: totalRow[0]?.s ?? 0,
    bySubjectWeek: weekBySubject.map((r) => ({
      subjectId: r.subjectId,
      name: r.name ?? "Без предмета",
      color: r.color,
      seconds: r.seconds,
    })),
  };
}
