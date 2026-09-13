import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gt,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { areas, projects, tasks, type Task, type Area } from "@/db/schema";
import { todayISO } from "@/lib/dates";

export type TaskWithContext = Task & {
  projectName: string | null;
  areaName: string | null;
  areaColor: string | null;
};

const taskSelection = {
  ...getTableColumns(tasks),
  projectName: projects.name,
  areaName: areas.name,
  areaColor: areas.color,
};

function taskBaseQuery() {
  return db
    .select(taskSelection)
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(areas, eq(tasks.areaId, areas.id));
}

const openTask = eq(tasks.status, "open");

/** Входящие: открытые задачи без проекта, сферы и даты — то, что нужно разобрать. */
export async function getInboxTasks(): Promise<TaskWithContext[]> {
  await schemaReady();
  return taskBaseQuery()
    .where(
      and(
        openTask,
        isNull(tasks.projectId),
        isNull(tasks.areaId),
        isNull(tasks.scheduledDate),
      ),
    )
    .orderBy(desc(tasks.priority), asc(tasks.createdAt));
}

/** Сегодня: запланированные на сегодня и просроченные. */
export async function getTodayTasks(): Promise<{
  overdue: TaskWithContext[];
  today: TaskWithContext[];
}> {
  await schemaReady();
  const t = todayISO();
  const rows = await taskBaseQuery()
    .where(
      and(
        openTask,
        or(
          and(isNotNull(tasks.scheduledDate), lte(tasks.scheduledDate, t)),
          and(isNotNull(tasks.dueDate), lte(tasks.dueDate, t)),
        ),
      ),
    )
    .orderBy(desc(tasks.priority), asc(tasks.scheduledDate));

  const overdue: TaskWithContext[] = [];
  const today: TaskWithContext[] = [];
  for (const r of rows) {
    const eff = r.scheduledDate ?? r.dueDate ?? t;
    if (eff < t) overdue.push(r);
    else today.push(r);
  }
  return { overdue, today };
}

export type UpcomingGroup = { date: string; tasks: TaskWithContext[] };

/** Предстоящее: открытые задачи с датой позже сегодня, сгруппированные по дню. */
export async function getUpcomingTasks(): Promise<UpcomingGroup[]> {
  await schemaReady();
  const t = todayISO();
  const rows = await taskBaseQuery()
    .where(and(openTask, isNotNull(tasks.scheduledDate), gt(tasks.scheduledDate, t)))
    .orderBy(asc(tasks.scheduledDate), desc(tasks.priority));

  const groups = new Map<string, TaskWithContext[]>();
  for (const r of rows) {
    const key = r.scheduledDate!;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  return [...groups.entries()].map(([date, tasks]) => ({ date, tasks }));
}

/** Счётчики для бокового меню. */
export async function getSidebarCounts(): Promise<{
  inbox: number;
  today: number;
}> {
  await schemaReady();
  const t = todayISO();
  const [inboxRow] = await db
    .select({ c: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        openTask,
        isNull(tasks.projectId),
        isNull(tasks.areaId),
        isNull(tasks.scheduledDate),
      ),
    );
  const [todayRow] = await db
    .select({ c: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        openTask,
        or(
          and(isNotNull(tasks.scheduledDate), lte(tasks.scheduledDate, t)),
          and(isNotNull(tasks.dueDate), lte(tasks.dueDate, t)),
        ),
      ),
    );
  return { inbox: inboxRow?.c ?? 0, today: todayRow?.c ?? 0 };
}

/* ───────────────────────  Проекты  ─────────────────────── */

export type ProjectWithCounts = {
  id: string;
  name: string;
  notes: string | null;
  status: string;
  areaId: string | null;
  areaName: string | null;
  areaColor: string | null;
  dueDate: string | null;
  position: number;
  openCount: number;
  totalCount: number;
};

export async function getProjectsWithCounts(): Promise<ProjectWithCounts[]> {
  await schemaReady();
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      notes: projects.notes,
      status: projects.status,
      areaId: projects.areaId,
      areaName: areas.name,
      areaColor: areas.color,
      dueDate: projects.dueDate,
      position: projects.position,
      openCount: sql<number>`sum(case when ${tasks.status} = 'open' then 1 else 0 end)`,
      totalCount: sql<number>`count(${tasks.id})`,
    })
    .from(projects)
    .leftJoin(areas, eq(projects.areaId, areas.id))
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(ne(projects.status, "archived"))
    .groupBy(projects.id)
    .orderBy(asc(projects.position), asc(projects.createdAt));
  return rows;
}

