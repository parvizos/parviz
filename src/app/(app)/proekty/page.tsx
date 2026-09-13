import { FolderKanban } from "lucide-react";
import { getProjectsWithCounts } from "@/lib/queries";
import { todayISO } from "@/lib/dates";
import { ProjectCard } from "@/components/app/cards";
import { NewProjectButton } from "@/components/app/buttons";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Проекты" };

export default async function ProjectsPage() {
  const today = todayISO();
  const projects = await getProjectsWithCounts();

  return (
    <div>
      <PageHeader
        title="Проекты"
        subtitle="Многошаговые дела с результатом."
        actions={<NewProjectButton />}
      />

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} today={today} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderKanban size={22} />}
          title="Пока нет проектов"
          description="Проект — это когда для результата нужно несколько шагов. Курсовая, переезд, запуск — всё сюда."
          action={<NewProjectButton />}
        />
      )}
    </div>
  );
}
