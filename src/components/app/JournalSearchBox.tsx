"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/** Живой поиск по дневнику: печатаешь — URL обновляется (тег сохраняется). */
export function JournalSearchBox({
  initialQ,
  tag,
}: {
  initialQ: string;
  tag?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function go(value: string) {
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    router.push(`/dnevnik/poisk${qs ? `?${qs}` : ""}`);
  }

  function onChange(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(value), 300);
  }

  function clear() {
    setQ("");
    if (timer.current) clearTimeout(timer.current);
    go("");
  }

  return (
    <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-accent">
      <Search size={17} className="shrink-0 text-faint" />
      <input
        autoFocus
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (timer.current) clearTimeout(timer.current);
            go(q);
          }
        }}
        placeholder="Искать по записям…"
        className="h-full w-full bg-transparent text-[14px] text-text outline-none placeholder:text-faint"
      />
      {q && (
        <button
          type="button"
          onClick={clear}
          aria-label="Очистить"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-text"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
