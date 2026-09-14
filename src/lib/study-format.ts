import type {
  LessonKind,
  GradeKind,
  ExamKind,
  AttendanceStatus,
} from "@/db/schema";

/** Дни недели в ISO-порядке: 1 — понедельник … 7 — воскресенье. */
export const WEEKDAYS: { iso: number; short: string; full: string }[] = [
  { iso: 1, short: "Пн", full: "Понедельник" },
  { iso: 2, short: "Вт", full: "Вторник" },
  { iso: 3, short: "Ср", full: "Среда" },
  { iso: 4, short: "Чт", full: "Четверг" },
  { iso: 5, short: "Пт", full: "Пятница" },
  { iso: 6, short: "Сб", full: "Суббота" },
  { iso: 7, short: "Вс", full: "Воскресенье" },
];

export function weekdayFull(iso: number): string {
  return WEEKDAYS.find((d) => d.iso === iso)?.full ?? "";
}

export const LESSON_KINDS_ORDER: LessonKind[] = [
  "lecture",
  "seminar",
  "lab",
  "practice",
  "other",
];

export const LESSON_KIND_META: Record<
  LessonKind,
  { label: string; short: string }
> = {
  lecture: { label: "Лекция", short: "Лек" },
  seminar: { label: "Семинар", short: "Сем" },
  lab: { label: "Лабораторная", short: "Лаб" },
  practice: { label: "Практика", short: "Пр" },
  other: { label: "Другое", short: "—" },
};

/* ── Оценки ── */

export const GRADE_KINDS_ORDER: GradeKind[] = [
  "exam",
  "test",
  "quiz",
  "homework",
  "project",
  "other",
];

export const GRADE_KIND_META: Record<GradeKind, { label: string }> = {
  exam: { label: "Экзамен" },
  test: { label: "Контрольная" },
  quiz: { label: "Опрос" },
  homework: { label: "Домашка" },
  project: { label: "Проект" },
  other: { label: "Оценка" },
};

/* ── Экзамены / сессия ── */

export const EXAM_KINDS_ORDER: ExamKind[] = [
  "exam",
  "credit",
  "coursework",
  "retake",
  "other",
];

export const EXAM_KIND_META: Record<ExamKind, { label: string; short: string }> = {
  exam: { label: "Экзамен", short: "Экз" },
  credit: { label: "Зачёт", short: "Зач" },
  coursework: { label: "Курсовая", short: "Курс" },
  retake: { label: "Пересдача", short: "Перес" },
  other: { label: "Другое", short: "—" },
};

/* ── Посещаемость ── */

export const ATTENDANCE_STATUSES_ORDER: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "excused",
];

export const ATTENDANCE_META: Record<
  AttendanceStatus,
  { label: string; short: string; tone: "success" | "warning" | "danger" | "muted" }
> = {
  present: { label: "Был", short: "Был", tone: "success" },
  late: { label: "Опоздал", short: "Опозд", tone: "warning" },
  absent: { label: "Пропустил", short: "Проп", tone: "danger" },
  excused: { label: "Уважительная", short: "Уваж", tone: "muted" },
};

/** Оценка → цвет по «хорошести» (доля от максимума). */
export function gradeTone(ratio: number): string {
  if (ratio >= 0.85) return "var(--success)";
  if (ratio >= 0.65) return "var(--warning)";
  return "var(--danger)";
}

/** Секунды → «2 ч 15 мин» / «45 мин». */
export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0) return mm > 0 ? `${h} ч ${mm} мин` : `${h} ч`;
  return `${m} мин`;
}
