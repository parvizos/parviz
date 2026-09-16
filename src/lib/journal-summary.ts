import type { Journal } from "@/db/schema";
import { tagsOf } from "./journal-tags";

export type JournalSummary = {
  /** Записей с содержимым (текст, настроение или теги). */
  count: number;
  /** Записей с настроением. */
  moodCount: number;
  /** Среднее настроение (1–5) по записям с настроением. */
  avgMood: number | null;
  /** Распределение: индекс 0..4 → настроение 1..5. */
  moodDist: number[];
  /** Лучшие дни (настроение ≥ 4), максимум 3. */
  bestDays: Journal[];
  /** Топ тегов за период. */
  topTags: { tag: string; count: number }[];
};

function hasContent(e: Journal): boolean {
  return !!(e.body || e.mood || tagsOf(e.tags).length);
}

export function summarizeJournal(entries: Journal[]): JournalSummary {
  const withContent = entries.filter(hasContent);
  const moods = withContent
    .map((e) => e.mood)
    .filter((m): m is number => typeof m === "number");
  const moodDist = [0, 0, 0, 0, 0];
  for (const m of moods) if (m >= 1 && m <= 5) moodDist[m - 1] += 1;
  const avgMood =
    moods.length > 0 ? moods.reduce((s, m) => s + m, 0) / moods.length : null;

  const bestDays = withContent
    .filter((e) => (e.mood ?? 0) >= 4)
    .sort((a, b) => (b.mood ?? 0) - (a.mood ?? 0) || b.date.localeCompare(a.date))
    .slice(0, 3);

  const tagCounts = new Map<string, { tag: string; count: number }>();
  for (const e of withContent) {
    for (const t of tagsOf(e.tags)) {
      const key = t.toLowerCase();
      const found = tagCounts.get(key);
      if (found) found.count += 1;
      else tagCounts.set(key, { tag: t, count: 1 });
    }
  }
  const topTags = [...tagCounts.values()]
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 10);

  return {
    count: withContent.length,
    moodCount: moods.length,
    avgMood,
    moodDist,
    bestDays,
    topTags,
  };
}
