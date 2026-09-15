"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Flag,
  CalendarDays,
  Clock,
  Folder,
  GraduationCap,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleTask } from "@/lib/actions";
import { relativeLabel, dateTone } from "@/lib/dates";
import { PRIORITY_META, areaColor } from "@/lib/task-format";
import type { TaskWithContext } from "@/lib/queries";
import { useUi } from "./ui-context";

const TONE_CLASS: Record<string, string> = {
  overdue: "text-danger",
  today: "text-accent-soft-text",
  soon: "text-warning",
  future: "text-muted",
};

export function TaskItem({
  task,
  today,
  showProject = true,
  showArea = true,
  showSubject = true,
  showDate = true,
}: {
  task: TaskWithContext;
  today: string;
  showProject?: boolean;
  showArea?: boolean;
  showSubject?: boolean;
  showDate?: boolean;
}) {
  const { openTask } = useUi();
  const [done, setDone] = useState(task.status !== "open");
  const [, startTransition] = useTransition();

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

  const prio = PRIORITY_META[task.priority];
  const date = task.scheduledDate ?? task.dueDate;
  const tone = date ? dateTone(date, today) : "future";

  return (
    <div className="group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
      <button
        onClick={toggle}
        aria-label={done ? "Вернуть в работу" : "Выполнить"}
        className={cn(
          "mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
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
        {done && <Check size={13} strokeWidth={3} />}
      </button>

      <button
        onClick={() => openTask(task)}
        className="min-w-0 flex-1 text-left"
      >
        <span
          className={cn(
            "block truncate text-[14.5px] leading-snug text-text",
            done && "text-faint line-through",
          )}
        >
          {task.title}
        </span>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
          {showDate && date ? (
            <span className={cn("inline-flex items-center gap-1", TONE_CLASS[tone])}>
              <CalendarDays size={13} />
              {relativeLabel(date, today)}
              {task.scheduledDate && task.scheduledTime && (
                <span className="tabular">, {task.scheduledTime}</span>
              )}
            </span>
          ) : (
            // Дату скрыли (например, на «Сегодня»), но время всё равно показываем.
            task.scheduledDate &&
            task.scheduledTime && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 tabular",
                  TONE_CLASS[tone],
                )}
              >
                <Clock size={13} />
                {task.scheduledTime}
              </span>
            )
          )}
          {showProject && task.projectName && (
            <span className="inline-flex items-center gap-1">
              <Folder size={13} />
              <span className="truncate">{task.projectName}</span>
            </span>
          )}
          {showSubject && task.subjectName && (
            <span className="inline-flex items-center gap-1">
              <GraduationCap size={13} />
              <span className="truncate">{task.subjectName}</span>
            </span>
          )}
          {task.personName && (
            <span className="inline-flex items-center gap-1">
              <User size={13} />
              <span className="truncate">{task.personName}</span>
            </span>
          )}
          {showArea && task.areaName && (
            <span className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: areaColor(task.areaColor) }}
              />
              <span className="truncate">{task.areaName}</span>
            </span>
          )}
          {prio.color && (
            <span
              className="inline-flex items-center gap-1"
              style={{ color: prio.color }}
            >
              <Flag size={12} />
              {prio.label}
            </span>
          )}
          {task.notes && (
            <span className="truncate text-faint">
              {task.notes.split("\n")[0]}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
