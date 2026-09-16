/** Утилиты тегов дневника (#настя #учёба). Теги — короткие слова без пробелов. */

const MAX_TAG_LEN = 30;
const MAX_TAGS = 16;

/** Разобрать ввод в список тегов: делим по пробелам/запятым/#, чистим, дедуплим. */
export function parseTags(input: string): string[] {
  return dedupeTags(
    input
      .split(/[\s,#]+/)
      .map((t) => t.trim().slice(0, MAX_TAG_LEN))
      .filter(Boolean),
  );
}

/** Убрать дубли без учёта регистра, сохранив первое написание; ограничить число. */
export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const key = t.toLowerCase();
    if (t && !seen.has(key)) {
      seen.add(key);
      out.push(t);
      if (out.length >= MAX_TAGS) break;
    }
  }
  return out;
}

/** Теги записи как массив (из json-поля, которое может быть null/строкой). */
export function tagsOf(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}
