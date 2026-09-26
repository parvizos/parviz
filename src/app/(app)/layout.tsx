import type { ReactNode } from "react";
import { UiProvider } from "@/components/app/ui-context";
import { PlayerProvider } from "@/components/app/player-context";
import { AppShell } from "@/components/app/AppShell";
import { currentWorkspace } from "@/db";
import { backupIfDue } from "@/lib/backup";
import { getBaseCurrency } from "@/lib/settings";
import { refreshRatesIfDue } from "@/lib/currency-actions";
import { postDuePlanned } from "@/lib/finance-actions";
import {
  getSidebarCounts,
  getAreasWithCounts,
  getAreaOptions,
  getProjectOptions,
  getSubjectOptions,
  getAccountOptions,
  getCategoryOptions,
  getPersonOptions,
  getOrganizationOptions,
  getPageTree,
} from "@/lib/queries";

// Данные читаются из БД на каждый запрос — не пытаемся пререндерить статически.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Автопроведение подписок/планов до чтения данных — свежие операции
  // сразу попадают в этот рендер (без revalidate во время рендера).
  await postDuePlanned().catch(() => {});
  // Мягкое автообновление курсов валют (не чаще раза в 6 ч, best-effort).
  await refreshRatesIfDue().catch(() => {});

  const [
    counts,
    areas,
    pageTree,
    areaOptions,
    projectOptions,
    subjectOptions,
    accountOptions,
    categoryOptions,
    personOptions,
    organizationOptions,
  ] = await Promise.all([
    getSidebarCounts(),
    getAreasWithCounts(),
    getPageTree(),
    getAreaOptions(),
    getProjectOptions(),
    getSubjectOptions(),
    getAccountOptions(),
    getCategoryOptions(),
    getPersonOptions(),
    getOrganizationOptions(),
  ]);

  // Ежедневный снимок базы (раз в день на процесс, best-effort).
  await backupIfDue().catch(() => {});

  const areaLinks = areas.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    icon: a.icon,
    image: a.image,
    openTaskCount: a.openTaskCount,
  }));

  return (
    <UiProvider
      areaOptions={areaOptions}
      projectOptions={projectOptions}
      subjectOptions={subjectOptions}
      accountOptions={accountOptions}
      categoryOptions={categoryOptions}
      personOptions={personOptions}
      organizationOptions={organizationOptions}
      pageOptions={pageTree.map((p) => ({ id: p.id, title: p.title, icon: p.icon }))}
      baseCurrency={await getBaseCurrency()}
    >
      <PlayerProvider>
        <AppShell
          counts={counts}
          areas={areaLinks}
          pages={pageTree}
          demo={currentWorkspace() === "demo"}
        >
          {children}
        </AppShell>
      </PlayerProvider>
    </UiProvider>
  );
}
