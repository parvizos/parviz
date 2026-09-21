import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2 } from "lucide-react";
import { getProject, getProjectTasks, getBacklinks } from "@/lib/queries";
import { todayISO, relativeLabel, dateTone } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { areaColor, PROJECT_STATUS_META } from "@/lib/task-format";
import { TaskGroup } from "@/components/app/TaskGroup";
import { QuickAdd } from "@/components/app/QuickAdd";
import { EditProjectButton } from "@/components/app/buttons";
import { EntityNotes } from "@/components/app/EntityNotes";
import { Backlinks } from "@/components/app/Backlinks";
import { EmptyState } from "@/components/ui/misc";

export const dynamic = "force-dynamic";

const DATE_TONE: Record<string, string> = {
  overdue: "text-danger",
  today: "text-accent-soft-text",
  soon: "text-warning",
  future: "text-muted",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getProject(id);
  return { title: p?.name ?? "Проект" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [tasks, backlinks] = await Promise.all([
    getProjectTasks(id),
    getBacklinks(id),
  ]);
  const today = todayISO();
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status !== "open");
  const statusMeta = PROJECT_STATUS_META[project.status];
  const total = tasks.length;
  const ratio = total > 0 ? done.length / total : 0;

  return (
    <div>
      <Link
        href="/proekty"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Проекты
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-text">
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[13px]">
            {project.areaId && project.areaName && (
              <Link
                href={`/sfery/${project.areaId}`}
                className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-text"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: areaColor(project.areaColor) }}
                />
                {project.areaName}
              </Link>
            )}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[12px] font-medium",
                statusMeta.tone === "done"
                  ? "bg-success-soft text-success"
                  : statusMeta.tone === "active"
                    ? "bg-accent-soft text-accent-soft-text"
                    : "bg-surface-2 text-muted",
              )}
            >
              {statusMeta.label}
            </span>
            {project.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  DATE_TONE[dateTone(project.dueDate, today)],
                )}
              >
                <CalendarDays size={14} />
                {relativeLabel(project.dueDate, today)}
              </span>
            )}
          </div>
        </div>
        <EditProjectButton
          project={{
            id: project.id,
            name: project.name,
            notes: project.notes,
            areaId: project.areaId,
            dueDate: project.dueDate,
            status: project.status,
          }}
        />
      </div>

      {project.notes && (
        <p className="mb-5 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-[14px] leading-relaxed text-muted">
          {project.notes}
        </p>
      )}

      {/* О проекте — свободное описание с фото */}
      <div className="mb-6">
        <EntityNotes
          kind="project"
          id={id}
          initialHTML={project.body ?? ""}
          title="О проекте"
          placeholder="Цель, план, ссылки, важные детали и фото… Перетащи фото или жми «/»."
        />
      </div>

      {/* Где упоминается */}
      <Backlinks items={backlinks} title="Упоминается" />

      {total > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
          <span className="text-[12.5px] text-muted tabular">
            {done.length} из {total}
          </span>
        </div>
      )}

      <div className="mb-6">
        <QuickAdd prefill={{ projectId: id }} placeholder="Добавить задачу в проект…" />
      </div>

      {open.length > 0 && (
        <TaskGroup
          tasks={open}
          today={today}
          showProject={false}
          showArea={false}
        />
      )}

      {done.length > 0 && (
        <TaskGroup
          title="Выполнено"
          count={done.length}
          tasks={done}
          today={today}
          showProject={false}
          showArea={false}
        />
      )}

      {total === 0 && (
        <EmptyState
          icon={<CheckCircle2 size={22} />}
          title="В проекте пока нет задач"
          description="Разбей проект на конкретные шаги — добавь первую задачу выше."
        />
      )}
    </div>
  );
}
