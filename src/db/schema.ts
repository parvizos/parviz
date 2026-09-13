import {
  integer,
  sqliteTable,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/*
 * ParvizOS — схема данных.
 *
 * Принцип: не восемь изолированных приложений, а одна связная модель.
 * Внутри домена связи выражены прямыми ссылками (task.projectId), а
 * между доменами — универсальной таблицей `links` (задача ↔ человек,
 * трата ↔ проект, конспект ↔ занятие). Благодаря этому новые домены
 * (финансы, люди, организации, учёба, ежедневник) подключаются к уже
 * существующим данным без переделки.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

/* ─────────────────────────  Общий хребет  ───────────────────────── */

/** Типы сущностей, участвующих в универсальных связях и тегах. */
export const ENTITY_TYPES = [
  "task",
  "project",
  "area",
  "note",
  "person",
  "organization",
  "transaction",
  "account",
  "subject",
  "lesson",
  "journal",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Теги — сквозные для всех доменов. */
export const tags = sqliteTable(
  "tags",
  {
    id: id(),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("tags_name_unq").on(t.name)],
);

/** Привязка тега к любой сущности. */
export const entityTags = sqliteTable(
  "entity_tags",
  {
    id: id(),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    entityType: text("entity_type").$type<EntityType>().notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("entity_tags_unq").on(t.tagId, t.entityType, t.entityId),
    index("entity_tags_entity_idx").on(t.entityType, t.entityId),
  ],
);

/** Универсальная связь между двумя любыми сущностями (кросс-доменная). */
export const links = sqliteTable(
  "links",
  {
    id: id(),
    fromType: text("from_type").$type<EntityType>().notNull(),
    fromId: text("from_id").notNull(),
    toType: text("to_type").$type<EntityType>().notNull(),
    toId: text("to_id").notNull(),
    /** Роль связи, напр. "относится", "оплата", "участник". */
    rel: text("rel"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("links_unq").on(
      t.fromType,
      t.fromId,
      t.toType,
      t.toId,
      t.rel,
    ),
    index("links_from_idx").on(t.fromType, t.fromId),
    index("links_to_idx").on(t.toType, t.toId),
  ],
);

/* ───────────────────────  Домен: Дела  ─────────────────────── */

/** Сфера жизни / зона ответственности: Учёба, Работа, Здоровье… */
export const areas = sqliteTable(
  "areas",
  {
    id: id(),
    name: text("name").notNull(),
    color: text("color"),
    icon: text("icon"),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("areas_position_idx").on(t.position)],
);

export const PROJECT_STATUSES = [
  "active",
  "paused",
  "someday",
  "done",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Проект — многошаговое дело с результатом. */
export const projects = sqliteTable(
  "projects",
  {
    id: id(),
    name: text("name").notNull(),
    notes: text("notes"),
    areaId: text("area_id").references(() => areas.id, {
      onDelete: "set null",
    }),
    status: text("status").$type<ProjectStatus>().notNull().default("active"),
    /** Дата дедлайна, только дата: YYYY-MM-DD. */
    dueDate: text("due_date"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("projects_area_idx").on(t.areaId),
    index("projects_status_idx").on(t.status),
  ],
);

export const TASK_STATUSES = ["open", "done", "canceled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Приоритет: 0 — без, 1 — низкий, 2 — средний, 3 — высокий. */
export const TASK_PRIORITIES = [0, 1, 2, 3] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** Задача — атомарное действие. Может стоять сама по себе или в проекте. */
export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    title: text("title").notNull(),
    notes: text("notes"),
    status: text("status").$type<TaskStatus>().notNull().default("open"),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    areaId: text("area_id").references(() => areas.id, {
      onDelete: "set null",
    }),
    /** Когда сделать (попадает в «Сегодня»/«Предстоящее»): YYYY-MM-DD. */
    scheduledDate: text("scheduled_date"),
    /** Крайний срок: YYYY-MM-DD. */
    dueDate: text("due_date"),
    priority: integer("priority").$type<TaskPriority>().notNull().default(0),
    position: integer("position").notNull().default(0),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tasks_status_idx").on(t.status),
    index("tasks_project_idx").on(t.projectId),
    index("tasks_area_idx").on(t.areaId),
    index("tasks_scheduled_idx").on(t.scheduledDate),
    index("tasks_due_idx").on(t.dueDate),
  ],
);

export type Area = typeof areas.$inferSelect;
export type NewArea = typeof areas.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Tag = typeof tags.$inferSelect;
