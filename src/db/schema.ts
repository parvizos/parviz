import {
  integer,
  real,
  sqliteTable,
  text,
  blob,
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
  "debt",
  "goal",
  "planned",
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
    /** База знаний: свободное описание с фото (HTML из RichEditor). */
    body: text("body"),
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
    /** База знаний: свободное описание с фото (HTML из RichEditor). */
    body: text("body"),
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
    /** База знаний: свободное описание с фото (HTML из RichEditor). */
    body: text("body"),
    status: text("status").$type<TaskStatus>().notNull().default("open"),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    areaId: text("area_id").references(() => areas.id, {
      onDelete: "set null",
    }),
    /** Предмет (для домашки): задача, привязанная к дисциплине. */
    subjectId: text("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    /** Человек, с которым связана задача (встреча, звонок). */
    personId: text("person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    /** Когда сделать (попадает в «Сегодня»/«Предстоящее»): YYYY-MM-DD. */
    scheduledDate: text("scheduled_date"),
    /** Время напоминания к дате: HH:MM (пусто — весь день, без напоминания). */
    scheduledTime: text("scheduled_time"),
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
    index("tasks_subject_idx").on(t.subjectId),
    index("tasks_person_idx").on(t.personId),
    index("tasks_scheduled_idx").on(t.scheduledDate),
    index("tasks_due_idx").on(t.dueDate),
  ],
);

/* ───────────────────────  Домен: Учёба  ─────────────────────── */

/** Учебный предмет/дисциплина. */
export const subjects = sqliteTable(
  "subjects",
  {
    id: id(),
    name: text("name").notNull(),
    teacher: text("teacher"),
    color: text("color"),
    icon: text("icon"),
    /** База знаний: свободное описание с фото (HTML из RichEditor). */
    body: text("body"),
    areaId: text("area_id").references(() => areas.id, { onDelete: "set null" }),
    /** Кредиты/зач. единицы — для взвешенного среднего и недельной нагрузки. */
    credits: integer("credits"),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("subjects_position_idx").on(t.position)],
);

export const LESSON_KINDS = [
  "lecture",
  "seminar",
  "lab",
  "practice",
  "other",
] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

/** Занятие в расписании: еженедельное, по дню недели (ISO: 1 — Пн … 7 — Вс). */
export const lessons = sqliteTable(
  "lessons",
  {
    id: id(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    /** Время в формате "HH:MM". */
    startTime: text("start_time"),
    endTime: text("end_time"),
    location: text("location"),
    kind: text("kind").$type<LessonKind>().notNull().default("lecture"),
    note: text("note"),
    /** База знаний: свободное описание с фото (HTML из RichEditor). */
    body: text("body"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("lessons_subject_idx").on(t.subjectId),
    index("lessons_day_idx").on(t.dayOfWeek),
  ],
);

/** Конспект / заметка (блокнот). */
export const notes = sqliteTable(
  "notes",
  {
    id: id(),
    title: text("title").notNull(),
    body: text("body"),
    subjectId: text("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("notes_subject_idx").on(t.subjectId)],
);

/* Тип работы, за которую поставлена оценка. */
export const GRADE_KINDS = [
  "exam",
  "test",
  "homework",
  "quiz",
  "project",
  "other",
] as const;
export type GradeKind = (typeof GRADE_KINDS)[number];

/** Оценка по предмету: значение из maxValue, с весом и типом. */
export const grades = sqliteTable(
  "grades",
  {
    id: id(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    /** Полученный балл и максимум шкалы (по умолчанию 5). */
    value: real("value").notNull(),
    maxValue: real("max_value").notNull().default(5),
    /** Вес в среднем (экзамен весомее домашки). */
    weight: real("weight").notNull().default(1),
    kind: text("kind").$type<GradeKind>().notNull().default("other"),
    title: text("title"),
    date: text("date").notNull(),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("grades_subject_idx").on(t.subjectId),
    index("grades_date_idx").on(t.date),
  ],
);

export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;

/* Тип экзаменационного испытания. */
export const EXAM_KINDS = [
  "exam",
  "credit",
  "coursework",
  "retake",
  "other",
] as const;
export type ExamKind = (typeof EXAM_KINDS)[number];

/** Экзамен/зачёт в сессии: дата, готовность, результат. */
export const exams = sqliteTable(
  "exams",
  {
    id: id(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ExamKind>().notNull().default("exam"),
    date: text("date").notNull(),
    time: text("time"),
    location: text("location"),
    /** Получен «автомат». */
    autopass: integer("autopass", { mode: "boolean" }).notNull().default(false),
    /** Когда сдан (null — ещё предстоит). */
    passedAt: integer("passed_at", { mode: "timestamp_ms" }),
    /** Итоговая оценка, когда сдан. */
    grade: real("grade"),
    /** Готовность 0–100 (для полосы прогресса). */
    readiness: integer("readiness").notNull().default(0),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("exams_subject_idx").on(t.subjectId),
    index("exams_date_idx").on(t.date),
  ],
);

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;

/* Отметка посещения. */
export const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "excused",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Посещение конкретного занятия в конкретную дату. */
export const attendance = sqliteTable(
  "attendance",
  {
    id: id(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    /** Слот из расписания (может быть null для ручной отметки). */
    lessonId: text("lesson_id").references(() => lessons.id, {
      onDelete: "set null",
    }),
    date: text("date").notNull(),
    status: text("status").$type<AttendanceStatus>().notNull().default("present"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("attendance_subject_idx").on(t.subjectId),
    // Один отмеченный слот на дату — чтобы не плодить дубли (NULL-слоты не ограничены).
    uniqueIndex("attendance_slot_unq").on(t.lessonId, t.date),
  ],
);

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

/** Учебная сессия (таймер фокуса): сколько времени вложено в предмет. */
export const studySessions = sqliteTable(
  "study_sessions",
  {
    id: id(),
    subjectId: text("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    /** Длительность в секундах. */
    seconds: integer("seconds").notNull(),
    date: text("date").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("study_sessions_subject_idx").on(t.subjectId),
    index("study_sessions_date_idx").on(t.date),
  ],
);

export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;

/* Статус темы в программе курса. */
export const TOPIC_STATUSES = [
  "not_started",
  "learning",
  "known",
  "review",
] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

/** Тема из программы курса: что пройдено и насколько усвоено. */
export const topics = sqliteTable(
  "topics",
  {
    id: id(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").$type<TopicStatus>().notNull().default("not_started"),
    position: integer("position").notNull().default(0),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("topics_subject_idx").on(t.subjectId)],
);

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

/** Универсальное файловое вложение — хранится в базе (бэкап одним файлом). */
export const files = sqliteTable("files", {
  id: id(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  size: integer("size").notNull().default(0),
  createdAt: createdAt(),
});

export type FileRow = typeof files.$inferSelect;

/* Тип учебного материала. */
export const MATERIAL_KINDS = ["link", "file", "book", "video", "other"] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

/** Материал по предмету: ссылка (методичка, запись лекции) или файл. */
export const materials = sqliteTable(
  "materials",
  {
    id: id(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind").$type<MaterialKind>().notNull().default("link"),
    url: text("url"),
    fileId: text("file_id").references(() => files.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("materials_subject_idx").on(t.subjectId)],
);

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;

/* ───────────────────────  Домен: Ежедневник  ─────────────────────── */

/** Запись ежедневника: одна на день. Настроение (1–5) и свободный текст. */
export const journal = sqliteTable("journal", {
  id: id(),
  /** День записи: YYYY-MM-DD, уникальный. */
  date: text("date").notNull().unique(),
  mood: integer("mood"),
  body: text("body"),
  /** Теги записи (#настя #учёба) — для поиска и фильтра. */
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Блокнот в стиле Notion: страницы, вложенные друг в друга (parentId).
 * Тело — HTML из того же блочного редактора. Удаление каскадит по коду.
 */
export const pages = sqliteTable(
  "pages",
  {
    id: id(),
    /** Родительская страница (null — верхний уровень). */
    parentId: text("parent_id"),
    title: text("title").notNull().default(""),
    icon: text("icon"),
    /** Обложка: CSS-градиент (`linear-gradient(...)`) или URL картинки. */
    cover: text("cover"),
    body: text("body"),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("pages_parent_idx").on(t.parentId)],
);

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export type Area = typeof areas.$inferSelect;
export type NewArea = typeof areas.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Journal = typeof journal.$inferSelect;
export type NewJournal = typeof journal.$inferInsert;

/* ───────────────────────  Домен: Финансы  ─────────────────────── */

export const ACCOUNT_KINDS = [
  "cash",
  "card",
  "bank",
  "savings",
  "other",
] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/** Счёт: наличные, карта, вклад… Баланс = openingBalance + операции. */
export const accounts = sqliteTable(
  "accounts",
  {
    id: id(),
    name: text("name").notNull(),
    kind: text("kind").$type<AccountKind>().notNull().default("card"),
    currency: text("currency").notNull().default("RUB"),
    /** Начальный баланс в минимальных единицах (копейках). */
    openingBalance: integer("opening_balance").notNull().default(0),
    color: text("color"),
    icon: text("icon"),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("accounts_position_idx").on(t.position)],
);

export const CATEGORY_KINDS = ["income", "expense"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

/** Категория дохода или расхода. Для расходов можно задать месячный бюджет. */
export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    name: text("name").notNull(),
    kind: text("kind").$type<CategoryKind>().notNull().default("expense"),
    color: text("color"),
    icon: text("icon"),
    /** Месячный лимит в копейках (null — без бюджета). */
    monthlyBudget: integer("monthly_budget"),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("categories_kind_idx").on(t.kind)],
);

export const TRANSACTION_KINDS = ["income", "expense", "transfer"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

/**
 * Операция: доход, расход или перевод между счетами.
 * Сумма — положительная, в копейках; знак задаёт вид (kind).
 * Кросс-доменные привязки (сфера/проект/предмет) — чтобы видеть,
 * сколько ушло на учёбу или конкретный проект.
 */
export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** Счёт-получатель для перевода. */
    toAccountId: text("to_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    kind: text("kind").$type<TransactionKind>().notNull().default("expense"),
    amount: integer("amount").notNull(),
    /**
     * Для кросс-валютного перевода: сколько зачислено на счёт-получатель
     * (в валюте получателя). null — перевод внутри одной валюты (сумма та же).
     */
    amountTo: integer("amount_to"),
    date: text("date").notNull(),
    note: text("note"),
    areaId: text("area_id").references(() => areas.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    subjectId: text("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    /** Человек, связанный с операцией (кому/от кого). */
    personId: text("person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("transactions_account_idx").on(t.accountId),
    index("transactions_category_idx").on(t.categoryId),
    index("transactions_date_idx").on(t.date),
    index("transactions_kind_idx").on(t.kind),
    index("transactions_area_idx").on(t.areaId),
    index("transactions_person_idx").on(t.personId),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

/**
 * Курс валюты к базовой (rateToBase — сколько базовой валюты стоит 1 единица
 * данной). Базовая валюта курса не требует. Правится вручную — офлайн, без
 * зависимости от внешнего API.
 */
export const exchangeRates = sqliteTable("exchange_rates", {
  code: text("code").primaryKey(),
  rateToBase: real("rate_to_base").notNull(),
  updatedAt: updatedAt(),
});

export type ExchangeRate = typeof exchangeRates.$inferSelect;

/* ─────────────────────────  Домен: Долги  ───────────────────────── */

export const DEBT_DIRECTIONS = ["owed_to_me", "i_owe"] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

/** Долг: «мне должны» или «я должен». Тело долга + журнал возвратов. */
export const debts = sqliteTable(
  "debts",
  {
    id: id(),
    direction: text("direction").$type<DebtDirection>().notNull(),
    /** Человек из «Людей» (если заведён) — так долг виден в его карточке. */
    personId: text("person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    /** Имя контрагента, если человек не заведён отдельно. */
    counterparty: text("counterparty"),
    title: text("title"),
    currency: text("currency").notNull().default("RUB"),
    /** Тело долга в минорных единицах, в валюте долга. */
    principal: integer("principal").notNull(),
    /** Когда возник: YYYY-MM-DD. */
    date: text("date").notNull(),
    /** Когда вернуть: YYYY-MM-DD. */
    dueDate: text("due_date"),
    note: text("note"),
    /** Закрыт вручную (например, прощён), даже если остаток ≠ 0. */
    settledAt: integer("settled_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("debts_person_idx").on(t.personId),
    index("debts_direction_idx").on(t.direction),
  ],
);

/** Возврат по долгу (частичный или полный). */
export const debtPayments = sqliteTable(
  "debt_payments",
  {
    id: id(),
    debtId: text("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    /** Сумма возврата в валюте долга, минорные единицы. */
    amount: integer("amount").notNull(),
    date: text("date").notNull(),
    /** Куда/откуда прошли деньги (справочно, без авто-операции). */
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("debt_payments_debt_idx").on(t.debtId)],
);

export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type DebtPayment = typeof debtPayments.$inferSelect;

/* ────────────────────  Домен: Планы и подписки  ──────────────────── */

/** Периодичность плана: разовый или регулярный. */
export const PLANNED_RECURRENCES = ["once", "week", "month", "year"] as const;
export type PlannedRecurrence = (typeof PLANNED_RECURRENCES)[number];

/**
 * Запланированная операция. Разовая (recurrence = "once") — планировщик;
 * регулярная (week/month/year) — подписка/повторяющийся платёж. По наступлении
 * `nextDate` либо ждёт кнопки «Провести», либо проводится сама (autopost).
 */
export const planned = sqliteTable(
  "planned",
  {
    id: id(),
    title: text("title").notNull(),
    kind: text("kind").$type<TransactionKind>().notNull().default("expense"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("RUB"),
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    toAccountId: text("to_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    areaId: text("area_id").references(() => areas.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    subjectId: text("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    personId: text("person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    recurrence: text("recurrence")
      .$type<PlannedRecurrence>()
      .notNull()
      .default("month"),
    interval: integer("interval").notNull().default(1),
    /** Ближайшая дата проведения: YYYY-MM-DD. */
    nextDate: text("next_date").notNull(),
    autopost: integer("autopost", { mode: "boolean" }).notNull().default(false),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    note: text("note"),
    lastPostedDate: text("last_posted_date"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("planned_next_idx").on(t.nextDate),
    index("planned_active_idx").on(t.active),
  ],
);

export type Planned = typeof planned.$inferSelect;
export type NewPlanned = typeof planned.$inferInsert;

/* ─────────────────────  Домен: Цели накопления  ───────────────────── */

/** Финансовая цель: копим на что-то. Прогресс — из журнала взносов. */
export const goals = sqliteTable(
  "goals",
  {
    id: id(),
    title: text("title").notNull(),
    targetAmount: integer("target_amount").notNull(),
    currency: text("currency").notNull().default("RUB"),
    /** Счёт-копилка, где деньги (справочно). */
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    dueDate: text("due_date"),
    color: text("color"),
    icon: text("icon"),
    note: text("note"),
    achievedAt: integer("achieved_at", { mode: "timestamp_ms" }),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("goals_position_idx").on(t.position)],
);

/** Взнос в цель. */
export const goalContributions = sqliteTable(
  "goal_contributions",
  {
    id: id(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    date: text("date").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("goal_contributions_goal_idx").on(t.goalId)],
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalContribution = typeof goalContributions.$inferSelect;

/* ─────────────────────  Домен: Люди и организации  ───────────────────── */

export const ORG_KINDS = [
  "university",
  "company",
  "school",
  "other",
] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

/** Организация: вуз, работа, любая структура, к которой относятся люди. */
export const organizations = sqliteTable(
  "organizations",
  {
    id: id(),
    name: text("name").notNull(),
    kind: text("kind").$type<OrgKind>().notNull().default("other"),
    note: text("note"),
    url: text("url"),
    /** База знаний: свободное описание с фото (HTML из RichEditor). */
    body: text("body"),
    color: text("color"),
    icon: text("icon"),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("organizations_position_idx").on(t.position)],
);

/** Человек: контакт с ролью, организацией, днём рождения и заметкой. */
/** Соцсети/мессенджеры человека — храним списком, показываем только заполненное. */
export const SOCIAL_KINDS = [
  "instagram",
  "telegram",
  "whatsapp",
  "facebook",
  "vk",
  "twitter",
  "tiktok",
  "linkedin",
  "youtube",
  "github",
  "website",
  "other",
] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];
export type Social = { kind: SocialKind; value: string };

export const people = sqliteTable(
  "people",
  {
    id: id(),
    name: text("name").notNull(),
    /** Кто это: научрук, одногруппник, друг… */
    role: text("role"),
    organizationId: text("organization_id").references(
      () => organizations.id,
      { onDelete: "set null" },
    ),
    phone: text("phone"),
    email: text("email"),
    /** День рождения: YYYY-MM-DD (год может быть 0001, если неизвестен). */
    birthday: text("birthday"),
    note: text("note"),
    /** База знаний: свободное досье с фото (HTML из RichEditor). */
    body: text("body"),
    /** Избранный — закрепляется наверху списка людей. */
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    color: text("color"),
    icon: text("icon"),
    /** Ссылка на аватар (картинка в базе): /api/images/<id>. */
    avatar: text("avatar"),
    /** Соцсети/мессенджеры: [{ kind, value }] — только заполненные. */
    socials: text("socials", { mode: "json" }).$type<Social[]>(),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("people_org_idx").on(t.organizationId)],
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;

/** Встреча: большой свободный конспект о разговоре, привязанный к человеку. */
export const meetings = sqliteTable(
  "meetings",
  {
    id: id(),
    title: text("title").notNull().default(""),
    /** Когда была встреча: YYYY-MM-DD. */
    date: text("date").notNull(),
    personId: text("person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    location: text("location"),
    /** Тело — HTML из того же редактора, что и конспекты. */
    body: text("body"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("meetings_person_idx").on(t.personId),
    index("meetings_date_idx").on(t.date),
  ],
);

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

/**
 * Менеджер паролей. Секрет (пароль) хранится зашифрованным (AES-256-GCM,
 * см. lib/crypto) в passwordCipher; остальное — открытым текстом для списка
 * и поиска.
 */
export const credentials = sqliteTable(
  "credentials",
  {
    id: id(),
    title: text("title").notNull().default(""),
    username: text("username"),
    url: text("url"),
    category: text("category"),
    /** Незасекреченная подсказка (НЕ для секретов — они в пароле). */
    note: text("note"),
    /** Зашифрованный пароль: base64(iv|tag|ciphertext). null — пароль не задан. */
    passwordCipher: text("password_cipher"),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("credentials_category_idx").on(t.category)],
);

export type Credential = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;

/* ─────────────────────  Вложения (картинки)  ───────────────────── */

/** Картинки конспектов — хранятся прямо в базе, чтобы бэкап был одним файлом. */
export const images = sqliteTable("images", {
  id: id(),
  mime: text("mime").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  size: integer("size").notNull().default(0),
  createdAt: createdAt(),
});

export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;

/* ─────────────────────────  Музыка  ───────────────────────── */

/**
 * Личная фонотека. Сами аудиофайлы лежат на диске (data/media/<id>.<ext>) —
 * чтобы база и её бэкапы оставались лёгкими даже при большой коллекции.
 * Здесь — только метаданные. Обложка хранится в таблице images (как и
 * картинки конспектов), поэтому попадает в резервные копии.
 */
export const tracks = sqliteTable(
  "tracks",
  {
    id: id(),
    title: text("title").notNull().default(""),
    artist: text("artist"),
    album: text("album"),
    /** Длительность в секундах (из тегов или измеренная плеером). */
    duration: real("duration"),
    /** MIME аудио (audio/mpeg, audio/flac, audio/mp4…). */
    mime: text("mime").notNull(),
    /** Расширение файла на диске (mp3, flac, m4a…) — для пути в data/media. */
    ext: text("ext").notNull().default(""),
    /** Размер аудиофайла в байтах. */
    size: integer("size").notNull().default(0),
    /** Где лежит аудио: 'disk' (data/media) или 's3' (объектное хранилище). */
    storage: text("storage").notNull().default("disk"),
    /** Ключ объекта в S3 (для storage='s3'); для диска — null. */
    storageKey: text("storage_key"),
    /** Обложка — ссылка на images.id (null — обложки нет). */
    coverImageId: text("cover_image_id").references(() => images.id, {
      onDelete: "set null",
    }),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    /** Порядок в фонотеке (перетаскивание/сортировка). */
    position: integer("position").notNull().default(0),
    /** Сколько раз доигран до конца — для «часто слушаю». */
    playCount: integer("play_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tracks_position_idx").on(t.position),
    index("tracks_favorite_idx").on(t.favorite),
  ],
);

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
