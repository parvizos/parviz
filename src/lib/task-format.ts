import type { TaskPriority, ProjectStatus } from "@/db/schema";

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; color: string | null }
> = {
  0: { label: "Без приоритета", color: null },
  1: { label: "Низкий", color: "var(--p-low)" },
  2: { label: "Средний", color: "var(--p-med)" },
  3: { label: "Высокий", color: "var(--p-high)" },
};

export const PRIORITY_OPTIONS: TaskPriority[] = [0, 1, 2, 3];

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; tone: "active" | "muted" | "done" }
> = {
  active: { label: "В работе", tone: "active" },
  paused: { label: "На паузе", tone: "muted" },
  someday: { label: "Когда-нибудь", tone: "muted" },
  done: { label: "Завершён", tone: "done" },
  archived: { label: "В архиве", tone: "muted" },
};

/** Палитра для сфер и проектов — согласованные цвета, а не случайные. */
export const AREA_PALETTE: { name: string; value: string }[] = [
  { name: "Индиго", value: "#5b5bd6" },
  { name: "Синий", value: "#3b82c4" },
  { name: "Бирюзовый", value: "#0f9a8f" },
  { name: "Зелёный", value: "#2f9e6f" },
  { name: "Янтарь", value: "#c9832a" },
  { name: "Оранжевый", value: "#d9662b" },
  { name: "Красный", value: "#d64545" },
  { name: "Розовый", value: "#c4488f" },
  { name: "Фиолетовый", value: "#8b5cd6" },
  { name: "Графит", value: "#6a6a76" },
];

export function areaColor(color: string | null | undefined): string {
  return color || "var(--faint)";
}
