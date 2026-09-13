"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schemaReady } from "@/db";
import {
  areas,
  projects,
  tasks,
  PROJECT_STATUSES,
  TASK_STATUSES,
} from "@/db/schema";

function revalidateAll() {
  // Данные пронизывают всё приложение (счётчики в меню, списки) — обновляем целиком.
  revalidatePath("/", "layout");
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

const nullableId = z.string().min(1).nullable().optional();

/* ───────────────────────  Задачи  ─────────────────────── */

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(500),
  notes: z.string().max(10_000).nullable().optional(),
  projectId: nullableId,
  areaId: nullableId,
  scheduledDate: isoDate,
  dueDate: isoDate,
  priority: z.coerce.number().int().min(0).max(3).optional(),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;

export async function createTask(input: CreateTaskInput) {
  await schemaReady();
  const data = createTaskSchema.parse(input);

  let areaId = data.areaId ?? null;
  // Задача в проекте наследует сферу проекта, чтобы всё сходилось по сферам.
  if (data.projectId) {
    const [proj] = await db
      .select({ areaId: projects.areaId })
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1);
    if (proj?.areaId && !areaId) areaId = proj.areaId;
  }

  const [row] = await db
    .insert(tasks)
    .values({
      title: data.title,
      notes: data.notes ?? null,
      projectId: data.projectId ?? null,
      areaId,
      scheduledDate: data.scheduledDate ?? null,
      dueDate: data.dueDate ?? null,
      priority: (data.priority ?? 0) as 0 | 1 | 2 | 3,
    })
    .returning({ id: tasks.id });

  revalidateAll();
  return row;
}

export async function toggleTask(id: string, done: boolean) {
  await schemaReady();
  await db
    .update(tasks)
    .set({
      status: done ? "done" : "open",
      completedAt: done ? new Date() : null,
    })
    .where(eq(tasks.id, id));
  revalidateAll();
}

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  notes: z.string().max(10_000).nullable().optional(),
  projectId: nullableId,
  areaId: nullableId,
  scheduledDate: isoDate,
  dueDate: isoDate,
  priority: z.coerce.number().int().min(0).max(3).optional(),
  status: z.enum(TASK_STATUSES).optional(),
});

export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export async function updateTask(id: string, input: UpdateTaskInput) {
  await schemaReady();
  const data = updateTaskSchema.parse(input);

  const patch: Record<string, unknown> = { ...data };
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.status) {
    patch.completedAt = data.status === "done" ? new Date() : null;
  }

  await db.update(tasks).set(patch).where(eq(tasks.id, id));
  revalidateAll();
}

export async function scheduleTask(id: string, dateISO: string | null) {
  await schemaReady();
  await db
    .update(tasks)
    .set({ scheduledDate: dateISO })
    .where(eq(tasks.id, id));
  revalidateAll();
}

export async function deleteTask(id: string) {
  await schemaReady();
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidateAll();
}

/* ───────────────────────  Проекты  ─────────────────────── */

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(300),
  notes: z.string().max(10_000).nullable().optional(),
  areaId: nullableId,
  dueDate: isoDate,
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;

export async function createProject(input: CreateProjectInput) {
  await schemaReady();
  const data = createProjectSchema.parse(input);
  const [row] = await db
    .insert(projects)
    .values({
      name: data.name,
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      dueDate: data.dueDate ?? null,
    })
    .returning({ id: projects.id });
  revalidateAll();
  return row;
}

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  notes: z.string().max(10_000).nullable().optional(),
  areaId: nullableId,
  dueDate: isoDate,
  status: z.enum(PROJECT_STATUSES).optional(),
});

export type UpdateProjectInput = z.input<typeof updateProjectSchema>;

export async function updateProject(id: string, input: UpdateProjectInput) {
  await schemaReady();
  const data = updateProjectSchema.parse(input);
  const patch: Record<string, unknown> = { ...data };
  if (data.status) {
    patch.completedAt = data.status === "done" ? new Date() : null;
  }
  await db.update(projects).set(patch).where(eq(projects.id, id));
  revalidateAll();
}

export async function deleteProject(id: string) {
  await schemaReady();
  // Задачи не удаляем: ссылка на проект обнулится (onDelete: set null).
  await db.delete(projects).where(eq(projects.id, id));
  revalidateAll();
}

/* ───────────────────────  Сферы  ─────────────────────── */

const createAreaSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(200),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
});

export type CreateAreaInput = z.input<typeof createAreaSchema>;

export async function createArea(input: CreateAreaInput) {
  await schemaReady();
  const data = createAreaSchema.parse(input);
  const [row] = await db
    .insert(areas)
    .values({
      name: data.name,
      color: data.color ?? null,
      icon: data.icon ?? null,
    })
    .returning({ id: areas.id });
  revalidateAll();
  return row;
}

const updateAreaSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
});

export type UpdateAreaInput = z.input<typeof updateAreaSchema>;

export async function updateArea(id: string, input: UpdateAreaInput) {
  await schemaReady();
  const data = updateAreaSchema.parse(input);
  await db.update(areas).set(data).where(eq(areas.id, id));
  revalidateAll();
}

export async function archiveArea(id: string) {
  await schemaReady();
  await db
    .update(areas)
    .set({ archivedAt: new Date() })
    .where(eq(areas.id, id));
  revalidateAll();
}

export async function deleteArea(id: string) {
  await schemaReady();
  await db.delete(areas).where(eq(areas.id, id));
  revalidateAll();
}
