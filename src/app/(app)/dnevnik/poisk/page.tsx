import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { searchJournal, getAllJournalTags } from "@/lib/queries";
import { moodOf } from "@/lib/journal-format";
import { tagsOf } from "@/lib/journal-tags";
import { excerpt } from "@/lib/text";
import { ruWeekday, ruMonthDayShort } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { JournalSearchBox } from "@/components/app/JournalSearchBox";
import { EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Поиск по дневнику" };
export const dynamic = "force-dynamic";

function plEntries(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "запись";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "записи";
  return "записей";
}

export default async function JournalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const tag = sp.tag?.trim() || undefined;
  const hasQuery = !!(q || tag);

  const [results, allTags] = await Promise.all([
    hasQuery ? searchJournal({ q, tag }) : Promise.resolve([]),
    getAllJournalTags(),
  ]);

  function hrefFor(nextTag?: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (nextTag) p.set("tag", nextTag);
    const qs = p.toString();
    return `/dnevnik/poisk${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <Link
        href="/dnevnik"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Ежедневник
      </Link>

      <h1 className="mb-4 text-[22px] font-semibold tracking-tight text-text">
        Поиск по дневнику
      </h1>

      <div className="mb-4">
        <JournalSearchBox initialQ={q} tag={tag} />
      </div>

      {/* Облако тегов */}
      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {allTags.map(({ tag: t, count }) => {
            const active = tag?.toLowerCase() === t.toLowerCase();
            return (
              <Link
                key={t}
                href={hrefFor(active ? undefined : t)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-surface text-muted hover:border-border-strong hover:bg-surface-2 hover:text-text",
                )}
              >
                #{t}
                <span
                  className={cn(
                    "tabular",
                    active ? "text-accent-fg/70" : "text-faint",
                  )}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Результаты */}
      {!hasQuery ? (
        <p className="px-1 text-[13.5px] text-faint">
          Введи запрос или выбери тег — покажу все записи, где это встречается.
        </p>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="Ничего не нашлось"
          description="Попробуй другое слово или тег."
        />
      ) : (
        <>
          <p className="mb-2.5 px-1 text-[12.5px] text-faint">
            {results.length} {plEntries(results.length)}
          </p>
          <div className="flex flex-col gap-1.5">
            {results.map((e) => {
              const m = moodOf(e.mood);
              const ts = tagsOf(e.tags);
              return (
                <Link
                  key={e.id}
                  href={`/dnevnik/${e.date}`}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-surface-2"
                >
                  <span className="mt-0.5 text-[18px]">{m ? m.emoji : "·"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] text-muted">
                      {ruWeekday(e.date)}, {ruMonthDayShort(e.date)}
                    </div>
                    <div className="truncate text-[13.5px] text-text">
                      {excerpt(e.body, 120) || (m ? m.label : "—")}
                    </div>
                    {ts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ts.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
