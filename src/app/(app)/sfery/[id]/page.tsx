import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getArea,
  getAreaProjects,
  getAreaLooseTasks,
} from "@/lib/queries";
import { todayISO } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import { ProjectCard } from "@/components/app/cards";
import { TaskGroup } from "@/components/app/TaskGroup";
import { QuickAdd } from "@/components/app/QuickAdd";
import { EditAreaButton, NewProjectButton } from "@/components/app/buttons";
import { EmptyState } from "@/components/ui/misc";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getArea(id);
  return { title: a?.name ?? "Сфера" };
}

export default async function AreaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const area = await getArea(id);
  if (!area) notFound();

  const [projects, tasks] = await Promise.all([
    getAreaProjects(id),
    getAreaLooseTasks(id),
  ]);
  const today = todayISO();
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status !== "open");
  const empty = projects.length === 0 && tasks.length === 0;

  return (
    <div>
      <Link
        href="/sfery"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Сферы
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[20px]"
            style={{
              background: `color-mix(in oklab, ${areaColor(area.color)} 16%, transparent)`,
              color: areaColor(area.color),
            }}
          >
            {area.icon || area.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-text">
            {area.name}
          </h1>
        </div>
        <EditAreaButton
          area={{
            id: area.id,
            name: area.name,
            color: area.color,
            icon: area.icon,
          }}
        />
      </div>

      {empty ? (
        <EmptyState
          title="Сфера пока пустая"
          description="Добавь сюда проекты и задачи — всё, что относится к этой части жизни."
          action={<NewProjectButton defaultAreaId={id} />}
        />
      ) : (
        <>
          {/* Проекты */}
          <section className="mb-8">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                Проекты
                {projects.length > 0 && (
                  <span className="ml-2 text-faint tabular">
                    {projects.length}
                  </span>
                )}
              </h2>
              <NewProjectButton defaultAreaId={id}>Проект</NewProjectButton>
            </div>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    today={today}
                    showArea={false}
                  />
                ))}
              </div>
            ) : (
              <p className="px-1 text-[13.5px] text-faint">
                В этой сфере ещё нет проектов.
              </p>
            )}
          </section>

          {/* Задачи сферы */}
          <section>
            <div className="mb-2.5 px-1">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                Задачи сферы
              </h2>
            </div>
            <div className="mb-4">
              <QuickAdd
                prefill={{ areaId: id }}
                placeholder="Задача без проекта в этой сфере…"
              />
            </div>
            {open.length > 0 && (
              <TaskGroup
                tasks={open}
                today={today}
                showArea={false}
                showProject={false}
              />
            )}
            {done.length > 0 && (
              <TaskGroup
                title="Выполнено"
                count={done.length}
                tasks={done}
                today={today}
                showArea={false}
                showProject={false}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
