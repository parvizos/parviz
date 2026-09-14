"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  RotateCcw,
  Pause,
  Play,
  Zap,
  CalendarClock,
  Pencil,
  Repeat,
  Target,
  ArrowLeftRight,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { formatMoney, formatMoneyShort, parseAmount, minorToInput } from "@/lib/money";
import { currencySymbol, currencyMeta } from "@/lib/currency";
import { ruMonthDayShort } from "@/lib/dates";
import { financeColor } from "@/lib/finance-format";
import {
  addDebtPayment,
  setDebtSettled,
  addGoalContribution,
  setRate,
  deleteRate,
  postPlanned,
  setPlannedActive,
} from "@/lib/finance-actions";
import { useUi } from "./ui-context";
import { clientToday, type AccountOption } from "./types";
import type {
  DebtWithOutstanding,
  PlannedWithContext,
  GoalWithProgress,
  RateRow,
} from "@/lib/finance-queries";
import type { PlannedRecurrence } from "@/db/schema";

/* ─────────────────────────────  Кнопки  ───────────────────────────── */

export function NewDebtButton({
  direction,
  personId,
  variant = "primary",
  children = "Долг",
}: {
  direction?: "owed_to_me" | "i_owe";
  personId?: string | null;
  variant?: "primary" | "secondary" | "soft";
  children?: ReactNode;
}) {
  const { openNewDebt } = useUi();
  return (
    <Button
      size="sm"
      variant={variant}
      onClick={() => openNewDebt({ direction, personId })}
    >
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function NewPlannedButton({
  children = "План",
}: {
  children?: ReactNode;
}) {
  const { openNewPlanned } = useUi();
  return (
    <Button size="sm" onClick={() => openNewPlanned()}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function NewGoalButton({ children = "Цель" }: { children?: ReactNode }) {
  const { openNewGoal } = useUi();
  return (
    <Button size="sm" onClick={() => openNewGoal()}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

/* ─────────────────────────  Возврат по долгу  ───────────────────────── */

function DebtPaymentDialog({
  onClose,
  debtId,
  currency,
  outstanding,
  accountOptions,
}: {
  onClose: () => void;
  debtId: string;
  currency: string;
  outstanding: number;
  accountOptions: AccountOption[];
}) {
  const [amount, setAmount] = useState(minorToInput(outstanding));
  const [date, setDate] = useState(clientToday());
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const minor = parseAmount(amount);
    if (!minor) {
      setError("Введите сумму");
      return;
    }
    startTransition(async () => {
      try {
        await addDebtPayment({
          debtId,
          amount: minor,
          date,
          accountId: accountId || null,
          note: note.trim() || null,
        });
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Возврат по долгу"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            Записать
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label={`Сумма, ${currencySymbol(currency)}`}
          error={error ?? undefined}
          hint={`Осталось ${formatMoney(outstanding, currency)}`}
        >
          <Input
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 text-[16px] tabular"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Дата">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Через счёт" hint="Справочно">
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">—</option>
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Заметка">
          <Input
            placeholder="Необязательно"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

export function DebtCard({
  debt,
  accountOptions,
}: {
  debt: DebtWithOutstanding;
  accountOptions: AccountOption[];
}) {
  const { openEditDebt } = useUi();
  const [payOpen, setPayOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const incoming = debt.direction === "owed_to_me";
  const tone = incoming ? "var(--success)" : "var(--danger)";
  const who = debt.personName || debt.counterparty || "Без имени";
  const pct =
    debt.principal > 0 ? Math.min((debt.paid / debt.principal) * 100, 100) : 0;
  const today = clientToday();
  const overdue = !debt.settled && debt.dueDate != null && debt.dueDate < today;

  function toEdit() {
    openEditDebt({
      id: debt.id,
      direction: debt.direction,
      personId: debt.personId,
      counterparty: debt.counterparty,
      title: debt.title,
      currency: debt.currency,
      principal: debt.principal,
      date: debt.date,
      dueDate: debt.dueDate,
      note: debt.note,
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-surface p-4",
        debt.settled ? "border-border opacity-70" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={toEdit}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `color-mix(in oklab, ${tone} 16%, transparent)`,
              color: tone,
            }}
          >
            {incoming ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14.5px] font-medium text-text">
                {who}
              </span>
              {debt.settled && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-3 px-1.5 text-[10.5px] font-medium text-muted">
                  <Check size={10} /> закрыт
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[12.5px] text-muted">
              {incoming ? "должен тебе" : "ты должен"}
              {debt.title ? ` · ${debt.title}` : ""}
            </div>
          </div>
        </button>
        <div className="shrink-0 text-right">
          <div
            className="text-[15px] font-semibold tabular"
            style={{ color: debt.settled ? "var(--muted)" : tone }}
          >
            {formatMoneyShort(debt.settled ? 0 : debt.outstanding, debt.currency)}
          </div>
          {debt.paid > 0 && !debt.settled && (
            <div className="text-[11px] text-faint tabular">
              из {formatMoneyShort(debt.principal, debt.currency)}
            </div>
          )}
        </div>
      </div>

      {debt.paid > 0 && !debt.settled && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: tone }}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1 text-[12px]",
            overdue ? "font-medium text-danger" : "text-faint",
          )}
        >
          {debt.dueDate ? (
            <>
              <CalendarClock size={12} />
              {overdue ? "просрочен · " : "до "}
              {ruMonthDayShort(debt.dueDate)}
            </>
          ) : (
            <>с {ruMonthDayShort(debt.date)}</>
          )}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {!debt.settled && (
            <Button size="sm" variant="secondary" onClick={() => setPayOpen(true)}>
              <Plus size={14} /> Возврат
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            title={debt.settled ? "Открыть снова" : "Отметить закрытым"}
            onClick={() =>
              startTransition(async () => {
                await setDebtSettled(debt.id, !debt.settled);
              })
            }
          >
            {debt.settled ? <RotateCcw size={15} /> : <Check size={15} />}
          </Button>
        </div>
      </div>

      {payOpen && (
        <DebtPaymentDialog
          onClose={() => setPayOpen(false)}
          debtId={debt.id}
          currency={debt.currency}
          outstanding={debt.outstanding}
          accountOptions={accountOptions}
        />
      )}
    </div>
  );
}

/* ──────────────────────────  Курсы валют  ─────────────────────────── */

function RateDialog({
  onClose,
  code,
  base,
  current,
}: {
  onClose: () => void;
  code: string;
  base: string;
  current: number | null;
}) {
  const [rate, setRate_] = useState(current != null ? String(current) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const v = Number(rate.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      setError("Курс должен быть больше нуля");
      return;
    }
    startTransition(async () => {
      try {
        await setRate({ code, rateToBase: v });
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Курс ${code}`}
      footer={
        <div className="flex w-full items-center justify-between">
          {current != null ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteRate(code);
                  onClose();
                })
              }
            >
              Сбросить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              Сохранить
            </Button>
          </div>
        </div>
      }
    >
      <Field
        label={`Сколько ${base} стоит 1 ${code}`}
        error={error ?? undefined}
        hint={`Например, 1 ${code} = 90 ${base} → впиши 90`}
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] text-muted">1&nbsp;{code}&nbsp;=</span>
          <Input
            autoFocus
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate_(e.target.value)}
            className="h-11 flex-1 text-[16px] tabular"
          />
          <span className="text-[15px] text-muted">{currencySymbol(base)}</span>
        </div>
      </Field>
    </Modal>
  );
}

export function RatesCard({ rates, base }: { rates: RateRow[]; base: string }) {
  const [edit, setEdit] = useState<RateRow | null>(null);
  if (rates.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <Repeat size={15} className="text-muted" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Курсы к {base}
        </h2>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {rates.map((r) => (
          <button
            key={r.code}
            onClick={() => setEdit(r)}
            className="flex items-center gap-3 py-2 text-left transition-colors hover:bg-surface-2"
          >
            <span className="w-16 text-[13.5px] font-medium text-text">
              {currencySymbol(r.code)} {r.code}
            </span>
            <span className="flex-1 text-[13px] text-muted tabular">
              {r.rateToBase != null ? (
                <>
                  1 {r.code} = {r.rateToBase} {currencySymbol(base)}
                </>
              ) : (
                <span className="text-danger">курс не задан</span>
              )}
            </span>
            <Pencil size={14} className="text-faint" />
          </button>
        ))}
      </div>
      {edit && (
        <RateDialog
          onClose={() => setEdit(null)}
          code={edit.code}
          base={base}
          current={edit.rateToBase}
        />
      )}
    </div>
  );
}

/* ────────────────────────  Планы и подписки  ──────────────────────── */

const RECUR_SHORT: Record<PlannedRecurrence, string> = {
  once: "разово",
  week: "в неделю",
  month: "в месяц",
  year: "в год",
};

export function PlannedRow({ plan }: { plan: PlannedWithContext }) {
  const { openEditPlanned } = useUi();
  const [pending, startTransition] = useTransition();
  const tone =
    plan.kind === "income"
      ? "var(--success)"
      : plan.kind === "transfer"
        ? "var(--muted)"
        : financeColor(plan.categoryColor);
  const sign = plan.kind === "income" ? "+" : plan.kind === "expense" ? "−" : "";
  const recurLabel =
    plan.recurrence === "once"
      ? "разовый"
      : plan.interval > 1
        ? `каждые ${plan.interval} · ${RECUR_SHORT[plan.recurrence]}`
        : RECUR_SHORT[plan.recurrence];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5",
        !plan.active && "opacity-60",
      )}
    >
      <button
        onClick={() =>
          openEditPlanned({
            id: plan.id,
            title: plan.title,
            kind: plan.kind,
            amount: plan.amount,
            currency: plan.currency,
            accountId: plan.accountId,
            toAccountId: plan.toAccountId,
            categoryId: plan.categoryId,
            areaId: plan.areaId,
            projectId: plan.projectId,
            subjectId: plan.subjectId,
            personId: plan.personId,
            recurrence: plan.recurrence,
            interval: plan.interval,
            nextDate: plan.nextDate,
            autopost: plan.autopost,
            note: plan.note,
          })
        }
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px]"
          style={{
            background: `color-mix(in oklab, ${tone} 16%, transparent)`,
            color: tone,
          }}
        >
          {plan.categoryIcon || (plan.recurrence === "once" ? "◇" : <Repeat size={15} />)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] text-text">{plan.title}</span>
            {plan.autopost && (
              <Zap size={12} className="shrink-0 text-accent" />
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
            <span className={plan.due ? "font-medium text-accent" : ""}>
              {plan.due ? "сегодня" : ruMonthDayShort(plan.nextDate)}
            </span>
            <span className="text-faint">· {recurLabel}</span>
            {plan.categoryName && <span>· {plan.categoryName}</span>}
          </div>
        </div>
      </button>

      <span
        className="shrink-0 text-[14px] font-semibold tabular"
        style={{ color: tone }}
      >
        {sign}
        {formatMoneyShort(plan.amount, plan.currency)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        {plan.active && (
          <Button
            size="sm"
            variant={plan.due ? "primary" : "secondary"}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await postPlanned(plan.id);
              })
            }
          >
            Провести
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          title={plan.active ? "Приостановить" : "Возобновить"}
          onClick={() =>
            startTransition(async () => {
              await setPlannedActive(plan.id, !plan.active);
            })
          }
        >
          {plan.active ? <Pause size={15} /> : <Play size={15} />}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────  Цели  ───────────────────────────── */

function GoalContributionDialog({
  onClose,
  goalId,
  currency,
  remaining,
}: {
  onClose: () => void;
  goalId: string;
  currency: string;
  remaining: number;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(clientToday());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const minor = parseAmount(amount);
    if (!minor) {
      setError("Введите сумму");
      return;
    }
    startTransition(async () => {
      try {
        await addGoalContribution({
          goalId,
          amount: minor,
          date,
          note: note.trim() || null,
        });
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Отложить в цель"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            Отложить
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={`Сумма, ${currencySymbol(currency)}`} error={error ?? undefined}>
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 text-[16px] tabular"
            />
            {remaining > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAmount(minorToInput(remaining))}
              >
                Остаток
              </Button>
            )}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Дата">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Заметка">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export function GoalCard({ goal }: { goal: GoalWithProgress }) {
  const { openEditGoal } = useUi();
  const [addOpen, setAddOpen] = useState(false);
  const color = financeColor(goal.color);
  const today = clientToday();

  // Сколько откладывать в месяц, чтобы успеть к сроку.
  let pace: string | null = null;
  if (goal.dueDate && !goal.achieved && goal.remaining > 0 && goal.dueDate > today) {
    const [y, m] = today.split("-").map(Number);
    const [dy, dm] = goal.dueDate.split("-").map(Number);
    const months = Math.max((dy - y) * 12 + (dm - m), 1);
    pace = `≈ ${formatMoneyShort(Math.ceil(goal.remaining / months), goal.currency)}/мес`;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() =>
            openEditGoal({
              id: goal.id,
              title: goal.title,
              targetAmount: goal.targetAmount,
              currency: goal.currency,
              accountId: goal.accountId,
              dueDate: goal.dueDate,
              color: goal.color,
              icon: goal.icon,
              note: goal.note,
            })
          }
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px]"
            style={{
              background: `color-mix(in oklab, ${color} 16%, transparent)`,
              color,
            }}
          >
            {goal.icon || <Target size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14.5px] font-medium text-text">
                {goal.title}
              </span>
              {goal.achieved && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 text-[10.5px] font-medium text-success">
                  <Check size={10} /> цель
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted tabular">
              {formatMoneyShort(goal.saved, goal.currency)} из{" "}
              {formatMoneyShort(goal.targetAmount, goal.currency)}
            </div>
          </div>
        </button>
        <div className="shrink-0 text-right">
          <div className="text-[13px] font-semibold tabular" style={{ color }}>
            {Math.round(goal.pct)}%
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${goal.pct}%`, background: color }}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[12px] text-faint">
          {goal.achieved ? (
            "Цель достигнута 🎉"
          ) : (
            <>
              осталось {formatMoneyShort(goal.remaining, goal.currency)}
              {pace ? ` · ${pace}` : ""}
            </>
          )}
        </span>
        <div className="ml-auto">
          <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Отложить
          </Button>
        </div>
      </div>

      {addOpen && (
        <GoalContributionDialog
          onClose={() => setAddOpen(false)}
          goalId={goal.id}
          currency={goal.currency}
          remaining={goal.remaining}
        />
      )}
    </div>
  );
}

/* ─────────────────────────  Конвертер валют  ───────────────────────── */

export function CurrencyConverter({
  rates,
  base,
}: {
  rates: { code: string; rateToBase: number }[];
  base: string;
}) {
  const map = new Map<string, number>([[base, 1], ...rates.map((r) => [r.code, r.rateToBase] as const)]);
  const codes = [base, ...rates.map((r) => r.code)];

  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(codes[1] ?? base);
  const [to, setTo] = useState(base);

  const value = Number(amount.replace(",", ".")) || 0;
  const rateFrom = map.get(from) ?? 1;
  const rateTo = map.get(to) ?? 1;
  const converted = (value * rateFrom) / rateTo;
  const unitRate = rateFrom / rateTo;

  const fmt = (n: number) =>
    n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <ArrowLeftRight size={15} className="text-muted" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Конвертер
        </h2>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 text-[16px] tabular"
            aria-label="Сумма"
          />
        </div>
        <Select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-11 w-24"
          aria-label="Из валюты"
        >
          {codes.map((c) => (
            <option key={c} value={c}>
              {currencySymbol(c)} {c}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={swap}
          aria-label="Поменять местами"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeftRight size={16} />
        </button>
        <Select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-11 w-24"
          aria-label="В валюту"
        >
          {codes.map((c) => (
            <option key={c} value={c}>
              {currencySymbol(c)} {c}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[20px] font-semibold tabular text-text">
          {fmt(converted)}{" "}
          <span className="text-[14px] font-normal text-muted">
            {currencySymbol(to)}
          </span>
        </span>
        <span className="text-[12px] text-faint tabular">
          1 {from} = {fmt(unitRate)} {currencyMeta(to).symbol}
        </span>
      </div>
    </div>
  );
}
