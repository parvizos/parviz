"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schemaReady } from "@/db";
import { todayISO } from "@/lib/dates";
import {
  areas,
  projects,
  tasks,
  subjects,
  lessons,
  notes,
  journal,
  accounts,
  categories,
  transactions,
  organizations,
  people,
  meetings,
  pages,
  PROJECT_STATUSES,
  TASK_STATUSES,
  LESSON_KINDS,
  ACCOUNT_KINDS,
  CATEGORY_KINDS,
  TRANSACTION_KINDS,
  ORG_KINDS,
  SOCIAL_KINDS,
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

const isoTime = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .nullable()
  .optional();

/* ───────────────────────  Задачи  ─────────────────────── */

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(500),
  notes: z.string().max(10_000).nullable().optional(),
  projectId: nullableId,
  areaId: nullableId,
  subjectId: nullableId,
  personId: nullableId,
  scheduledDate: isoDate,
  scheduledTime: isoTime,
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
      personId: data.personId ?? null,
      scheduledDate: data.scheduledDate ?? null,
      // Время без даты не имеет смысла.
      scheduledTime: data.scheduledDate ? data.scheduledTime ?? null : null,
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
  personId: nullableId,
  scheduledDate: isoDate,
  scheduledTime: isoTime,
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
  // Убрали дату — время напоминания тоже снимаем.
  if (data.scheduledDate === null) patch.scheduledTime = null;
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
  credits: z.coerce.number().int().min(0).max(100).nullable().optional(),
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
      credits: data.credits ?? null,
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
  credits: z.coerce.number().int().min(0).max(100).nullable().optional(),
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
  title: z.string().trim().max(300).optional(),
  body: z.string().max(200_000).nullable().optional(),
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
      title: data.title ?? "",
      body: data.body ?? null,
      subjectId: data.subjectId ?? null,
      pinned: data.pinned ?? false,
    })
    .returning({ id: notes.id });
  revalidateAll();
  return row;
}

/** Тихое авто-сохранение конспекта из полноэкранного редактора (без ревалидации). */
export async function autosaveNote(
  id: string,
  input: { title?: string; body?: string | null },
) {
  await schemaReady();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.slice(0, 300);
  if (input.body !== undefined) patch.body = input.body ?? null;
  if (Object.keys(patch).length === 0) return;
  patch.updatedAt = new Date();
  await db.update(notes).set(patch).where(eq(notes.id, id));
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

/* ───────────────────────  Ежедневник  ─────────────────────── */

const upsertJournalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.coerce.number().int().min(1).max(5).nullable().optional(),
  body: z.string().max(200_000).nullable().optional(),
  tags: z.array(z.string().max(30)).max(16).nullable().optional(),
});

export type UpsertJournalInput = {
  mood?: number | null;
  body?: string | null;
};

/** Создать или обновить запись за день (одна запись на дату). */
export async function upsertJournal(date: string, input: UpsertJournalInput) {
  await schemaReady();
  const data = upsertJournalSchema.parse({ date, ...input });
  await db
    .insert(journal)
    .values({
      date: data.date,
      mood: data.mood ?? null,
      body: data.body ?? null,
    })
    .onConflictDoUpdate({
      target: journal.date,
      set: {
        mood: data.mood ?? null,
        body: data.body ?? null,
        updatedAt: new Date(),
      },
    });
  revalidateAll();
}

/** Тихое авто-сохранение записи дня (без ревалидации всего приложения). */
export async function autosaveJournal(
  date: string,
  input: { mood?: number | null; body?: string | null; tags?: string[] | null },
) {
  await schemaReady();
  const data = upsertJournalSchema.parse({ date, ...input });
  const tags = data.tags && data.tags.length > 0 ? data.tags : null;
  await db
    .insert(journal)
    .values({
      date: data.date,
      mood: data.mood ?? null,
      body: data.body ?? null,
      tags,
    })
    .onConflictDoUpdate({
      target: journal.date,
      set: {
        mood: data.mood ?? null,
        body: data.body ?? null,
        tags,
        updatedAt: new Date(),
      },
    });
}

/* ───────────────────────  Счета  ─────────────────────── */

const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(120),
  kind: z.enum(ACCOUNT_KINDS).optional(),
  currency: z.string().max(8).optional(),
  openingBalance: z.coerce.number().int().optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
});

