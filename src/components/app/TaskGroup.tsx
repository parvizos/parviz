import { cn } from "@/lib/cn";
import { TaskItem } from "./TaskItem";
import type { TaskWithContext } from "@/lib/queries";
import type { ReactNode } from "react";

export function TaskGroup({
  title,
  count,
  tasks,
  today,
  tone = "default",
  showProject = true,
  showArea = true,
  showDate = true,
  right,
}: {
  title?: string;
  count?: number;
  tasks: TaskWithContext[];
  today: string;
  tone?: "default" | "danger";
  showProject?: boolean;
  showArea?: boolean;
  showDate?: boolean;
  right?: ReactNode;
}) {
  if (tasks.length === 0 && !title) return null;
  return (
    <section className="mb-7">
      {title && (
        <div className="mb-1 flex items-center gap-2 px-2">
          <h2
            className={cn(
              "text-[12.5px] font-semibold uppercase tracking-wide",
              tone === "danger" ? "text-danger" : "text-muted",
            )}
          >
            {title}
          </h2>
          {typeof count === "number" && (
            <span className="text-[12px] text-faint tabular">{count}</span>
          )}
          {right && <div className="ml-auto">{right}</div>}
        </div>
      )}
      <div className="flex flex-col">
        {tasks.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            today={today}
            showProject={showProject}
            showArea={showArea}
            showDate={showDate}
          />
        ))}
      </div>
    </section>
  );
}
