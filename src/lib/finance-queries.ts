/*
 * Продвинутые финансы — read-модели: капитал (с учётом долгов и валют),
 * курсы, долги с остатком, планы/подписки, цели, помесячная аналитика.
 * Всё, что сводится в одну валюту, конвертируется в базовую «на лету».
 */

import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db, schemaReady } from "@/db";
import {
  accounts,
  categories,
  transactions,
  people,
  areas,
  exchangeRates,
  debts,
  debtPayments,
  planned,
  goals,
  goalContributions,
  type Debt,
  type Planned,
  type Goal,
} from "@/db/schema";
import { getAccountsWithBalances } from "@/lib/queries";
import { toBase } from "@/lib/currency";
import { getBaseCurrency } from "@/lib/settings";
import { todayISO } from "@/lib/dates";

/* ───────────────────────────  Курсы валют  ─────────────────────────── */

/** Карта rateToBase по коду валюты (базовая не входит — её курс = 1). */
export async function getRatesMap(): Promise<Map<string, number>> {
  await schemaReady();
  const rows = await db.select().from(exchangeRates);
  return new Map(rows.map((r) => [r.code, r.rateToBase]));
}

export type RateRow = {
  code: string;
  rateToBase: number | null;
  updatedAt: Date | null;
  inUse: boolean;
};

/** Валюты, реально используемые счетами (для карточки курсов). */
export async function getUsedCurrencies(): Promise<string[]> {
  await schemaReady();
  const rows = await db
    .selectDistinct({ c: accounts.currency })
    .from(accounts)
    .where(isNull(accounts.archivedAt));
  return rows.map((r) => r.c);
}

/** Курсы валют, что в ходу у счетов (кроме базовой) + отметка «курс не задан». */
export async function getCurrencyRates(): Promise<RateRow[]> {
  await schemaReady();
  const base = await getBaseCurrency();
  const [used, stored] = await Promise.all([
    getUsedCurrencies(),
    db.select().from(exchangeRates),
  ]);
  const storedMap = new Map(stored.map((r) => [r.code, r]));
  const codes = new Set<string>([...used, ...storedMap.keys()]);
  codes.delete(base);
  const usedSet = new Set(used);
  return [...codes]
    .sort()
    .map((code) => {
      const r = storedMap.get(code);
      return {
        code,
        rateToBase: r?.rateToBase ?? null,
        updatedAt: r?.updatedAt ?? null,
        inUse: usedSet.has(code),
      };
    });
}

/* ─────────────────────────────  Долги  ───────────────────────────── */

export type DebtWithOutstanding = Debt & {
  personName: string | null;
  personColor: string | null;
  paid: number;
  outstanding: number;
  settled: boolean;
};

export async function getDebts(opts: { personId?: string } = {}): Promise<
  DebtWithOutstanding[]
