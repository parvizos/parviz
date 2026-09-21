"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, FileText, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { createPage } from "@/lib/actions";
import type { PageTreeNode } from "@/lib/queries";

/**
 * Дерево Блокнота в сайдбаре: бесконечная вложенность, иконки-эмодзи,
 * раскрытие/сворачивание веток. Предки активной страницы раскрываются сами.
 */
export function PageTree({
  pages,
  onNavigate,
}: {
  pages: PageTreeNode[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Родитель → дети (порядок из pages сохраняется) и ребёнок → родитель.
  const childrenOf = new Map<string | null, PageTreeNode[]>();
  const parentOf = new Map<string, string | null>();
  for (const p of pages) {
    const arr = childrenOf.get(p.parentId) ?? [];
    arr.push(p);
    childrenOf.set(p.parentId, arr);
    parentOf.set(p.id, p.parentId);
  }
  const roots = childrenOf.get(null) ?? [];

  const activeId = pathname.startsWith("/bloknot/")
    ? decodeURIComponent(pathname.slice("/bloknot/".length).split("/")[0])
    : null;

  // Цепочка предков активной страницы — путь к ней всегда раскрыт.
  const activeAncestors = new Set<string>();
  {
    let cur = activeId ? (parentOf.get(activeId) ?? null) : null;
    while (cur && !activeAncestors.has(cur)) {
      activeAncestors.add(cur);
      cur = parentOf.get(cur) ?? null;
    }
  }

  // Ручные раскрытия. Итоговое состояние — объединение с предками активной.
  const [manual, setManual] = useState<Set<string>>(new Set());
  const expanded = new Set(manual);
  activeAncestors.forEach((a) => expanded.add(a));

  function toggle(id: string) {
    // Предка активной страницы не сворачиваем — путь к текущей всегда открыт.
    if (activeAncestors.has(id)) return;
    setManual((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const creatingRef = useRef(false);
  function createChild(parentId: string | null) {
    if (creatingRef.current) return;
    creatingRef.current = true;
    startTransition(async () => {
      try {
        const id = await createPage({ parentId });
        if (parentId) {
          setManual((prev) => new Set(prev).add(parentId));
        }
        onNavigate?.();
        router.push(`/bloknot/${id}`);
      } finally {
        creatingRef.current = false;
      }
    });
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between px-3">
        <Link
          href="/bloknot"
          onClick={onNavigate}
          className="text-[11px] font-semibold uppercase tracking-wider text-faint transition-colors hover:text-muted"
        >
          Блокнот
        </Link>
        <button
          onClick={() => createChild(null)}
          disabled={pending}
          aria-label="Новая страница"
          title="Новая страница"
          className="text-faint transition-colors hover:text-text disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}
        </button>
      </div>
      <ul className="mt-1 flex flex-col gap-0.5">
        {roots.length === 0 ? (
          <li>
            <button
              onClick={() => createChild(null)}
              disabled={pending}
              className="flex h-8 w-full items-center gap-1.5 rounded-lg px-3 text-left text-[13px] text-faint transition-colors hover:bg-surface-2 hover:text-muted disabled:opacity-50"
            >
              <Plus size={14} className="shrink-0" />
              Создать страницу
            </button>
          </li>
        ) : (
          roots.map((node) => (
            <PageNode
              key={node.id}
              node={node}
              depth={0}
              childrenOf={childrenOf}
              expanded={expanded}
              activeId={activeId}
              onToggle={toggle}
              onCreateChild={createChild}
              onNavigate={onNavigate}
            />
          ))
        )}
      </ul>
    </>
  );
}

function PageNode({
  node,
  depth,
  childrenOf,
  expanded,
  activeId,
  onToggle,
  onCreateChild,
  onNavigate,
}: {
  node: PageTreeNode;
  depth: number;
  childrenOf: Map<string | null, PageTreeNode[]>;
  expanded: Set<string>;
  activeId: string | null;
  onToggle: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onNavigate?: () => void;
}) {
  const kids = childrenOf.get(node.id) ?? [];
  const hasKids = kids.length > 0;
  const isOpen = expanded.has(node.id);
  const active = node.id === activeId;

  return (
    <li>
      <div
        className={cn(
          "group flex h-8 items-center gap-0.5 rounded-lg pr-1 text-[13.5px] transition-colors",
          active
            ? "bg-surface-2 font-medium text-text"
            : "text-muted hover:bg-surface-2 hover:text-text",
        )}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        <button
          onClick={() => hasKids && onToggle(node.id)}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
            hasKids
              ? "text-faint hover:bg-surface-3 hover:text-text"
              : "pointer-events-none opacity-0",
          )}
          aria-label={isOpen ? "Свернуть" : "Развернуть"}
          tabIndex={hasKids ? 0 : -1}
        >
          <ChevronRight
            size={13}
            className={cn("transition-transform", isOpen && "rotate-90")}
          />
        </button>
        <Link
          href={`/bloknot/${node.id}`}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1"
        >
          {node.icon ? (
            <span className="shrink-0 text-[14px] leading-none">{node.icon}</span>
          ) : (
            <FileText size={14} className="shrink-0 text-faint" />
          )}
          <span className="truncate">{node.title || "Без названия"}</span>
        </Link>
        <button
          onClick={() => onCreateChild(node.id)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-faint opacity-0 transition-colors hover:bg-surface-3 hover:text-text focus:opacity-100 group-hover:opacity-100"
          aria-label="Добавить подстраницу"
          title="Добавить подстраницу"
        >
          <Plus size={13} />
        </button>
      </div>
      {hasKids && isOpen && (
        <ul className="flex flex-col gap-0.5">
          {kids.map((k) => (
            <PageNode
              key={k.id}
              node={k}
              depth={depth + 1}
              childrenOf={childrenOf}
              expanded={expanded}
              activeId={activeId}
              onToggle={onToggle}
              onCreateChild={onCreateChild}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
