import type { OrgKind } from "@/db/schema";

export const ORG_KIND_META: Record<OrgKind, { label: string; icon: string }> = {
  university: { label: "Вуз", icon: "🎓" },
  company: { label: "Компания", icon: "🏢" },
  school: { label: "Школа", icon: "🏫" },
  other: { label: "Другое", icon: "◦" },
};

export const ORG_KINDS_ORDER: OrgKind[] = [
  "university",
  "company",
  "school",
  "other",
];

/**
 * До дня рождения (в днях, 0 — сегодня), считая только месяц и день.
 * null — если дата некорректна.
 */
export function daysUntilBirthday(
  birthday: string | null,
  todayISO: string,
): number | null {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;
  const [, bm, bd] = birthday.split("-").map(Number);
  const [ty, tm, td] = todayISO.split("-").map(Number);
  let next = Date.UTC(ty, bm - 1, bd);
  const todayUTC = Date.UTC(ty, tm - 1, td);
  if (next < todayUTC) next = Date.UTC(ty + 1, bm - 1, bd);
  return Math.round((next - todayUTC) / 86_400_000);
}

/** Возраст, который исполнится (если год известен и не 0001). */
export function turningAge(
  birthday: string | null,
  todayISO: string,
): number | null {
  if (!birthday) return null;
  const [by] = birthday.split("-").map(Number);
  if (!by || by <= 1) return null;
  const [ty] = todayISO.split("-").map(Number);
  const d = daysUntilBirthday(birthday, todayISO);
  if (d === null) return null;
  // если ДР ещё впереди в этом году — исполнится (год - by), иначе следующий
  const [, bm, bd] = birthday.split("-").map(Number);
  const [, tm, td] = todayISO.split("-").map(Number);
  const passed = tm > bm || (tm === bm && td > bd);
  return ty - by + (passed ? 1 : 0);
}

/** Текущий возраст (полных лет) или null, если год рождения неизвестен. */
export function currentAge(
  birthday: string | null,
  todayISO: string,
): number | null {
  const t = turningAge(birthday, todayISO);
  return t === null ? null : t - 1;
}

/** Русское склонение: 21 год, 22 года, 25 лет. */
export function pluralYears(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "год";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "года";
  return "лет";
}

/** Русское склонение: 1 день, 2 дня, 5 дней. */
export function pluralDays(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "день";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "дня";
  return "дней";
}

/** «Когда виделись», по-человечески: сегодня / вчера / 3 дня назад / 2 нед. назад / 4 мес. назад. */
export function agoLabel(days: number): string {
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} ${pluralDays(days)} назад`;
  if (days < 45) return `${Math.round(days / 7)} нед. назад`;
  if (days < 365) return `${Math.round(days / 30)} мес. назад`;
  return "больше года назад";
}
