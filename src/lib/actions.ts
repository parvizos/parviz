"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schemaReady } from "@/db";
import {
  areas,
  projects,
  tasks,
  subjects,
  lessons,
  notes,
  PROJECT_STATUSES,
  TASK_STATUSES,
  LESSON_KINDS,
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
  subjectId: nullableId,
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
  // Домашка по предмету наследует сферу предмета.
  if (data.subjectId && !areaId) {
    const [subj] = await db
      .select({ areaId: subjects.areaId })
      .from(subjects)
      .where(eq(subjects.id, data.subjectId))
      .limit(1);
    if (subj?.areaId) areaId = subj.areaId;
  }

  const [row] = await db
    .insert(tasks)
    .values({
      title: data.title,
      notes: data.notes ?? null,
      projectId: data.projectId ?? null,
      areaId,
      subjectId: data.subjectId ?? null,
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
  subjectId: nullableId,
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

/* ───────────────────────  Предметы  ─────────────────────── */

const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(200),
  teacher: z.string().max(200).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
  areaId: nullableId,
});

export type CreateSubjectInput = z.input<typeof createSubjectSchema>;

export async function createSubject(input: CreateSubjectInput) {
  await schemaReady();
  const data = createSubjectSchema.parse(input);
  const [row] = await db
    .insert(subjects)
    .values({
      name: data.name,
      teacher: data.teacher ?? null,
      color: data.color ?? null,
      icon: data.icon ?? null,
      areaId: data.areaId ?? null,
    })
    .returning({ id: subjects.id });
  revalidateAll();
  return row;
}

const updateSubjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  teacher: z.string().max(200).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
  areaId: nullableId,
});

export type UpdateSubjectInput = z.input<typeof updateSubjectSchema>;

export async function updateSubject(id: string, input: UpdateSubjectInput) {
  await schemaReady();
  const data = updateSubjectSchema.parse(input);
  await db.update(subjects).set(data).where(eq(subjects.id, id));
  revalidateAll();
}

export async function deleteSubject(id: string) {
  await schemaReady();
  // Занятия удалятся каскадом; у задач и конспектов ссылка обнулится.
  await db.delete(subjects).where(eq(subjects.id, id));
  revalidateAll();
}

/* ───────────────────────  Занятия (расписание)  ─────────────────────── */

const timeStr = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .nullable()
  .optional();

const createLessonSchema = z.object({
  subjectId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startTime: timeStr,
  endTime: timeStr,
  location: z.string().max(120).nullable().optional(),
  kind: z.enum(LESSON_KINDS).optional(),
  note: z.string().max(2000).nullable().optional(),
});

export type CreateLessonInput = z.input<typeof createLessonSchema>;

export async function createLesson(input: CreateLessonInput) {
  await schemaReady();
  const data = createLessonSchema.parse(input);
  const [row] = await db
    .insert(lessons)
    .values({
      subjectId: data.subjectId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      location: data.location ?? null,
      kind: data.kind ?? "lecture",
      note: data.note ?? null,
    })
    .returning({ id: lessons.id });
  revalidateAll();
  return row;
}

const updateLessonSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7).optional(),
  startTime: timeStr,
  endTime: timeStr,
  location: z.string().max(120).nullable().optional(),
  kind: z.enum(LESSON_KINDS).optional(),
  note: z.string().max(2000).nullable().optional(),
});

export type UpdateLessonInput = z.input<typeof updateLessonSchema>;

export async function updateLesson(id: string, input: UpdateLessonInput) {
  await schemaReady();
  const data = updateLessonSchema.parse(input);
  await db.update(lessons).set(data).where(eq(lessons.id, id));
  revalidateAll();
}

export async function deleteLesson(id: string) {
  await schemaReady();
  await db.delete(lessons).where(eq(lessons.id, id));
  revalidateAll();
}

/* ───────────────────────  Конспекты  ─────────────────────── */

const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Введите заголовок").max(300),
  body: z.string().max(50_000).nullable().optional(),
  subjectId: nullableId,
  pinned: z.boolean().optional(),
});

export type CreateNoteInput = z.input<typeof createNoteSchema>;

export async function createNote(input: CreateNoteInput) {
  await schemaReady();
  const data = createNoteSchema.parse(input);
  const [row] = await db
    .insert(notes)
    .values({
      title: data.title,
      body: data.body ?? null,
      subjectId: data.subjectId ?? null,
      pinned: data.pinned ?? false,
    })
    .returning({ id: notes.id });
  revalidateAll();
  return row;
}

const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  body: z.string().max(50_000).nullable().optional(),
  subjectId: nullableId,
  pinned: z.boolean().optional(),
});

export type UpdateNoteInput = z.input<typeof updateNoteSchema>;

export async function updateNote(id: string, input: UpdateNoteInput) {
  await schemaReady();
  const data = updateNoteSchema.parse(input);
  await db.update(notes).set(data).where(eq(notes.id, id));
  revalidateAll();
}

export async function toggleNotePin(id: string, pinned: boolean) {
  await schemaReady();
  await db.update(notes).set({ pinned }).where(eq(notes.id, id));
  revalidateAll();
}

export async function deleteNote(id: string) {
  await schemaReady();
  await db.delete(notes).where(eq(notes.id, id));
  revalidateAll();
}
