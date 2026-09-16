import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gt,
  isNotNull,
  isNull,
  like,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db, schemaReady } from "@/db";
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
  exchangeRates,
  type Task,
  type Area,
  type Subject,
  type Lesson,
  type Note,
  type Journal,
  type Account,
  type Category,
  type Transaction,
  type Organization,
  type Person,
  type Meeting,
} from "@/db/schema";
import { todayISO, isoWeekday } from "@/lib/dates";
import { baseCurrency, toBase } from "@/lib/currency";

/** Курсы к базовой валюте (rateToBase; базовая = 1). Внутренний помощник. */
async function ratesMap(): Promise<Map<string, number>> {
  const rows = await db.select().from(exchangeRates);
  return new Map(rows.map((r) => [r.code, r.rateToBase]));
}

export type TaskWithContext = Task & {
  projectName: string | null;
  areaName: string | null;
  areaColor: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  personName: string | null;
};

const taskSelection = {
  ...getTableColumns(tasks),
  projectName: projects.name,
  areaName: areas.name,
  areaColor: areas.color,
  subjectName: subjects.name,
  subjectColor: subjects.color,
  personName: people.name,
};

function taskBaseQuery() {
  return db
    .select(taskSelection)
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(areas, eq(tasks.areaId, areas.id))
    .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
    .leftJoin(people, eq(tasks.personId, people.id));
}

const openTask = eq(tasks.status, "open");

/** Одна задача со всем контекстом (для страницы задачи). */
export async function getTask(id: string): Promise<TaskWithContext | null> {
  await schemaReady();
  const [row] = await taskBaseQuery().where(eq(tasks.id, id)).limit(1);
  return row ?? null;
}

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
  // Задачи с временем — вперёд, по возрастанию времени; остальные по приоритету.
  const timeOf = (r: TaskWithContext) =>
    r.scheduledDate === t && r.scheduledTime ? r.scheduledTime : null;
  today.sort((a, b) => {
    const ta = timeOf(a);
    const tb = timeOf(b);
    if (ta && tb) return ta.localeCompare(tb);
    if (ta) return -1;
    if (tb) return 1;
    return b.priority - a.priority;
  });
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

/* ───────────────────────  Учёба  ─────────────────────── */

export type SubjectWithCounts = Subject & {
  lessonCount: number;
  homeworkOpen: number;
  noteCount: number;
};

export type LessonWithSubject = Lesson & {
  subjectName: string;
  subjectColor: string | null;
  subjectIcon: string | null;
};

export type NoteWithSubject = Note & {
  subjectName: string | null;
  subjectColor: string | null;
};

const lessonSelection = {
  ...getTableColumns(lessons),
  subjectName: subjects.name,
  subjectColor: subjects.color,
  subjectIcon: subjects.icon,
};

function lessonBaseQuery() {
  return db
    .select(lessonSelection)
    .from(lessons)
    .innerJoin(subjects, eq(lessons.subjectId, subjects.id));
}

/** Одно занятие с предметом (для страницы занятия). */
export async function getLesson(id: string): Promise<LessonWithSubject | null> {
  await schemaReady();
  const [row] = await lessonBaseQuery().where(eq(lessons.id, id)).limit(1);
  return row ?? null;
}

export async function getSubjectsWithCounts(): Promise<SubjectWithCounts[]> {
  await schemaReady();
  const base = await db
    .select(getTableColumns(subjects))
    .from(subjects)
    .where(isNull(subjects.archivedAt))
    .orderBy(asc(subjects.position), asc(subjects.createdAt));

  const lessonCounts = await db
    .select({ subjectId: lessons.subjectId, c: sql<number>`count(*)` })
    .from(lessons)
    .groupBy(lessons.subjectId);
  const hwCounts = await db
    .select({ subjectId: tasks.subjectId, c: sql<number>`count(*)` })
    .from(tasks)
    .where(and(isNotNull(tasks.subjectId), eq(tasks.status, "open")))
    .groupBy(tasks.subjectId);
  const noteCounts = await db
    .select({ subjectId: notes.subjectId, c: sql<number>`count(*)` })
    .from(notes)
    .where(isNotNull(notes.subjectId))
    .groupBy(notes.subjectId);

  const lMap = new Map(lessonCounts.map((r) => [r.subjectId, r.c]));
  const hMap = new Map(hwCounts.map((r) => [r.subjectId, r.c]));
  const nMap = new Map(noteCounts.map((r) => [r.subjectId, r.c]));

  return base.map((s) => ({
    ...s,
    lessonCount: lMap.get(s.id) ?? 0,
    homeworkOpen: hMap.get(s.id) ?? 0,
    noteCount: nMap.get(s.id) ?? 0,
  }));
}

