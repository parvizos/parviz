import Link from "next/link";
import { Link2, FileText, NotebookPen, Handshake } from "lucide-react";
import type { Backlink } from "@/lib/queries";

/** «Где упоминается» — карточки страниц/конспектов/встреч со ссылкой на @сущность. */
export function Backlinks({
  items,
  title = "Упоминания",
}: {
  items: Backlink[];
  title?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-2.5 flex items-center gap-1.5 px-1">
        <Link2 size={14} className="text-muted" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
        <span className="text-[12px] text-faint">{items.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((b) => (
          <Link
            key={`${b.kind}-${b.id}`}
            href={b.href}
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 transition-colors hover:border-accent/40 hover:bg-surface-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[16px] leading-none">
              {b.kind === "page" ? (
                b.icon || <FileText size={15} className="text-faint" />
              ) : b.kind === "note" ? (
                <NotebookPen size={15} className="text-faint" />
              ) : (
                <Handshake size={15} className="text-faint" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-text">
                {b.title}
              </span>
              <span className="text-[11.5px] text-faint">
                {b.kind === "page"
                  ? "страница"
                  : b.kind === "note"
                    ? "конспект"
                    : "встреча"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
