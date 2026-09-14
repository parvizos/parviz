/*
 * Работа с датами. Поля-даты хранятся как строки "YYYY-MM-DD" (без времени),
 * чтобы «сегодня» и группировки были простыми и предсказуемыми.
 *
 * «Сегодня» на сервере считается в часовом поясе приложения (APP_TIMEZONE),
 * поэтому поставь свой пояс в .env.local, если ты не в Москве.
 */

export function appTimeZone(): string {
  return process.env.APP_TIMEZONE || "Europe/Moscow";
}

/** Текущая дата как "YYYY-MM-DD" в часовом поясе приложения. */
export function todayISO(base: Date = new Date()): string {
  // en-CA даёт формат YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

export function isValidISO(iso: string | null | undefined): iso is string {
  return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

function isoToUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Прибавить дни к ISO-дате, вернуть ISO. */
export function addDaysISO(iso: string, days: number): string {
  const dt = isoToUTC(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** День недели по ISO: 1 — понедельник … 7 — воскресенье. */
export function isoWeekday(iso: string): number {
  const day = isoToUTC(iso).getUTCDay(); // 0 — воскресенье
  return day === 0 ? 7 : day;
}

/** Разница в целых днях: b - a (по датам, без времени). */
export function diffDays(aISO: string, bISO: string): number {
  return Math.round(
    (isoToUTC(bISO).getTime() - isoToUTC(aISO).getTime()) / 86_400_000,
  );
}

const RU_WEEKDAY = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  timeZone: "UTC",
});
const RU_MONTH_DAY = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const RU_MONTH_DAY_SHORT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const RU_FULL = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function ruWeekday(iso: string): string {
  return RU_WEEKDAY.format(isoToUTC(iso)).replace(".", "");
}
export function ruMonthDay(iso: string): string {
  return RU_MONTH_DAY.format(isoToUTC(iso));
}
export function ruMonthDayShort(iso: string): string {
  return RU_MONTH_DAY_SHORT.format(isoToUTC(iso)).replace(".", "");
}
export function ruFull(iso: string): string {
  return RU_FULL.format(isoToUTC(iso));
}

/** Короткая относительная подпись: «Сегодня», «Завтра», «пн, 15 сент.». */
export function relativeLabel(iso: string, today: string): string {
  const d = diffDays(today, iso);
  if (d === 0) return "Сегодня";
  if (d === 1) return "Завтра";
  if (d === -1) return "Вчера";
  if (d > 1 && d <= 6) return `${ruWeekday(iso)}, ${ruMonthDayShort(iso)}`;
  if (d < -1) return ruMonthDayShort(iso);
  return ruMonthDayShort(iso);
}

/* ── Месяцы (YYYY-MM) ── */

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function isValidMonth(m: string | null | undefined): m is string {
  return !!m && /^\d{4}-\d{2}$/.test(m);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(y, m - 1, 1)))
    .replace(/\s*г\.$/, ""); // убираем суффикс «г.»
}

/** Насколько «горит» дата относительно сегодня. */
export function dateTone(
  iso: string,
  today: string,
): "overdue" | "today" | "soon" | "future" {
  const d = diffDays(today, iso);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 3) return "soon";
  return "future";
}