export async function getSubjectOptions() {
  await schemaReady();
  return db
    .select({ id: subjects.id, name: subjects.name, color: subjects.color, areaId: subjects.areaId })
    .from(subjects)
    .where(isNull(subjects.archivedAt))
    .orderBy(asc(subjects.position), asc(subjects.createdAt));
}

export async function getSubject(id: string): Promise<Subject | null> {
  await schemaReady();
  const [row] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, id))
    .limit(1);
  return row ?? null;
}

export async function getSubjectLessons(id: string): Promise<LessonWithSubject[]> {
  await schemaReady();
  return lessonBaseQuery()
    .where(eq(lessons.subjectId, id))
    .orderBy(asc(lessons.dayOfWeek), asc(lessons.startTime));
}

export async function getSubjectHomework(id: string): Promise<TaskWithContext[]> {
  await schemaReady();
  return taskBaseQuery()
    .where(eq(tasks.subjectId, id))
    .orderBy(
      asc(sql`case when ${tasks.status} = 'open' then 0 else 1 end`),
      asc(tasks.scheduledDate),
      desc(tasks.priority),
      asc(tasks.createdAt),
    );
}

export async function getSubjectNotes(id: string): Promise<NoteWithSubject[]> {
  await schemaReady();
  return db
    .select({
      ...getTableColumns(notes),
      subjectName: subjects.name,
      subjectColor: subjects.color,
    })
    .from(notes)
    .leftJoin(subjects, eq(notes.subjectId, subjects.id))
    .where(eq(notes.subjectId, id))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));
}

export type ScheduleDay = { iso: number; lessons: LessonWithSubject[] };

export async function getScheduleByDay(): Promise<ScheduleDay[]> {
  await schemaReady();
  const rows = await lessonBaseQuery().orderBy(
    asc(lessons.dayOfWeek),
    asc(lessons.startTime),
  );
  const days: ScheduleDay[] = [1, 2, 3, 4, 5, 6, 7].map((iso) => ({
    iso,
    lessons: [],
  }));
  for (const r of rows) {
    const d = days.find((x) => x.iso === r.dayOfWeek);
    if (d) d.lessons.push(r);
  }
  return days;
}

export async function getLessonsForWeekday(
  wd: number,
): Promise<LessonWithSubject[]> {
  await schemaReady();
  return lessonBaseQuery()
    .where(eq(lessons.dayOfWeek, wd))
    .orderBy(asc(lessons.startTime));
}

export function getTodayLessons(): Promise<LessonWithSubject[]> {
  return getLessonsForWeekday(isoWeekday(todayISO()));
}

export async function getNotes(): Promise<NoteWithSubject[]> {
  await schemaReady();
  return db
    .select({
      ...getTableColumns(notes),
      subjectName: subjects.name,
      subjectColor: subjects.color,
    })
    .from(notes)
    .leftJoin(subjects, eq(notes.subjectId, subjects.id))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));
}

export async function getNote(id: string): Promise<NoteWithSubject | null> {
  await schemaReady();
  const [row] = await db
    .select({
      ...getTableColumns(notes),
      subjectName: subjects.name,
      subjectColor: subjects.color,
    })
    .from(notes)
    .leftJoin(subjects, eq(notes.subjectId, subjects.id))
    .where(eq(notes.id, id))
    .limit(1);
  return row ?? null;
}

/* ───────────────────────  Ежедневник  ─────────────────────── */

export async function getJournalEntry(date: string): Promise<Journal | null> {
  await schemaReady();
  const [row] = await db
    .select()
    .from(journal)
    .where(eq(journal.date, date))
    .limit(1);
  return row ?? null;
}

/** Задачи, запланированные на конкретный день (любой статус). */
export async function getDayTasks(date: string): Promise<TaskWithContext[]> {
  await schemaReady();
  return taskBaseQuery()
    .where(eq(tasks.scheduledDate, date))
    .orderBy(
      asc(sql`case when ${tasks.status} = 'open' then 0 else 1 end`),
      desc(tasks.priority),
      asc(tasks.createdAt),
    );
}