export async function getProject(id: string) {
  await schemaReady();
  const [row] = await db
    .select({
      ...getTableColumns(projects),
      areaName: areas.name,
      areaColor: areas.color,
    })
    .from(projects)
    .leftJoin(areas, eq(projects.areaId, areas.id))
    .where(eq(projects.id, id))
    .limit(1);
  return row ?? null;
}

export async function getProjectTasks(id: string): Promise<TaskWithContext[]> {
  await schemaReady();
  return taskBaseQuery()
    .where(eq(tasks.projectId, id))
    .orderBy(
      // открытые вверх, выполненные вниз
      asc(sql`case when ${tasks.status} = 'open' then 0 else 1 end`),
      desc(tasks.priority),
      asc(tasks.position),
      asc(tasks.createdAt),
    );
}

/* ───────────────────────  Сферы  ─────────────────────── */

export type AreaWithCounts = Area & {
  projectCount: number;
  openTaskCount: number;
};

export async function getAreasWithCounts(): Promise<AreaWithCounts[]> {
  await schemaReady();
  const base = await db
    .select(getTableColumns(areas))
    .from(areas)
    .where(isNull(areas.archivedAt))
    .orderBy(asc(areas.position), asc(areas.createdAt));

  const projCounts = await db
    .select({ areaId: projects.areaId, c: sql<number>`count(*)` })
    .from(projects)
    .where(and(isNotNull(projects.areaId), ne(projects.status, "archived")))
    .groupBy(projects.areaId);

  const taskCounts = await db
    .select({ areaId: tasks.areaId, c: sql<number>`count(*)` })
    .from(tasks)
    .where(and(isNotNull(tasks.areaId), openTask))
    .groupBy(tasks.areaId);

  const pMap = new Map(projCounts.map((r) => [r.areaId, r.c]));
  const tMap = new Map(taskCounts.map((r) => [r.areaId, r.c]));

  return base.map((a) => ({
    ...a,
    projectCount: pMap.get(a.id) ?? 0,
    openTaskCount: tMap.get(a.id) ?? 0,
  }));
}

export async function getArea(id: string): Promise<Area | null> {
  await schemaReady();
  const [row] = await db.select().from(areas).where(eq(areas.id, id)).limit(1);
  return row ?? null;
}

export async function getAreaProjects(id: string): Promise<ProjectWithCounts[]> {
  const all = await getProjectsWithCounts();
  return all.filter((p) => p.areaId === id);
}

/** Задачи сферы, не привязанные к проекту. */
export async function getAreaLooseTasks(id: string): Promise<TaskWithContext[]> {
  await schemaReady();
  return taskBaseQuery()
    .where(and(eq(tasks.areaId, id), isNull(tasks.projectId)))
    .orderBy(
      asc(sql`case when ${tasks.status} = 'open' then 0 else 1 end`),
      desc(tasks.priority),
      asc(tasks.createdAt),
    );
}

/* ─────────────────  Справочники для форм  ───────────────── */

export async function getAreaOptions() {
  await schemaReady();
  return db
    .select({ id: areas.id, name: areas.name, color: areas.color })
    .from(areas)
    .where(isNull(areas.archivedAt))
    .orderBy(asc(areas.position), asc(areas.createdAt));
}

export async function getProjectOptions() {
  await schemaReady();
  return db
    .select({ id: projects.id, name: projects.name, areaId: projects.areaId })
    .from(projects)
    .where(ne(projects.status, "archived"))
    .orderBy(asc(projects.position), asc(projects.createdAt));
}