> {
  await schemaReady();
  const conds: SQL[] = [];
  if (opts.personId) conds.push(eq(debts.personId, opts.personId));

  const rows = await db
    .select({
      ...getTableColumns(debts),
      personName: people.name,
      personColor: people.color,
    })
    .from(debts)
    .leftJoin(people, eq(debts.personId, people.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(debts.date), desc(debts.createdAt));

  const paidRows = await db
    .select({
      debtId: debtPayments.debtId,
      total: sql<number>`sum(${debtPayments.amount})`,
    })
    .from(debtPayments)
    .groupBy(debtPayments.debtId);
  const paidMap = new Map(paidRows.map((r) => [r.debtId, r.total]));

  return rows.map((d) => {
    const paid = paidMap.get(d.id) ?? 0;
    const outstanding = Math.max(d.principal - paid, 0);
    return {
      ...d,
      paid,
      outstanding,
      settled: d.settledAt != null || outstanding <= 0,
    };
  });
}

export type DebtPaymentRow = {
  id: string;
  amount: number;
  date: string;
  accountId: string | null;
  accountName: string | null;
  note: string | null;
};

export async function getDebtPayments(debtId: string): Promise<DebtPaymentRow[]> {
  await schemaReady();
  return db
    .select({
      id: debtPayments.id,
      amount: debtPayments.amount,
      date: debtPayments.date,
      accountId: debtPayments.accountId,
      accountName: accounts.name,
      note: debtPayments.note,
    })
    .from(debtPayments)
    .leftJoin(accounts, eq(debtPayments.accountId, accounts.id))
    .where(eq(debtPayments.debtId, debtId))
    .orderBy(desc(debtPayments.date), desc(debtPayments.createdAt));
}

export type DebtsSummary = {
  base: string;
  receivable: number; // мне должны (остаток, в базовой)
  payable: number; // я должен (остаток, в базовой)
  net: number;
  openReceivable: number; // число открытых долгов
  openPayable: number;
};

export async function getDebtsSummary(): Promise<DebtsSummary> {
  const base = await getBaseCurrency();
  const [list, rates] = await Promise.all([getDebts(), getRatesMap()]);
  let receivable = 0;
  let payable = 0;
  let openReceivable = 0;
  let openPayable = 0;
  for (const d of list) {
    if (d.settled) continue;
    const inBase = toBase(d.outstanding, d.currency, rates, base);
    if (d.direction === "owed_to_me") {
      receivable += inBase;
      openReceivable++;
    } else {
      payable += inBase;
      openPayable++;
    }
  }
  return {
    base,
    receivable,
    payable,
    net: receivable - payable,
    openReceivable,
    openPayable,
  };
}

/* ─────────────────────────────  Капитал  ─────────────────────────── */

export type NetWorth = {
  base: string;
  onAccounts: number;
  receivable: number;
  payable: number;
  net: number;
  byCurrency: { currency: string; balance: number; inBase: number }[];
  missingRates: string[];
};

export async function getNetWorth(): Promise<NetWorth> {
  const base = await getBaseCurrency();
  const [accs, rates, debtsSum] = await Promise.all([
    getAccountsWithBalances(),
    getRatesMap(),
    getDebtsSummary(),
  ]);

  const perCurrency = new Map<string, number>();
  for (const a of accs) {
    perCurrency.set(a.currency, (perCurrency.get(a.currency) ?? 0) + a.balance);
  }
  let onAccounts = 0;
  const byCurrency = [...perCurrency.entries()]
    .map(([currency, balance]) => {
      const inBase = toBase(balance, currency, rates, base);
      onAccounts += inBase;
      return { currency, balance, inBase };
    })
    .sort((a, b) => b.inBase - a.inBase);

  const missingRates = [...perCurrency.keys()].filter(
    (c) => c !== base && !(rates.get(c)! > 0),
  );

  return {
    base,
    onAccounts,
    receivable: debtsSum.receivable,
    payable: debtsSum.payable,
    net: onAccounts + debtsSum.receivable - debtsSum.payable,
    byCurrency,
    missingRates,
  };
}

/* ──────────────────────  Планы и подписки  ─────────────────────── */

export type PlannedWithContext = Planned & {
  accountName: string | null;
  toAccountName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  personName: string | null;
  areaName: string | null;
  due: boolean;
};

export async function getPlanned(): Promise<PlannedWithContext[]> {
  await schemaReady();
  const today = todayISO();
  const toAcc = alias(accounts, "planned_to_acc");
  const rows = await db
    .select({
      ...getTableColumns(planned),
      accountName: accounts.name,
      toAccountName: toAcc.name,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      personName: people.name,
      areaName: areas.name,
    })
    .from(planned)
    .leftJoin(accounts, eq(planned.accountId, accounts.id))
    .leftJoin(toAcc, eq(planned.toAccountId, toAcc.id))
    .leftJoin(categories, eq(planned.categoryId, categories.id))
    .leftJoin(people, eq(planned.personId, people.id))
    .leftJoin(areas, eq(planned.areaId, areas.id))
    .orderBy(asc(planned.nextDate));
  return rows.map((p) => ({
    ...p,
    due: p.active && p.nextDate <= today,
  }));
}

/** Планы, у которых наступила дата (для напоминаний в «Сегодня»). */
export async function getDuePlanned(): Promise<PlannedWithContext[]> {
  const all = await getPlanned();
  return all.filter((p) => p.due);
}

/** Долги к возврату сегодня или просроченные (для «Сегодня»). */
export async function getDueDebts(): Promise<DebtWithOutstanding[]> {
  const today = todayISO();
  const all = await getDebts();
  return all.filter(
    (d) => !d.settled && d.dueDate != null && d.dueDate <= today,
  );
}

export async function getDuePlannedCount(): Promise<number> {
  await schemaReady();
  const today = todayISO();
  const [row] = await db
    .select({ c: sql<number>`count(*)` })
    .from(planned)
    .where(and(eq(planned.active, true), lte(planned.nextDate, today)));
  return row?.c ?? 0;
}

/** Множитель приведения периода к месяцу. */
function monthlyFactor(recurrence: string, interval: number): number {
  const i = Math.max(interval, 1);
  if (recurrence === "month") return 1 / i;
  if (recurrence === "week") return 52 / 12 / i;
  if (recurrence === "year") return 1 / (12 * i);
  return 0; // once — в месячную нагрузку не входит
}

export type MonthlyCommitment = { base: string; expense: number; income: number };

/** Зафиксированные в месяц суммы из активных подписок (в базовой валюте). */
export async function getMonthlyCommitment(): Promise<MonthlyCommitment> {
  const base = await getBaseCurrency();
  const [rows, rates] = await Promise.all([
    db.select().from(planned).where(eq(planned.active, true)),
    getRatesMap(),
  ]);
  let expense = 0;
  let income = 0;
  for (const p of rows) {
    if (p.recurrence === "once") continue;
    const perMonth = Math.round(
      toBase(p.amount, p.currency, rates, base) *
        monthlyFactor(p.recurrence, p.interval),
    );
    if (p.kind === "income") income += perMonth;
    else if (p.kind === "expense") expense += perMonth;
  }
  return { base, expense, income };
}

/* ─────────────────────────  Цели накопления  ─────────────────────── */

export type GoalWithProgress = Goal & {
  saved: number;
  remaining: number;
  pct: number;
  achieved: boolean;
  accountName: string | null;
};

export async function getGoals(): Promise<GoalWithProgress[]> {
  await schemaReady();
  const rows = await db
    .select({
      ...getTableColumns(goals),
      accountName: accounts.name,
    })
    .from(goals)
    .leftJoin(accounts, eq(goals.accountId, accounts.id))
    .orderBy(asc(goals.position), asc(goals.createdAt));

  const contrib = await db
    .select({
      goalId: goalContributions.goalId,
      total: sql<number>`sum(${goalContributions.amount})`,
    })
    .from(goalContributions)
    .groupBy(goalContributions.goalId);
  const m = new Map(contrib.map((r) => [r.goalId, r.total]));

  return rows.map((g) => {
    const saved = m.get(g.id) ?? 0;
    const remaining = Math.max(g.targetAmount - saved, 0);
    const pct =
      g.targetAmount > 0 ? Math.min((saved / g.targetAmount) * 100, 100) : 0;
    return {
      ...g,
      saved,
      remaining,
      pct,
      achieved: g.achievedAt != null || saved >= g.targetAmount,
      accountName: g.accountName,
    };
  });
}

export type GoalContributionRow = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
};

