"use client";

import { useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleTask } from "@/lib/actions";
import { PRIORITY_META } from "@/lib/task-format";
import type { TaskWithContext } from "@/lib/queries";
import { useUi } from "./ui-context";

/** Шапка страницы задачи: чекбокс, заголовок и кнопка «Изменить» (открывает диалог). */
export function TaskPageHeader({ task }: { task: TaskWithContext }) {
  const { openTask } = useUi();
  const [done, setDone] = useState(task.status !== "open");
  const [, startTransition] = useTransition();
  const prio = PRIORITY_META[task.priority];

  function toggle() {
    const next = !done;
    setDone(next);
    startTransition(async () => {
      try {
        await toggleTask(task.id, next);
      } catch {
        setDone(!next);
      }
    });
  }

  return (
    <div className="mb-5 flex items-start gap-3">
      <button
        onClick={toggle}
        aria-label={done ? "Вернуть в работу" : "Выполнить"}
        className={cn(
          "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
          done
            ? "border-accent bg-accent text-accent-fg"
            : "border-border-strong hover:border-accent",
        )}
        style={
          !done && prio.color
            ? { borderColor: prio.color, color: prio.color }
            : undefined
        }
      >
        {done && <Check size={15} strokeWidth={3} />}
      </button>
      <h1
        className={cn(
          "min-w-0 flex-1 text-[22px] font-semibold leading-tight tracking-tight text-text",
          done && "text-faint line-through",
        )}
      >
        {task.title}
      </h1>
      <button
        onClick={() => openTask(task)}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[13px] font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-2"
      >
        <Pencil size={15} /> Изменить
      </button>
    </div>
  );
}
