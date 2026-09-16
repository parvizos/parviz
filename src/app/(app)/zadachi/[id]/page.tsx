import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Folder, GraduationCap, User, Flag } from "lucide-react";
import { getTask } from "@/lib/queries";
import { todayISO, relativeLabel, dateTone } from "@/lib/dates";
import { PRIORITY_META, areaColor } from "@/lib/task-format";
import { cn } from "@/lib/cn";
import { BackLink } from "@/components/app/BackLink";
import { TaskPageHeader } from "@/components/app/TaskPageHeader";
import { EntityNotes } from "@/components/app/EntityNotes";

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
  const t = await getTask(id);
  return { title: t?.title ?? "Задача" };
}

const chip =
  "inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-[13px] transition-colors hover:border-border-strong hover:bg-surface-2";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();

  const today = todayISO();
  const date = task.scheduledDate ?? task.dueDate;
  const tone = date ? dateTone(date, today) : "future";
  const prio = PRIORITY_META[task.priority];

  return (
    <div>
      <BackLink label="Назад" />
      <TaskPageHeader task={task} />

      <div className="mb-5 flex flex-wrap gap-2">
        {date && (
          <span className={cn(chip, DATE_TONE[tone])}>
            <CalendarDays size={14} />
            {relativeLabel(date, today)}
            {task.scheduledDate && task.scheduledTime && (
              <span className="tabular">, {task.scheduledTime}</span>
            )}
          </span>
        )}
        {task.projectName && task.projectId && (
          <Link href={`/proekty/${task.projectId}`} className={`${chip} text-muted`}>
            <Folder size={14} />
            {task.projectName}
          </Link>
        )}
        {task.subjectName && task.subjectId && (
          <Link href={`/predmety/${task.subjectId}`} className={`${chip} text-muted`}>
            <GraduationCap size={14} />
            {task.subjectName}
          </Link>
        )}
        {task.personName && task.personId && (
          <Link href={`/lyudi/${task.personId}`} className={`${chip} text-muted`}>
            <User size={14} />
            {task.personName}
          </Link>
        )}
        {task.areaName && task.areaId && (
          <Link href={`/sfery/${task.areaId}`} className={`${chip} text-muted`}>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: areaColor(task.areaColor) }}
            />
            {task.areaName}
          </Link>
        )}
        {prio.color && (
          <span className={chip} style={{ color: prio.color }}>
            <Flag size={13} />
            {prio.label}
          </span>
        )}
      </div>

      {task.notes && (
        <p className="mb-6 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-[14px] leading-relaxed text-muted">
          {task.notes}
        </p>
      )}

      {/* Описание — свободный текст с фото */}
      <EntityNotes
        kind="task"
        id={id}
        initialHTML={task.body ?? ""}
        title="Описание"
        placeholder="Всё по задаче: детали, чек-лист, ссылки и фото… Жми «/» или перетащи фото."
      />
    </div>
  );
}
