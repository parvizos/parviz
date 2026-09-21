import Link from "next/link";
import { NotebookText, FileText, ChevronRight } from "lucide-react";
import { getPageTree } from "@/lib/queries";
import { NewPageButton } from "@/components/app/NewPageButton";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Блокнот" };
export const dynamic = "force-dynamic";

function plPages(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "страница";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "страницы";
  return "страниц";
}

export default async function BloknotPage() {
  const tree = await getPageTree();
  const roots = tree.filter((p) => p.parentId === null);
  const childCount = new Map<string, number>();
  for (const p of tree) {
    if (p.parentId) childCount.set(p.parentId, (childCount.get(p.parentId) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader
        title="Блокнот"
        subtitle="Свободные страницы с бесконечной вложенностью — как в Notion."
        actions={<NewPageButton />}
      />

      {roots.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {roots.map((p) => {
            const kids = childCount.get(p.id) ?? 0;
            return (
              <Link
                key={p.id}
                href={`/bloknot/${p.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/40 hover:bg-surface-2"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-[24px] leading-none">
                  {p.icon || <FileText size={20} className="text-faint" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-text">
                    {p.title || "Без названия"}
                  </span>
                  <span className="text-[12.5px] text-faint">
                    {kids > 0 ? `${kids} ${plPages(kids)} внутри` : "Пустая страница"}
                  </span>
                </span>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<NotebookText size={22} />}
          title="Чистый лист"
          description="Заведи первую страницу. Внутрь можно вкладывать другие страницы без ограничений — база знаний, проекты, заметки, что угодно."
          action={<NewPageButton />}
        />
      )}
    </div>
  );
}