export async function getGoalContributions(
  goalId: string,
): Promise<GoalContributionRow[]> {
  await schemaReady();
  return db
    .select({
      id: goalContributions.id,
      amount: goalContributions.amount,
      date: goalContributions.date,
      note: goalContributions.note,
    })
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId))
    .orderBy(desc(goalContributions.date), desc(goalContributions.createdAt));
}

/* ───────────────────────────  Аналитика  ─────────────────────────── */

const ym = sql<string>`substr(${transactions.date}, 1, 7)`;

/** Доход/расход по месяцам (в базовой валюте), последние `n` месяцев. */
export type MonthPoint = { month: string; income: number; expense: number };

export async function getIncomeExpenseSeries(n = 12): Promise<MonthPoint[]> {
  await schemaReady();
  const base = await getBaseCurrency();
  const rates = await getRatesMap();
  const rows = await db
    .select({
      month: ym,
      kind: transactions.kind,
      currency: accounts.currency,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .groupBy(ym, transactions.kind, accounts.currency);

  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const r of rows) {
    if (r.kind === "transfer") continue;
    const inBase = toBase(r.total, r.currency, rates, base);
    const slot = byMonth.get(r.month) ?? { income: 0, expense: 0 };
    if (r.kind === "income") slot.income += inBase;
    else slot.expense += inBase;
    byMonth.set(r.month, slot);
  }

  return lastMonths(n).map((month) => ({
    month,
    income: byMonth.get(month)?.income ?? 0,
    expense: byMonth.get(month)?.expense ?? 0,
  }));
}

/** Капитал (на счетах, в базовой валюте) на конец каждого из последних `n` месяцев. */
export type CapitalPoint = { month: string; capital: number };

export async function getCapitalSeries(n = 12): Promise<CapitalPoint[]> {
  await schemaReady();
  const base = await getBaseCurrency();
  const rates = await getRatesMap();

  // Начальные остатки по валютам.
  const accRows = await db
    .select({
      currency: accounts.currency,
      opening: sql<number>`sum(${accounts.openingBalance})`,
    })
    .from(accounts)
    .groupBy(accounts.currency);
  const opening = new Map<string, number>();
  for (const r of accRows) opening.set(r.currency, r.opening);

  // Помесячные движения по валюте счёта-источника (доход/расход/перевод-исход).
  const outRows = await db
    .select({
      month: ym,
      currency: accounts.currency,
      kind: transactions.kind,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .groupBy(ym, accounts.currency, transactions.kind);

  // Помесячные зачисления переводов по валюте счёта-получателя.
  const toAcc = alias(accounts, "cap_to_acc");
  const inRows = await db
    .select({
      month: ym,
      currency: toAcc.currency,
      total: sql<number>`sum(coalesce(${transactions.amountTo}, ${transactions.amount}))`,
    })
    .from(transactions)
    .innerJoin(toAcc, eq(transactions.toAccountId, toAcc.id))
    .where(eq(transactions.kind, "transfer"))
    .groupBy(ym, toAcc.currency);

  // Дельта по (валюта, месяц).
  const delta = new Map<string, Map<string, number>>(); // currency -> month -> delta
  const bump = (cur: string, month: string, v: number) => {
    let mm = delta.get(cur);
    if (!mm) delta.set(cur, (mm = new Map()));
    mm.set(month, (mm.get(month) ?? 0) + v);
  };
  for (const r of outRows) {
    const sign = r.kind === "income" ? 1 : -1; // expense и transfer — отток
    bump(r.currency, r.month, sign * r.total);
  }
  for (const r of inRows) bump(r.currency, r.month, r.total);

  const currencies = new Set<string>([...opening.keys(), ...delta.keys()]);

  return lastMonths(n).map((month) => {
    let capital = 0;
    for (const cur of currencies) {
      let bal = opening.get(cur) ?? 0;
      const mm = delta.get(cur);
      if (mm) {
        for (const [dm, dv] of mm) if (dm <= month) bal += dv;
      }
      capital += toBase(bal, cur, rates, base);
    }
    return { month, capital };
  });
}

/** Последние n месяцев как ["YYYY-MM", …] по возрастанию, включая текущий. */
function lastMonths(n: number): string[] {
  const now = todayISO().slice(0, 7);
  const [y, m] = now.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