export async function getRecentJournalEntries(limit = 20): Promise<Journal[]> {
  await schemaReady();
  return db.select().from(journal).orderBy(desc(journal.date)).limit(limit);
}

/* ───────────────────────  Финансы  ─────────────────────── */

export type AccountWithBalance = Account & { balance: number };

export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  await schemaReady();
  const base = await db
    .select()
    .from(accounts)
    .where(isNull(accounts.archivedAt))
    .orderBy(asc(accounts.position), asc(accounts.createdAt));

  const byKind = await db
    .select({
      accountId: transactions.accountId,
      kind: transactions.kind,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .groupBy(transactions.accountId, transactions.kind);

  const transIn = await db
    .select({
      toAccountId: transactions.toAccountId,
      // Для кросс-валютного перевода на счёт зачисляется amountTo (в его валюте).
      total: sql<number>`sum(coalesce(${transactions.amountTo}, ${transactions.amount}))`,
    })
    .from(transactions)
    .where(
      and(eq(transactions.kind, "transfer"), isNotNull(transactions.toAccountId)),
    )
    .groupBy(transactions.toAccountId);

  const income = new Map<string, number>();
  const expense = new Map<string, number>();
  const transferOut = new Map<string, number>();
  for (const r of byKind) {
    if (r.kind === "income") income.set(r.accountId, r.total);
    else if (r.kind === "expense") expense.set(r.accountId, r.total);
    else transferOut.set(r.accountId, r.total);
  }
  const transferIn = new Map<string, number>();
  for (const r of transIn) if (r.toAccountId) transferIn.set(r.toAccountId, r.total);

  return base.map((a) => ({
    ...a,
    balance:
      a.openingBalance +
      (income.get(a.id) ?? 0) -
      (expense.get(a.id) ?? 0) -
      (transferOut.get(a.id) ?? 0) +
      (transferIn.get(a.id) ?? 0),
  }));
}

/** Сумма всех счетов, сведённая в базовую валюту. */
export async function getTotalBalance(): Promise<number> {
  const base = baseCurrency();
  const [accs, rates] = await Promise.all([
    getAccountsWithBalances(),
    ratesMap(),
  ]);
  return accs.reduce((s, a) => s + toBase(a.balance, a.currency, rates, base), 0);
}

export type MonthSummary = { income: number; expense: number; net: number };

export async function getMonthSummary(month: string): Promise<MonthSummary> {
  await schemaReady();
  const base = baseCurrency();
  const [rows, rates] = await Promise.all([
    db
      .select({
        kind: transactions.kind,
        currency: accounts.currency,
        total: sql<number>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(like(transactions.date, `${month}-%`))
      .groupBy(transactions.kind, accounts.currency),
    ratesMap(),
  ]);
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    const inBase = toBase(r.total, r.currency, rates, base);
    if (r.kind === "income") income += inBase;
    else if (r.kind === "expense") expense += inBase;
  }
  return { income, expense, net: income - expense };
}

export type CategorySpend = {
  categoryId: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  budget: number | null;
  spent: number;
};

export async function getSpendingByCategory(
  month: string,
): Promise<CategorySpend[]> {
  await schemaReady();
  const base = baseCurrency();
  const [rows, rates] = await Promise.all([
    db
      .select({
        categoryId: transactions.categoryId,
        name: categories.name,
        color: categories.color,
        icon: categories.icon,
        budget: categories.monthlyBudget,
        currency: accounts.currency,
        spent: sql<number>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(eq(transactions.kind, "expense"), like(transactions.date, `${month}-%`)),
      )
      .groupBy(transactions.categoryId, accounts.currency),
    ratesMap(),
  ]);
  // Сводим траты (в разных валютах) по категории в базовую валюту.
  const acc = new Map<string, CategorySpend>();
  for (const r of rows) {
    const key = r.categoryId ?? "none";
    const inBase = toBase(r.spent, r.currency, rates, base);
    const cur = acc.get(key);
    if (cur) cur.spent += inBase;
    else
      acc.set(key, {
        categoryId: r.categoryId,
        name: r.name ?? "Без категории",
        color: r.color,
        icon: r.icon,
        budget: r.budget,
        spent: inBase,
      });
  }
  return [...acc.values()].sort((a, b) => b.spent - a.spent);
}

export type TransactionWithContext = Transaction & {
  accountName: string | null;
  accountColor: string | null;
  accountCurrency: string | null;
  toAccountName: string | null;
  toAccountCurrency: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  areaName: string | null;
  areaColor: string | null;
  projectName: string | null;
  subjectName: string | null;
  personName: string | null;
};

export async function getTransactions(
  opts: {
    month?: string;
    accountId?: string;
    categoryId?: string;
    personId?: string;
    limit?: number;
  } = {},
): Promise<TransactionWithContext[]> {
  await schemaReady();
  const toAcc = alias(accounts, "to_acc");
  const conds: SQL[] = [];
  if (opts.month) conds.push(like(transactions.date, `${opts.month}-%`));
  if (opts.accountId) conds.push(eq(transactions.accountId, opts.accountId));
  if (opts.categoryId) conds.push(eq(transactions.categoryId, opts.categoryId));
  if (opts.personId) conds.push(eq(transactions.personId, opts.personId));

  let q = db
    .select({
      ...getTableColumns(transactions),
      accountName: accounts.name,
      accountColor: accounts.color,
      accountCurrency: accounts.currency,
      toAccountName: toAcc.name,
      toAccountCurrency: toAcc.currency,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      areaName: areas.name,
      areaColor: areas.color,
      projectName: projects.name,
      subjectName: subjects.name,
      personName: people.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(toAcc, eq(transactions.toAccountId, toAcc.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(areas, eq(transactions.areaId, areas.id))
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .leftJoin(subjects, eq(transactions.subjectId, subjects.id))
    .leftJoin(people, eq(transactions.personId, people.id))
    .$dynamic();

  if (conds.length) q = q.where(and(...conds));
  q = q.orderBy(desc(transactions.date), desc(transactions.createdAt));
  if (opts.limit) q = q.limit(opts.limit);
  return q;
}

export type CategoryWithSpend = Category & { spent: number };

export async function getCategoriesWithMonth(
  month: string,
): Promise<CategoryWithSpend[]> {
  await schemaReady();
  const cats = await db
    .select()
    .from(categories)
    .where(isNull(categories.archivedAt))
    .orderBy(asc(categories.kind), asc(categories.position), asc(categories.createdAt));
  const base = baseCurrency();
  const [spend, rates] = await Promise.all([
    db
      .select({
        categoryId: transactions.categoryId,
        currency: accounts.currency,
        total: sql<number>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          isNotNull(transactions.categoryId),
          ne(transactions.kind, "transfer"),
          like(transactions.date, `${month}-%`),
        ),
      )
      .groupBy(transactions.categoryId, accounts.currency),
    ratesMap(),
  ]);
  const m = new Map<string, number>();
  for (const r of spend) {
    if (!r.categoryId) continue;
    m.set(
      r.categoryId,
      (m.get(r.categoryId) ?? 0) + toBase(r.total, r.currency, rates, base),
    );
  }
  return cats.map((c) => ({ ...c, spent: m.get(c.id) ?? 0 }));
}

export async function getAccountOptions() {
  await schemaReady();
  return db
    .select({
      id: accounts.id,
      name: accounts.name,
      color: accounts.color,
      currency: accounts.currency,
    })
    .from(accounts)
    .where(isNull(accounts.archivedAt))
    .orderBy(asc(accounts.position), asc(accounts.createdAt));
}

export async function getCategoryOptions() {
  await schemaReady();
  return db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      color: categories.color,
    })
    .from(categories)
    .where(isNull(categories.archivedAt))
    .orderBy(asc(categories.position), asc(categories.createdAt));
}

/* ─────────────────────  Люди и организации  ───────────────────── */

export type PersonWithOrg = Person & {
  orgName: string | null;
  orgColor: string | null;
};

export async function getPeopleWithOrg(): Promise<PersonWithOrg[]> {
  await schemaReady();
  return db
    .select({
      ...getTableColumns(people),
      orgName: organizations.name,
      orgColor: organizations.color,
    })
    .from(people)
    .leftJoin(organizations, eq(people.organizationId, organizations.id))
    .where(isNull(people.archivedAt))
    .orderBy(asc(people.position), asc(people.name));
}

export async function getPerson(id: string): Promise<PersonWithOrg | null> {
  await schemaReady();
  const [row] = await db
    .select({
      ...getTableColumns(people),
      orgName: organizations.name,
      orgColor: organizations.color,
    })
    .from(people)
    .leftJoin(organizations, eq(people.organizationId, organizations.id))
    .where(eq(people.id, id))
    .limit(1);
  return row ?? null;
}

export async function getPersonTasks(id: string): Promise<TaskWithContext[]> {
  await schemaReady();
  return taskBaseQuery()
    .where(eq(tasks.personId, id))
    .orderBy(
      asc(sql`case when ${tasks.status} = 'open' then 0 else 1 end`),
      asc(tasks.scheduledDate),
      desc(tasks.priority),
      asc(tasks.createdAt),
    );
}

export function getPersonTransactions(
  id: string,
): Promise<TransactionWithContext[]> {
  return getTransactions({ personId: id, limit: 50 });
}

export type OrgWithCount = Organization & { peopleCount: number };

export async function getOrganizationsWithCounts(): Promise<OrgWithCount[]> {
  await schemaReady();
  const base = await db
    .select()
    .from(organizations)
    .where(isNull(organizations.archivedAt))
    .orderBy(asc(organizations.position), asc(organizations.name));
  const counts = await db
    .select({
      organizationId: people.organizationId,
      c: sql<number>`count(*)`,
    })
    .from(people)
    .where(and(isNotNull(people.organizationId), isNull(people.archivedAt)))
    .groupBy(people.organizationId);
  const m = new Map(counts.map((r) => [r.organizationId, r.c]));
  return base.map((o) => ({ ...o, peopleCount: m.get(o.id) ?? 0 }));
}

export async function getOrganization(
  id: string,
): Promise<Organization | null> {
  await schemaReady();
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  return row ?? null;
}

export async function getOrganizationPeople(
  id: string,
): Promise<PersonWithOrg[]> {
  await schemaReady();
  return db
    .select({
      ...getTableColumns(people),
      orgName: organizations.name,
      orgColor: organizations.color,
    })
    .from(people)
    .leftJoin(organizations, eq(people.organizationId, organizations.id))
    .where(and(eq(people.organizationId, id), isNull(people.archivedAt)))
    .orderBy(asc(people.position), asc(people.name));
}

export type MeetingWithPerson = Meeting & {
  personName: string | null;
  personColor: string | null;
  personIcon: string | null;
  personAvatar: string | null;
};

const meetingPersonCols = {
  personName: people.name,
  personColor: people.color,
  personIcon: people.icon,
  personAvatar: people.avatar,
};

export async function getMeetings(): Promise<MeetingWithPerson[]> {
  await schemaReady();
  return db
    .select({ ...getTableColumns(meetings), ...meetingPersonCols })
    .from(meetings)
    .leftJoin(people, eq(meetings.personId, people.id))
    .orderBy(desc(meetings.date), desc(meetings.updatedAt));
}

export async function getMeeting(id: string): Promise<MeetingWithPerson | null> {
  await schemaReady();
  const [row] = await db
    .select({ ...getTableColumns(meetings), ...meetingPersonCols })
    .from(meetings)
    .leftJoin(people, eq(meetings.personId, people.id))
    .where(eq(meetings.id, id))
    .limit(1);
  return row ?? null;
}

export async function getPersonMeetings(
  personId: string,
): Promise<MeetingWithPerson[]> {
  await schemaReady();
  return db
    .select({ ...getTableColumns(meetings), ...meetingPersonCols })
    .from(meetings)
    .leftJoin(people, eq(meetings.personId, people.id))
    .where(eq(meetings.personId, personId))
    .orderBy(desc(meetings.date), desc(meetings.updatedAt));
}

export async function getPersonOptions() {
  await schemaReady();
  return db
    .select({ id: people.id, name: people.name, color: people.color })
    .from(people)
    .where(isNull(people.archivedAt))
    .orderBy(asc(people.position), asc(people.name));
}

export async function getOrganizationOptions() {
  await schemaReady();
  return db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(isNull(organizations.archivedAt))
    .orderBy(asc(organizations.position), asc(organizations.name));
}
