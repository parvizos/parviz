export type AreaOption = { id: string; name: string; color: string | null };
export type ProjectOption = {
  id: string;
  name: string;
  areaId: string | null;
};
export type SubjectOption = {
  id: string;
  name: string;
  color: string | null;
  areaId: string | null;
};

export type TaskPrefill = {
  projectId?: string | null;
  areaId?: string | null;
  subjectId?: string | null;
  scheduledDate?: string | null;
};

/** Локальная «сегодня» в часовом поясе браузера — для быстрых кнопок дат. */
export function clientToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function clientAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