export type CreateAccountInput = z.input<typeof createAccountSchema>;

export async function createAccount(input: CreateAccountInput) {
  await schemaReady();
  const data = createAccountSchema.parse(input);
  const [row] = await db
    .insert(accounts)
    .values({
      name: data.name,
      kind: data.kind ?? "card",
      currency: data.currency ?? "RUB",
      openingBalance: data.openingBalance ?? 0,
      color: data.color ?? null,
      icon: data.icon ?? null,
    })
    .returning({ id: accounts.id });
  revalidateAll();
  return row;
}

const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  kind: z.enum(ACCOUNT_KINDS).optional(),
  currency: z.string().max(8).optional(),
  openingBalance: z.coerce.number().int().optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
});

export type UpdateAccountInput = z.input<typeof updateAccountSchema>;

export async function updateAccount(id: string, input: UpdateAccountInput) {
  await schemaReady();
  const data = updateAccountSchema.parse(input);
  await db.update(accounts).set(data).where(eq(accounts.id, id));
  revalidateAll();
}

export async function deleteAccount(id: string) {
  await schemaReady();
  // Операции по счёту удалятся каскадом.
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidateAll();
}

/* ───────────────────────  Категории  ─────────────────────── */

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(120),
  kind: z.enum(CATEGORY_KINDS).optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
  monthlyBudget: z.coerce.number().int().min(0).nullable().optional(),
});

export type CreateCategoryInput = z.input<typeof createCategorySchema>;

export async function createCategory(input: CreateCategoryInput) {
  await schemaReady();
  const data = createCategorySchema.parse(input);
  const [row] = await db
    .insert(categories)
    .values({
      name: data.name,
      kind: data.kind ?? "expense",
      color: data.color ?? null,
      icon: data.icon ?? null,
      monthlyBudget: data.monthlyBudget ?? null,
    })
    .returning({ id: categories.id });
  revalidateAll();
  return row;
}

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  kind: z.enum(CATEGORY_KINDS).optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
  monthlyBudget: z.coerce.number().int().min(0).nullable().optional(),
});

export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await schemaReady();
  const data = updateCategorySchema.parse(input);
  await db.update(categories).set(data).where(eq(categories.id, id));
  revalidateAll();
}

export async function deleteCategory(id: string) {
  await schemaReady();
  await db.delete(categories).where(eq(categories.id, id));
  revalidateAll();
}

/* ───────────────────────  Операции  ─────────────────────── */

const createTransactionSchema = z.object({
  accountId: z.string().min(1, "Выберите счёт"),
  toAccountId: nullableId,
  categoryId: nullableId,
  kind: z.enum(TRANSACTION_KINDS),
  amount: z.coerce.number().int().positive("Введите сумму"),
  /** Кросс-валютный перевод: сумма зачисления в валюте счёта-получателя. */
  amountTo: z.coerce.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).nullable().optional(),
  areaId: nullableId,
  projectId: nullableId,
  subjectId: nullableId,
  personId: nullableId,
});

export type CreateTransactionInput = z.input<typeof createTransactionSchema>;

function normalizeTx(data: {
  kind: (typeof TRANSACTION_KINDS)[number];
  toAccountId?: string | null;
  categoryId?: string | null;
}) {
  if (data.kind === "transfer") {
    return { toAccountId: data.toAccountId ?? null, categoryId: null };
  }
  return { toAccountId: null, categoryId: data.categoryId ?? null };
}

export async function createTransaction(input: CreateTransactionInput) {
  await schemaReady();
  const data = createTransactionSchema.parse(input);
  const norm = normalizeTx(data);
  if (data.kind === "transfer" && !norm.toAccountId) {
    throw new Error("Для перевода нужен счёт-получатель");
  }
  const [row] = await db
    .insert(transactions)
    .values({
      accountId: data.accountId,
      toAccountId: norm.toAccountId,
      categoryId: norm.categoryId,
      kind: data.kind,
      amount: data.amount,
      amountTo: data.kind === "transfer" ? data.amountTo ?? null : null,
      date: data.date,
      note: data.note ?? null,
      areaId: data.areaId ?? null,
      projectId: data.projectId ?? null,
      subjectId: data.subjectId ?? null,
      personId: data.kind === "transfer" ? null : data.personId ?? null,
    })
    .returning({ id: transactions.id });
  revalidateAll();
  return row;
}

