export const MOODS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Тяжело" },
  { value: 2, emoji: "😕", label: "Так себе" },
  { value: 3, emoji: "😐", label: "Нормально" },
  { value: 4, emoji: "🙂", label: "Хорошо" },
  { value: 5, emoji: "🤩", label: "Отлично" },
];

export function moodOf(v: number | null | undefined) {
  return MOODS.find((m) => m.value === v) ?? null;
}
