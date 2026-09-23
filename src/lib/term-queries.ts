import { asc, eq } from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { terms, subjects, grades, type Term } from "@/db/schema";

/** id активного семестра (или null — тогда показываем всё). */
export async function getActiveTermId(): Promise<string | null> {
  await schemaReady();
  const [r] = await db
    .select({ id: terms.id })
    .from(terms)
    .where(eq(terms.active, true))
    .limit(1);
  return r?.id ?? null;
}

export async function getActiveTerm(): Promise<Term | null> {
  await schemaReady();
  const [r] = await db
    .select()
    .from(terms)
    .where(eq(terms.active, true))
    .limit(1);
  return r ?? null;
}

export type TermSwitcherItem = { id: string; name: string; active: boolean };

/** Лёгкий список для переключателя семестра (без подсчётов). */
export async function getTermsForSwitcher(): Promise<TermSwitcherItem[]> {
  await schemaReady();
  return db
    .select({ id: terms.id, name: terms.name, active: terms.active })
    .from(terms)
    .orderBy(asc(terms.position), asc(terms.createdAt));
}

export type TermSubject = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export type TermRow = Term & {
  subjectCount: number;
  gpa5: number | null;
  subjects: TermSubject[];
};

/** Все семестры со средним баллом и числом предметов — для страницы «Семестры». */
export async function getTerms(): Promise<TermRow[]> {
  await schemaReady();
  const [allTerms, subs, allGrades] = await Promise.all([
    db.select().from(terms).orderBy(asc(terms.position), asc(terms.createdAt)),
    db
      .select({
        id: subjects.id,
        termId: subjects.termId,
        credits: subjects.credits,
        name: subjects.name,
        icon: subjects.icon,
        color: subjects.color,
      })
      .from(subjects)
      .orderBy(asc(subjects.position), asc(subjects.createdAt)),
    db.select().from(grades),
  ]);

  // Взвешенный процент по каждому предмету (как в getSubjectAverages).
  const bySub = new Map<string, { sum: number; w: number }>();
  for (const g of allGrades) {
    const cur = bySub.get(g.subjectId) ?? { sum: 0, w: 0 };
    cur.sum += (g.value / g.maxValue) * g.weight;
    cur.w += g.weight;
    bySub.set(g.subjectId, cur);
  }

  const byTerm = new Map<
    string,
    { credits: number | null; pct: number | null }[]
  >();
  const subsByTerm = new Map<string, TermSubject[]>();
  for (const s of subs) {
    if (!s.termId) continue;
    const g = bySub.get(s.id);
    const arr = byTerm.get(s.termId) ?? [];
    arr.push({ credits: s.credits, pct: g && g.w > 0 ? g.sum / g.w : null });
    byTerm.set(s.termId, arr);
    const chips = subsByTerm.get(s.termId) ?? [];
    chips.push({ id: s.id, name: s.name, icon: s.icon, color: s.color });
    subsByTerm.set(s.termId, chips);
  }

  return allTerms.map((t) => {
    const list = byTerm.get(t.id) ?? [];
    const withG = list.filter((x) => x.pct != null);
    const weighted =
      withG.length > 0 && withG.every((x) => x.credits && x.credits > 0);
    let sum = 0;
    let w = 0;
    for (const x of withG) {
      const cw = weighted ? (x.credits as number) : 1;
      sum += (x.pct as number) * cw;
      w += cw;
    }
    return {
      ...t,
      subjectCount: list.length,
      gpa5: w > 0 ? (sum / w) * 5 : null,
      subjects: subsByTerm.get(t.id) ?? [],
    };
  });
}
