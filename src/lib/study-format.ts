import type { LessonKind } from "@/db/schema";

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
