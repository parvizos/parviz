import Link from "next/link";
import { ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/cn";
import { relativeLabel, dateTone } from "@/lib/dates";
import { PROJECT_STATUS_META, areaColor } from "@/lib/task-format";
import type { ProjectWithCounts, AreaWithCounts } from "@/lib/queries";
import type { ProjectStatus } from "@/db/schema";
import { EntityAvatar } from "./EntityAvatar";

const DATE_TONE: Record<string, string> = {
  overdue: "text-danger",
  today: "text-accent-soft-text",
  soon: "text-warning",
  future: "text-muted",
};

export function ProjectCard({
  project,
  today,
  showArea = true,
}: {
  project: ProjectWithCounts;
  today: string;
  showArea?: boolean;
}) {
  const done = Math.max(project.totalCount - project.openCount, 0);
  const ratio = project.totalCount > 0 ? done / project.totalCount : 0;
  const status = project.status as ProjectStatus;
  const statusMeta = PROJECT_STATUS_META[status];

  return (
    <Link
      href={`/proekty/${project.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <EntityAvatar
            image={project.image}
            color={project.areaColor}
            name={project.name}
            size={40}
            className="mt-0.5"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-medium text-text">
                {project.name}
              </h3>
            </div>
            {showArea && project.areaName && (
              <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: areaColor(project.areaColor) }}
                />
                {project.areaName}
              </div>
            )}
          </div>
        </div>
        <ChevronRight
          size={18}
          className="mt-0.5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
        />
      </div>

      {/* Прогресс */}
      <div className="flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-[12px] text-muted tabular">
          {done}/{project.totalCount}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {status !== "active" && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11.5px] font-medium",
              statusMeta.tone === "done"
                ? "bg-success-soft text-success"
                : "bg-surface-2 text-muted",
            )}
          >
            {statusMeta.label}
          </span>
        )}
        {project.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[12px]",
              DATE_TONE[dateTone(project.dueDate, today)],
            )}
          >
            <CalendarDays size={13} />
            {relativeLabel(project.dueDate, today)}
          </span>
        )}
        {project.openCount === 0 && project.totalCount > 0 && status === "active" && (
          <span className="text-[12px] text-success">Все задачи закрыты</span>
        )}
      </div>
    </Link>
  );
}

export function AreaCard({ area }: { area: AreaWithCounts }) {
  return (
    <Link
      href={`/sfery/${area.id}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <EntityAvatar
        image={area.image}
        emoji={area.icon}
        color={area.color}
        name={area.name}
        size={44}
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-medium text-text">
          {area.name}
        </h3>
        <p className="mt-0.5 text-[12.5px] text-muted">
          {area.projectCount} проект. · {area.openTaskCount} задач
        </p>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