const updateTransactionSchema = z.object({
  accountId: z.string().min(1).optional(),
  toAccountId: nullableId,
  categoryId: nullableId,
  kind: z.enum(TRANSACTION_KINDS).optional(),
  amount: z.coerce.number().int().positive().optional(),
  amountTo: z.coerce.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(500).nullable().optional(),
  areaId: nullableId,
  projectId: nullableId,
  subjectId: nullableId,
  personId: nullableId,
});

export type UpdateTransactionInput = z.input<typeof updateTransactionSchema>;

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
) {
  await schemaReady();
  const data = updateTransactionSchema.parse(input);
  const patch: Record<string, unknown> = { ...data };
  if (data.kind) {
    const norm = normalizeTx({
      kind: data.kind,
      toAccountId: data.toAccountId,
      categoryId: data.categoryId,
    });
    patch.toAccountId = norm.toAccountId;
    patch.categoryId = norm.categoryId;
    if (data.kind === "transfer") patch.personId = null;
    // amountTo имеет смысл только для перевода.
    else patch.amountTo = null;
  }
  await db.update(transactions).set(patch).where(eq(transactions.id, id));
  revalidateAll();
}

export async function deleteTransaction(id: string) {
  await schemaReady();
  await db.delete(transactions).where(eq(transactions.id, id));
  revalidateAll();
}

/* ───────────────────────  Организации  ─────────────────────── */

const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(160),
  kind: z.enum(ORG_KINDS).optional(),
  note: z.string().max(2000).nullable().optional(),
  url: z.string().max(300).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
});

export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;

export async function createOrganization(input: CreateOrganizationInput) {
  await schemaReady();
  const data = createOrganizationSchema.parse(input);
  const [row] = await db
    .insert(organizations)
    .values({
      name: data.name,
      kind: data.kind ?? "other",
      note: data.note ?? null,
      url: data.url ?? null,
      color: data.color ?? null,
      icon: data.icon ?? null,
    })
    .returning({ id: organizations.id });
  revalidateAll();
  return row;
}

const updateOrganizationSchema = createOrganizationSchema.partial();
export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;

export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput,
) {
  await schemaReady();
  const data = updateOrganizationSchema.parse(input);
  await db.update(organizations).set(data).where(eq(organizations.id, id));
  revalidateAll();
}

export async function deleteOrganization(id: string) {
  await schemaReady();
  // У людей ссылка на организацию обнулится (set null).
  await db.delete(organizations).where(eq(organizations.id, id));
  revalidateAll();
}

/* ───────────────────────  Люди  ─────────────────────── */

