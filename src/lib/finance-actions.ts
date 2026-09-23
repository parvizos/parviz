"use server";

import { revalidatePath } from "next/cache";
import { and, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { db, schemaReady } from "@/db";
import {
  exchangeRates,
  debts,
  debtPayments,
  planned,
  goals,
  goalContributions,
  transactions,
  DEBT_DIRECTIONS,
  PLANNED_RECURRENCES,
  TRANSACTION_KINDS,
  type PlannedRecurrence,
  type Planned,
} from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { getBaseCurrency } from "@/lib/settings";

function revalidateAll() {
  revalidatePath("/", "layout");
}

const nullableId = z.string().min(1).nullable().optional();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateOpt = isoDate.nullable().optional();
const currencyCode = z
  .string()
  .trim()
  .min(2)
  .max(8)
  .transform((s) => s.toUpperCase());

/* ───────────────────────────  Курсы валют  ─────────────────────────── */

const setRateSchema = z.object({
  code: currencyCode,
  rateToBase: z.coerce.number().positive("Курс должен быть больше нуля"),
});

export async function setRate(input: z.input<typeof setRateSchema>) {
  await schemaReady();
  const data = setRateSchema.parse(input);
  await db
    .insert(exchangeRates)
    .values({ code: data.code, rateToBase: data.rateToBase })
    .onConflictDoUpdate({
      target: exchangeRates.code,
      set: { rateToBase: data.rateToBase, updatedAt: new Date() },
    });
  revalidateAll();
}

export async function deleteRate(code: string) {
  await schemaReady();
  await db.delete(exchangeRates).where(eq(exchangeRates.code, code));
  revalidateAll();
}

/* ─────────────────────────────  Долги  ───────────────────────────── */

const debtSchema = z.object({
  direction: z.enum(DEBT_DIRECTIONS),
  personId: nullableId,
  counterparty: z.string().trim().max(160).nullable().optional(),
  title: z.string().trim().max(200).nullable().optional(),
  currency: currencyCode.optional(),
  principal: z.coerce.number().int().positive("Введите сумму"),
  date: isoDate,
  dueDate: isoDateOpt,
  note: z.string().max(1000).nullable().optional(),
});

export type DebtInput = z.input<typeof debtSchema>;

export async function createDebt(input: DebtInput) {
  await schemaReady();
  const data = debtSchema.parse(input);
  const base = await getBaseCurrency();
  const [row] = await db
    .insert(debts)
    .values({
      direction: data.direction,
      personId: data.personId ?? null,
      counterparty: data.counterparty ?? null,
      title: data.title ?? null,
      currency: data.currency ?? base,
      principal: data.principal,
      date: data.date,
      dueDate: data.dueDate ?? null,
      note: data.note ?? null,
    })
    .returning({ id: debts.id });
  revalidateAll();
  return row;
}

const debtPatchSchema = debtSchema.partial();

export async function updateDebt(id: string, input: z.input<typeof debtPatchSchema>) {
  await schemaReady();
  const data = debtPatchSchema.parse(input);
  await db.update(debts).set(data).where(eq(debts.id, id));
  revalidateAll();
}

export async function deleteDebt(id: string) {
  await schemaReady();
  await db.delete(debts).where(eq(debts.id, id));
  revalidateAll();
}

/** Пометить долг закрытым вручную (например, прощён) или снова открыть. */
export async function setDebtSettled(id: string, settled: boolean) {
  await schemaReady();
  await db
    .update(debts)
    .set({ settledAt: settled ? new Date() : null })
    .where(eq(debts.id, id));
  revalidateAll();
}

const debtPaymentSchema = z.object({
  debtId: z.string().min(1),
  amount: z.coerce.number().int().positive("Введите сумму"),
  date: isoDate,
  accountId: nullableId,
  note: z.string().max(500).nullable().optional(),
});

export async function addDebtPayment(input: z.input<typeof debtPaymentSchema>) {
  await schemaReady();
  const data = debtPaymentSchema.parse(input);
  await db.insert(debtPayments).values({
    debtId: data.debtId,
    amount: data.amount,
    date: data.date,
    accountId: data.accountId ?? null,
    note: data.note ?? null,
  });
  revalidateAll();
}

export async function deleteDebtPayment(id: string) {
  await schemaReady();
  await db.delete(debtPayments).where(eq(debtPayments.id, id));
  revalidateAll();
}

/* ──────────────────────  Планы и подписки  ─────────────────────── */

const plannedSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(200),
  kind: z.enum(TRANSACTION_KINDS).optional(),
  amount: z.coerce.number().int().positive("Введите сумму"),
  currency: currencyCode.optional(),
  accountId: nullableId,
  toAccountId: nullableId,
  categoryId: nullableId,
  areaId: nullableId,
  projectId: nullableId,
  subjectId: nullableId,
  personId: nullableId,
  recurrence: z.enum(PLANNED_RECURRENCES).optional(),
  interval: z.coerce.number().int().min(1).max(365).optional(),
  nextDate: isoDate,
  autopost: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

export type PlannedInput = z.input<typeof plannedSchema>;

export async function createPlanned(input: PlannedInput) {
  await schemaReady();
  const data = plannedSchema.parse(input);
  const base = await getBaseCurrency();
  const [row] = await db
    .insert(planned)
    .values({
      title: data.title,
      kind: data.kind ?? "expense",
      amount: data.amount,
      currency: data.currency ?? base,
      accountId: data.accountId ?? null,
      toAccountId: data.kind === "transfer" ? data.toAccountId ?? null : null,
      categoryId: data.kind === "transfer" ? null : data.categoryId ?? null,
      areaId: data.areaId ?? null,
      projectId: data.projectId ?? null,
      subjectId: data.subjectId ?? null,
      personId: data.personId ?? null,
      recurrence: data.recurrence ?? "month",
      interval: data.interval ?? 1,
      nextDate: data.nextDate,
      autopost: data.autopost ?? false,
      note: data.note ?? null,
    })
    .returning({ id: planned.id });
  revalidateAll();
  return row;
}

const plannedPatchSchema = plannedSchema.partial();

export async function updatePlanned(
  id: string,
  input: z.input<typeof plannedPatchSchema>,
) {
  await schemaReady();
  const data = plannedPatchSchema.parse(input);
  await db.update(planned).set(data).where(eq(planned.id, id));
  revalidateAll();
}

export async function deletePlanned(id: string) {
  await schemaReady();
  await db.delete(planned).where(eq(planned.id, id));
  revalidateAll();
}

export async function setPlannedActive(id: string, active: boolean) {
  await schemaReady();
  await db.update(planned).set({ active }).where(eq(planned.id, id));
  revalidateAll();
}

/** Число дней в месяце (1–12). */
function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Следующая дата по периодичности (день месяца сохраняется, с зажимом к концу). */
function advanceDate(
  iso: string,
  recurrence: PlannedRecurrence,
  interval: number,
): string {
  const [y, m, d] = iso.split("-").map(Number);
  const step = Math.max(interval, 1);
  if (recurrence === "week") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 7 * step);
    return dt.toISOString().slice(0, 10);
  }
  if (recurrence === "month" || recurrence === "year") {
    const addMonths = recurrence === "year" ? 12 * step : step;
    const total = m - 1 + addMonths;
    const ny = y + Math.floor(total / 12);
    const nm = (total % 12) + 1;
    const nd = Math.min(d, daysInMonth(ny, nm));
    return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
  }
  return iso; // once — не повторяется
}

