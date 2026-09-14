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
