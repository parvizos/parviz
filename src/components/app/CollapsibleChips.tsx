"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type FilterChip = {
  key: string;
  label: string;
  count?: number;
  href: string;
  active?: boolean;
};

const base =
  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium transition-colors";
const activeCls = "border-accent bg-accent text-accent-fg";
const idleCls =
  "border-border bg-surface text-muted hover:border-border-strong hover:bg-surface-2 hover:text-text";

/**
 * Ряд чипов-фильтров, который не разрастается на всю страницу: показывает
 * первые `limit`, остальные прячет за кнопкой «Ещё N». Активный чип всегда виден.
 */
export function CollapsibleChips({
  chips,
  limit = 10,
}: {
  chips: FilterChip[];
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const overflow = chips.length > limit;
  const collapsed = overflow && !expanded;

  let visible = collapsed ? chips.slice(0, limit) : chips;
  const active = chips.find((c) => c.active);
  if (collapsed && active && !visible.includes(active)) {
    visible = [...visible, active];
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          className={cn(base, c.active ? activeCls : idleCls)}
        >
          {c.label}
          {c.count != null && (
            <span
              className={cn("tabular", c.active ? "text-accent-fg/70" : "text-faint")}
            >
              {c.count}
            </span>
          )}
        </Link>
      ))}
      {overflow && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn(base, idleCls)}
        >
          {expanded ? "Свернуть" : `Ещё ${chips.length - limit}`}
        </button>
      )}
    </div>
  );
}
