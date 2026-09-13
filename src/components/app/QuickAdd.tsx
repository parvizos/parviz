"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createTask } from "@/lib/actions";
import type { TaskPrefill } from "./types";

export function QuickAdd({
  prefill,
  placeholder = "Добавить задачу…",
}: {
  prefill?: TaskPrefill;
  placeholder?: string;
}) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const t = title.trim();
    if (!t) return;
    setTitle("");
    startTransition(async () => {
      try {
        await createTask({ title: t, ...prefill });
      } catch {
        setTitle(t); // вернём текст, если не удалось
      }
    });
  }

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-1 transition-colors focus-within:border-accent">
      <span className="text-faint">
        {pending ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <Plus size={17} />
        )}
      </span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="h-10 w-full bg-transparent text-[14.5px] text-text outline-none placeholder:text-faint"
      />
    </div>
  );
}
