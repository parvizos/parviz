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
  topics,
  materials,
  files,
  type Grade,
  type Exam,
  type Attendance,
  type AttendanceStatus,
  type Topic,
  type TopicStatus,
  type Material,
} from "@/db/schema";
import { todayISO, diffDays, addDaysISO, ruMonthDayShort } from "@/lib/dates";

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

/* ─────────────────────────  Программа курса (темы)  ───────────────────────── */

export async function getSubjectTopics(subjectId: string): Promise<Topic[]> {
  await schemaReady();
  return db
    .select()
    .from(topics)
    .where(eq(topics.subjectId, subjectId))
    .orderBy(asc(topics.position), asc(topics.createdAt));
}

export type TopicProgress = {
  total: number;
  known: number;
  learning: number;
  review: number;
  notStarted: number;
  pct: number; // known / total
};

export function topicProgress(list: { status: TopicStatus }[]): TopicProgress {
  const p: TopicProgress = {
    total: list.length,
    known: 0,
    learning: 0,
    review: 0,
    notStarted: 0,
    pct: 0,
  };
  for (const t of list) {
    if (t.status === "known") p.known++;
    else if (t.status === "learning") p.learning++;
    else if (t.status === "review") p.review++;
    else p.notStarted++;
  }
  p.pct = p.total > 0 ? p.known / p.total : 0;
  return p;
}

/** Прогресс по темам для всех предметов (для аналитики/сводки). */
export async function getTopicProgressBySubject(): Promise<
  Map<string, TopicProgress>
> {
  await schemaReady();
  const rows = await db.select().from(topics);
  const bySubject = new Map<string, TopicStatus[]>();
  for (const t of rows) {
    const arr = bySubject.get(t.subjectId) ?? [];
    arr.push(t.status);
    bySubject.set(t.subjectId, arr);
  }
  const out = new Map<string, TopicProgress>();
  for (const [sid, statuses] of bySubject) {
    out.set(sid, topicProgress(statuses.map((s) => ({ status: s }))));
  }
  return out;
}

/* ───────────────────────────  Материалы  ─────────────────────────── */

export type MaterialRow = Material & {
  fileName: string | null;
  fileSize: number | null;
};

export async function getSubjectMaterials(
  subjectId: string,
): Promise<MaterialRow[]> {
  await schemaReady();
  return db
    .select({
      ...getTableColumns(materials),
      fileName: files.name,
      fileSize: files.size,
    })
    .from(materials)
    .leftJoin(files, eq(materials.fileId, files.id))
    .where(eq(materials.subjectId, subjectId))
    .orderBy(desc(materials.createdAt));
}

/* ───────────────────────────  Аналитика учёбы  ─────────────────────────── */

function lastMonths(n: number): string[] {
  const now = todayISO().slice(0, 7);
  const [y, m] = now.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7));
  }
  return out;
}

export type GpaPoint = { month: string; gpa5: number };

/** Накопительный средний балл (взвеш. по кредитам) на конец каждого месяца. */
export async function getGpaByMonth(n = 9): Promise<GpaPoint[]> {
  await schemaReady();
  const [subs, allGrades] = await Promise.all([
    db.select({ id: subjects.id, credits: subjects.credits }).from(subjects),
    db.select().from(grades),
  ]);
  const creditOf = new Map(subs.map((s) => [s.id, s.credits]));

  return lastMonths(n).map((month) => {
    const upto = allGrades.filter((g) => g.date.slice(0, 7) <= month);
    // Взвешенный процент по предмету.
    const bySub = new Map<string, { sum: number; w: number }>();
    for (const g of upto) {
      const cur = bySub.get(g.subjectId) ?? { sum: 0, w: 0 };
      cur.sum += (g.value / g.maxValue) * g.weight;
      cur.w += g.weight;
      bySub.set(g.subjectId, cur);
    }
    const subjPct = [...bySub.entries()].map(([sid, v]) => ({
      pct: v.w > 0 ? v.sum / v.w : 0,
      credits: creditOf.get(sid) ?? null,
    }));
    const weighted =
      subjPct.length > 0 && subjPct.every((s) => s.credits && s.credits > 0);
    let sum = 0;
    let w = 0;
    for (const s of subjPct) {
      const cw = weighted ? (s.credits as number) : 1;
      sum += s.pct * cw;
      w += cw;
    }
    return { month, gpa5: w > 0 ? (sum / w) * 5 : 0 };
  });
}

export type WeekPoint = { label: string; seconds: number };

/** Часы фокуса по неделям (последние `weeks` 7-дневных окон). */
export async function getFocusByWeek(weeks = 8): Promise<WeekPoint[]> {
  await schemaReady();
  const today = todayISO();
  const rows = await db
    .select({ date: studySessions.date, seconds: studySessions.seconds })
    .from(studySessions)
    .where(gte(studySessions.date, addDaysISO(today, -7 * weeks + 1)));

  const out: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = addDaysISO(today, -7 * i);
    const start = addDaysISO(end, -6);
    const seconds = rows
      .filter((r) => r.date >= start && r.date <= end)
      .reduce((s, r) => s + r.seconds, 0);
    out.push({ label: ruMonthDayShort(start), seconds });
  }
  return out;
}

export type GradeBar = { grade: number; count: number };

/** Распределение оценок, приведённых к 5-балльной шкале (2..5). */
export async function getGradeDistribution(): Promise<GradeBar[]> {
  await schemaReady();
  const rows = await db
    .select({ value: grades.value, maxValue: grades.maxValue })
    .from(grades);
  const buckets = new Map<number, number>([
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ]);
  for (const r of rows) {
    const b = Math.max(2, Math.min(5, Math.round((r.value / r.maxValue) * 5)));
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([grade, count]) => ({ grade, count }));
}

export async function getAttendanceSummary(): Promise<AttendanceStats> {
  await schemaReady();
  const rows = await db
    .select({ status: attendance.status, c: sql<number>`count(*)` })
    .from(attendance)
    .groupBy(attendance.status);
  const s: AttendanceStats = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: 0,
    pct: 1,
  };
  for (const r of rows) s[r.status] = r.c;
  const counted = s.present + s.absent + s.late;
  s.total = counted + s.excused;
  s.pct = counted > 0 ? (s.present + s.late) / counted : 1;
  return s;
}
