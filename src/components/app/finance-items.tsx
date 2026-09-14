"use client";

import {
  ArrowRightLeft,
  CalendarDays,
  Wallet,
  GraduationCap,
  Folder,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatSigned, formatMoneyShort } from "@/lib/money";
import { currencySymbol } from "@/lib/currency";
import { financeColor, ACCOUNT_KIND_META } from "@/lib/finance-format";
import { ruMonthDayShort } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import { useUi } from "./ui-context";
import type {
  TransactionWithContext,
  AccountWithBalance,
  CategoryWithSpend,
} from "@/lib/queries";

const AMOUNT_COLOR: Record<string, string> = {
  income: "var(--success)",
  expense: "var(--text)",
  transfer: "var(--muted)",
};

export function TransactionRow({
  tx,
  showAccount = true,
}: {
  tx: TransactionWithContext;
  showAccount?: boolean;
}) {
  const { openTransaction } = useUi();
  const title =
    tx.note ||
    (tx.kind === "transfer"
      ? "Перевод"
      : tx.categoryName || (tx.kind === "income" ? "Доход" : "Расход"));
  const dotColor =
    tx.kind === "transfer"
      ? "var(--muted)"
      : financeColor(tx.categoryColor ?? tx.accountColor);

  return (
    <button
      onClick={() =>
        openTransaction({
          id: tx.id,
          kind: tx.kind,
          amount: tx.amount,
          amountTo: tx.amountTo,
          date: tx.date,
          accountId: tx.accountId,
          toAccountId: tx.toAccountId,
          categoryId: tx.categoryId,
          note: tx.note,
          areaId: tx.areaId,
          projectId: tx.projectId,
          subjectId: tx.subjectId,
          personId: tx.personId,
        })
      }
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px]"
        style={{
          background: `color-mix(in oklab, ${dotColor} 16%, transparent)`,
          color: dotColor,
        }}
      >
        {tx.kind === "transfer" ? (
          <ArrowRightLeft size={16} />
        ) : (
          tx.categoryIcon || (tx.kind === "income" ? "＋" : "－")
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] text-text">{title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} />
            {ruMonthDayShort(tx.date)}
          </span>
          {showAccount && tx.accountName && (
            <span className="inline-flex items-center gap-1">
              <Wallet size={12} />
              {tx.accountName}
              {tx.kind === "transfer" && tx.toAccountName
                ? ` → ${tx.toAccountName}`
                : ""}
            </span>
          )}
          {tx.personName && (
            <span className="inline-flex items-center gap-1">
              <User size={12} />
              {tx.personName}
            </span>
          )}
          {tx.subjectName && (
            <span className="inline-flex items-center gap-1">
              <GraduationCap size={12} />
              {tx.subjectName}
            </span>
          )}
          {tx.projectName && (
            <span className="inline-flex items-center gap-1">
              <Folder size={12} />
              {tx.projectName}
            </span>
          )}
          {tx.areaName && (
            <span className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: areaColor(tx.areaColor) }}
              />
              {tx.areaName}
            </span>
          )}
        </div>
      </div>

      <span className="shrink-0 text-right">
        <span
          className="block text-[14.5px] font-semibold tabular"
          style={{ color: AMOUNT_COLOR[tx.kind] }}
        >
          {formatSigned(tx.amount, tx.kind, tx.accountCurrency ?? "RUB")}
        </span>
        {tx.kind === "transfer" &&
          tx.amountTo != null &&
          tx.toAccountCurrency &&
          tx.toAccountCurrency !== tx.accountCurrency && (
            <span className="block text-[11.5px] text-faint tabular">
              →&nbsp;{formatMoneyShort(tx.amountTo, tx.toAccountCurrency)}
            </span>
          )}
      </span>
    </button>
  );
}

export function AccountCard({ account }: { account: AccountWithBalance }) {
  const { openEditAccount } = useUi();
  const meta = ACCOUNT_KIND_META[account.kind];
  return (
    <button
      onClick={() =>
        openEditAccount({
          id: account.id,
          name: account.name,
          kind: account.kind,
          currency: account.currency,
          openingBalance: account.openingBalance,
          color: account.color,
          icon: account.icon,
        })
      }
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[18px]"
        style={{
          background: `color-mix(in oklab, ${financeColor(account.color)} 16%, transparent)`,
          color: financeColor(account.color),
        }}
      >
        {account.icon || meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-text">
          {account.name}
        </div>
        <div className="text-[12px] text-muted">
          {meta.label} · {currencySymbol(account.currency)} {account.currency}
        </div>
      </div>
      <div
        className={cn(
          "shrink-0 text-[15px] font-semibold tabular",
          account.balance < 0 ? "text-danger" : "text-text",
        )}
      >
        {formatMoneyShort(account.balance, account.currency)}
      </div>
    </button>
  );
}

export function CategoryCard({
  category,
  base = "RUB",
}: {
  category: CategoryWithSpend;
  base?: string;
}) {
  const { openEditCategory } = useUi();
  const isExpense = category.kind === "expense";
  const budget = category.monthlyBudget;
  const over = budget != null && category.spent > budget;
  const pct =
    budget != null && budget > 0
      ? Math.min((category.spent / budget) * 100, 100)
      : 0;

  return (
    <button
      onClick={() =>
        openEditCategory({
          id: category.id,
          name: category.name,
          kind: category.kind,
          color: category.color,
          icon: category.icon,
          monthlyBudget: category.monthlyBudget,
        })
      }
      className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[15px]"
          style={{
            background: `color-mix(in oklab, ${financeColor(category.color)} 16%, transparent)`,
            color: financeColor(category.color),
          }}
        >
          {category.icon || (isExpense ? "－" : "＋")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-text">
            {category.name}
          </div>
          <div className="text-[12px] text-muted">
            {isExpense ? "Расход" : "Доход"}
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "text-[14px] font-semibold tabular",
              over ? "text-danger" : "text-text",
            )}
          >
            {formatMoneyShort(category.spent, base)}
          </div>
          {budget != null && (
            <div className="text-[11px] text-faint">
              из {formatMoneyShort(budget, base)}
            </div>
          )}
        </div>
      </div>
      {isExpense && budget != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: over ? "var(--danger)" : financeColor(category.color),
            }}
          />
        </div>
      )}
    </button>
  );
}