const createPersonSchema = z.object({
  name: z.string().trim().min(1, "Введите имя").max(160),
  role: z.string().max(160).nullable().optional(),
  organizationId: nullableId,
  phone: z.string().max(64).nullable().optional(),
  email: z.string().max(160).nullable().optional(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  note: z.string().max(4000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
  avatar: z.string().max(512).nullable().optional(),
  socials: z
    .array(
      z.object({
        kind: z.enum(SOCIAL_KINDS),
        value: z.string().trim().min(1).max(400),
      }),
    )
    .nullable()
    .optional(),
});

export type CreatePersonInput = z.input<typeof createPersonSchema>;

export async function createPerson(input: CreatePersonInput) {
  await schemaReady();
  const data = createPersonSchema.parse(input);
  const [row] = await db
    .insert(people)
    .values({
      name: data.name,
      role: data.role ?? null,
      organizationId: data.organizationId ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      birthday: data.birthday ?? null,
      note: data.note ?? null,
      color: data.color ?? null,
      icon: data.icon ?? null,
      avatar: data.avatar ?? null,
      socials: data.socials?.length ? data.socials : null,
    })
    .returning({ id: people.id });
  revalidateAll();
  return row;
}

const updatePersonSchema = createPersonSchema.partial();
export type UpdatePersonInput = z.input<typeof updatePersonSchema>;

export async function updatePerson(id: string, input: UpdatePersonInput) {
  await schemaReady();
  const data = updatePersonSchema.parse(input);
  if (Array.isArray(data.socials) && data.socials.length === 0) {
    data.socials = null;
  }
  await db.update(people).set(data).where(eq(people.id, id));
  revalidateAll();
}

/* ── Встречи ── */

const createMeetingSchema = z.object({
  title: z.string().trim().max(300).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  personId: nullableId,
  location: z.string().max(200).nullable().optional(),
  body: z.string().max(200_000).nullable().optional(),
});
export type CreateMeetingInput = z.input<typeof createMeetingSchema>;

export async function createMeeting(input: CreateMeetingInput = {}) {
  await schemaReady();
  const data = createMeetingSchema.parse(input);
  const [row] = await db
    .insert(meetings)
    .values({
      title: data.title ?? "",
      date: data.date ?? todayISO(),
      personId: data.personId ?? null,
      location: data.location ?? null,
      body: data.body ?? null,
    })
    .returning({ id: meetings.id });
  revalidateAll();
  return row;
}

/** Тихое авто-сохранение встречи из редактора (без ревалидации). */
export async function autosaveMeeting(
  id: string,
  input: { title?: string; body?: string | null },
) {
  await schemaReady();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.slice(0, 300);
  if (input.body !== undefined) patch.body = input.body ?? null;
  if (Object.keys(patch).length === 0) return;
  patch.updatedAt = new Date();
  await db.update(meetings).set(patch).where(eq(meetings.id, id));
}

/* ──────────  База знаний: свободное описание с фото у сущностей  ────────── */

export type NotableKind =
  | "person"
  | "project"
  | "area"
  | "subject"
  | "lesson"
  | "task"
  | "organization";

/**
 * Автосохранение «базы знаний» (HTML из того же редактора, что и конспекты)
 * для любой сущности. Без revalidate — чтобы не дёргать рендер при наборе.
 */
export async function autosaveEntityBody(
  kind: NotableKind,
  id: string,
  html: string,
) {
  await schemaReady();
  const body = html.length > 200_000 ? html.slice(0, 200_000) : html;
  const patch = { body: body || null, updatedAt: new Date() };
  switch (kind) {
    case "person":
      await db.update(people).set(patch).where(eq(people.id, id));
      break;
    case "project":
      await db.update(projects).set(patch).where(eq(projects.id, id));
      break;
    case "area":
      await db.update(areas).set(patch).where(eq(areas.id, id));
      break;
    case "subject":
      await db.update(subjects).set(patch).where(eq(subjects.id, id));
      break;
    case "lesson":
      await db.update(lessons).set(patch).where(eq(lessons.id, id));
      break;
    case "task":
      await db.update(tasks).set(patch).where(eq(tasks.id, id));
      break;
    case "organization":
      await db.update(organizations).set(patch).where(eq(organizations.id, id));
      break;
  }
}

const updateMeetingSchema = z.object({
  title: z.string().trim().max(300).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  personId: nullableId,
  location: z.string().max(200).nullable().optional(),
  body: z.string().max(200_000).nullable().optional(),
});
export type UpdateMeetingInput = z.input<typeof updateMeetingSchema>;

export async function updateMeeting(id: string, input: UpdateMeetingInput) {
  await schemaReady();
  const data = updateMeetingSchema.parse(input);
  await db.update(meetings).set(data).where(eq(meetings.id, id));
  revalidateAll();
}

export async function deleteMeeting(id: string) {
  await schemaReady();
  await db.delete(meetings).where(eq(meetings.id, id));
  revalidateAll();
}

export async function deletePerson(id: string) {
  await schemaReady();
  await db.delete(people).where(eq(people.id, id));
  revalidateAll();
}

export async function togglePersonFavorite(id: string, favorite: boolean) {
  await schemaReady();
  await db.update(people).set({ favorite }).where(eq(people.id, id));
  revalidateAll();
}

/* ───────────────────────  Блокнот (страницы)  ─────────────────────── */

/** Создать страницу. `parentId` — вложить в родителя, иначе верхний уровень. */
export async function createPage(input?: {
  parentId?: string | null;
  title?: string;
}): Promise<string> {
  await schemaReady();
  const parentId = input?.parentId ?? null;
  // Позиция — в конец списка соседей.
  const siblings = await db
    .select({ position: pages.position })
    .from(pages)
    .where(parentId ? eq(pages.parentId, parentId) : isNull(pages.parentId));
  const position = siblings.reduce((m, s) => Math.max(m, s.position), -1) + 1;
  const [row] = await db
    .insert(pages)
    .values({ parentId, title: (input?.title ?? "").slice(0, 500), position })
    .returning({ id: pages.id });
  revalidateAll();
  return row.id;
}

const updatePageSchema = z.object({
  title: z.string().max(500).optional(),
  icon: z.string().max(20).nullable().optional(),
  cover: z.string().max(2000).nullable().optional(),
});
export type UpdatePageInput = z.input<typeof updatePageSchema>;

/** Заголовок и иконка попадают в сайдбар — обновляем разметку. */
export async function updatePage(id: string, input: UpdatePageInput) {
  await schemaReady();
  const data = updatePageSchema.parse(input);
  if (Object.keys(data).length === 0) return;
  await db
    .update(pages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(pages.id, id));
  revalidateAll();
}

/** В избранное / из избранного — обновляем сайдбар. */
export async function togglePageFavorite(id: string, favorite: boolean) {
  await schemaReady();
  await db
    .update(pages)
    .set({ favorite, updatedAt: new Date() })
    .where(eq(pages.id, id));
  revalidateAll();
}

/** Тело в сайдбаре не показывается — без ревалидации, чтобы не мигало при печати. */
export async function autosavePageBody(id: string, html: string) {
  await schemaReady();
  const body = html.length > 200_000 ? html.slice(0, 200_000) : html;
  await db
    .update(pages)
    .set({ body: body || null, updatedAt: new Date() })
    .where(eq(pages.id, id));
}

/**
 * Перемещает страницу: меняет родителя и/или порядок среди соседей.
 * `beforeId` — вставить перед этой страницей (null/остутствует — в конец).
 * Защита от цикла: нельзя вложить страницу в себя или своего потомка.
 */
export async function movePage(
  id: string,
  target: { parentId: string | null; beforeId?: string | null },
) {
  await schemaReady();
  const all = await db
    .select({
      id: pages.id,
      parentId: pages.parentId,
      position: pages.position,
      createdAt: pages.createdAt,
    })
    .from(pages)
    .where(isNull(pages.archivedAt));
  const self = all.find((p) => p.id === id);
  if (!self) return;
  const parentId = target.parentId ?? null;
  if (parentId === id) return;

  // Собираем потомков перемещаемой страницы — в них вкладывать нельзя.
  const childrenOf = new Map<string, string[]>();
  for (const p of all) {
    if (!p.parentId) continue;
    const arr = childrenOf.get(p.parentId) ?? [];
    arr.push(p.id);
    childrenOf.set(p.parentId, arr);
  }
  const descendants = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const kid of childrenOf.get(cur) ?? []) {
      if (!descendants.has(kid)) {
        descendants.add(kid);
        stack.push(kid);
      }
    }
  }
  if (parentId && descendants.has(parentId)) return;

  // Соседи новой ветки (без самой страницы), в текущем порядке.
  const siblings = all
    .filter((p) => p.parentId === parentId && p.id !== id)
    .sort(
      (a, b) =>
        a.position - b.position ||
        (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
    );
  let index = siblings.length;
  if (target.beforeId && target.beforeId !== id) {
    const i = siblings.findIndex((s) => s.id === target.beforeId);
    if (i >= 0) index = i;
  }
  siblings.splice(index, 0, self);

  await Promise.all(
    siblings.map((p, i) =>
      db
        .update(pages)
        .set(
          p.id === id
            ? { parentId, position: i, updatedAt: new Date() }
            : { position: i },
        )
        .where(eq(pages.id, p.id)),
    ),
  );
  revalidateAll();
}

/** Удаляет страницу вместе со всеми вложенными (каскад по коду). */
export async function deletePage(id: string) {
  await schemaReady();
  const all = await db
    .select({ id: pages.id, parentId: pages.parentId })
    .from(pages);
  const childrenOf = new Map<string, string[]>();
  for (const p of all) {
    if (!p.parentId) continue;
    const arr = childrenOf.get(p.parentId) ?? [];
    arr.push(p.id);
    childrenOf.set(p.parentId, arr);
  }
  const toDelete: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    toDelete.push(cur);
    const kids = childrenOf.get(cur);
    if (kids) stack.push(...kids);
  }
  await db.delete(pages).where(inArray(pages.id, toDelete));
  revalidateAll();
}
