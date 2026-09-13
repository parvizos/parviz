import type { ReactNode } from "react";
import { UiProvider } from "@/components/app/ui-context";
import { AppShell } from "@/components/app/AppShell";
import {
  getSidebarCounts,
  getAreasWithCounts,
  getAreaOptions,
  getProjectOptions,
  getSubjectOptions,
} from "@/lib/queries";

// Данные читаются из БД на каждый запрос — не пытаемся пререндерить статически.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [counts, areas, areaOptions, projectOptions, subjectOptions] =
    await Promise.all([
      getSidebarCounts(),
      getAreasWithCounts(),
      getAreaOptions(),
      getProjectOptions(),
      getSubjectOptions(),
    ]);

  const areaLinks = areas.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    icon: a.icon,
    openTaskCount: a.openTaskCount,
  }));

  return (
    <UiProvider
      areaOptions={areaOptions}
      projectOptions={projectOptions}
      subjectOptions={subjectOptions}
    >
      <AppShell counts={counts} areas={areaLinks}>
        {children}
      </AppShell>
    </UiProvider>
  );
}