/** Создать операцию из плана (прямой insert, без revalidate). */
async function insertTxFromPlan(p: Planned, date: string): Promise<boolean> {
  if (!p.accountId) return false;
  if (p.kind === "transfer" && !p.toAccountId) return false;
  await db.insert(transactions).values({
    accountId: p.accountId,
    toAccountId: p.kind === "transfer" ? p.toAccountId : null,
    categoryId: p.kind === "transfer" ? null : p.categoryId,
    kind: p.kind,
    amount: p.amount,
    date,
    note: p.note ? `${p.title} · ${p.note}` : p.title,
    areaId: p.areaId,
    projectId: p.projectId,
    subjectId: p.subjectId,
    personId: p.kind === "transfer" ? null : p.personId,
  });
  return true;
}

/** Провести план вручную (одно наступление) и сдвинуть дату. */
export async function postPlanned(id: string) {
  await schemaReady();
  const [p] = await db.select().from(planned).where(eq(planned.id, id)).limit(1);
  if (!p) return;
  const ok = await insertTxFromPlan(p, p.nextDate);
  if (!ok) throw new Error("У плана нет счёта для проведения");
  if (p.recurrence === "once") {
    await db
      .update(planned)
      .set({ active: false, lastPostedDate: p.nextDate })
      .where(eq(planned.id, id));
  } else {
    await db
      .update(planned)
      .set({
        nextDate: advanceDate(p.nextDate, p.recurrence, p.interval),
        lastPostedDate: p.nextDate,
      })
      .where(eq(planned.id, id));
  }
  revalidateAll();
}

/**
 * Автопроведение всех просроченных планов с autopost = true (наверстывает
 * пропущенные периоды). Вызывается из layout, best-effort.
 */
export async function postDuePlanned(): Promise<void> {
  await schemaReady();
  const today = todayISO();
  const due = await db
    .select()
    .from(planned)
    .where(
      and(
        eq(planned.active, true),
        eq(planned.autopost, true),
        lte(planned.nextDate, today),
      ),
    );
  for (const p of due) {
    let cursor = p.nextDate;
    let guard = 0;
    while (cursor <= today && guard++ < 60) {
      const ok = await insertTxFromPlan(p, cursor);
      if (!ok) break;
      if (p.recurrence === "once") {
        await db
          .update(planned)
          .set({ active: false, lastPostedDate: cursor })
          .where(eq(planned.id, p.id));
        break;
      }
      const next = advanceDate(cursor, p.recurrence, p.interval);
      await db
        .update(planned)
        .set({ nextDate: next, lastPostedDate: cursor })
        .where(eq(planned.id, p.id));
      cursor = next;
    }
  }
  // Намеренно без revalidate: вызывается из layout до чтения данных,
  // поэтому свежие операции попадают в текущий рендер сами.
}

/* ─────────────────────────  Цели накопления  ─────────────────────── */

const goalSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(200),
  targetAmount: z.coerce.number().int().positive("Введите цель"),
  currency: currencyCode.optional(),
  accountId: nullableId,
  dueDate: isoDateOpt,
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(32).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export type GoalInput = z.input<typeof goalSchema>;

export async function createGoal(input: GoalInput) {
  await schemaReady();
  const data = goalSchema.parse(input);
  const base = await getBaseCurrency();
  const [row] = await db
    .insert(goals)
    .values({
      title: data.title,
      targetAmount: data.targetAmount,
      currency: data.currency ?? base,
      accountId: data.accountId ?? null,
      dueDate: data.dueDate ?? null,
      color: data.color ?? null,
      icon: data.icon ?? null,
      note: data.note ?? null,
    })
    .returning({ id: goals.id });
  revalidateAll();
  return row;
}

const goalPatchSchema = goalSchema.partial();

export async function updateGoal(id: string, input: z.input<typeof goalPatchSchema>) {
  await schemaReady();
  const data = goalPatchSchema.parse(input);
  await db.update(goals).set(data).where(eq(goals.id, id));
  revalidateAll();
}

export async function deleteGoal(id: string) {
  await schemaReady();
  await db.delete(goals).where(eq(goals.id, id));
  revalidateAll();
}

/** Отметить цель достигнутой/снять отметку. */
export async function setGoalAchieved(id: string, achieved: boolean) {
  await schemaReady();
  await db
    .update(goals)
    .set({ achievedAt: achieved ? new Date() : null })
    .where(eq(goals.id, id));
  revalidateAll();
}

const contributionSchema = z.object({
  goalId: z.string().min(1),
  amount: z.coerce.number().int(),
  date: isoDate,
  note: z.string().max(300).nullable().optional(),
});

export async function addGoalContribution(
  input: z.input<typeof contributionSchema>,
) {
  await schemaReady();
  const data = contributionSchema.parse(input);
  if (data.amount === 0) return;
  await db.insert(goalContributions).values({
    goalId: data.goalId,
    amount: data.amount,
    date: data.date,
    note: data.note ?? null,
  });
  revalidateAll();
}

export async function deleteGoalContribution(id: string) {
  await schemaReady();
  await db.delete(goalContributions).where(eq(goalContributions.id, id));
  revalidateAll();
}
