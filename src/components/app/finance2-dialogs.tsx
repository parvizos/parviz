"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { AREA_PALETTE } from "@/lib/task-format";
import { TX_KINDS_ORDER, TX_KIND_META, financeColor } from "@/lib/finance-format";
import { AvatarUpload } from "./EntityAvatar";
import { parseAmount, minorToInput } from "@/lib/money";
import { CURRENCIES, currencySymbol } from "@/lib/currency";
import { ColorPicker } from "./finance-dialogs";
import {
  createDebt,
  updateDebt,
  deleteDebt,
  createPlanned,
  updatePlanned,
  deletePlanned,
  createGoal,
  updateGoal,
  deleteGoal,
} from "@/lib/finance-actions";
import type {
  DebtDirection,
  TransactionKind,
  PlannedRecurrence,
} from "@/db/schema";
import {
  clientToday,
  type AccountOption,
  type CategoryOption,
  type AreaOption,
  type ProjectOption,
  type SubjectOption,
  type PersonOption,
} from "./types";

function CurrencySelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      aria-label="Валюта"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </Select>
  );
}

/* ─────────────────────────────  Долг  ───────────────────────────── */

export type DebtForEdit = {
  id: string;
  direction: DebtDirection;
  personId: string | null;
  counterparty: string | null;
  title: string | null;
  currency: string;
  principal: number;
  date: string;
  dueDate: string | null;
  note: string | null;
};

export function DebtDialog({
  onClose,
  debt,
  defaultDirection,
  defaultPersonId,
  defaultCurrency = "RUB",
  personOptions,
}: {
  onClose: () => void;
  debt?: DebtForEdit | null;
  defaultDirection?: DebtDirection;
  defaultPersonId?: string | null;
  defaultCurrency?: string;
  personOptions: PersonOption[];
}) {
  const editing = !!debt;
  const [direction, setDirection] = useState<DebtDirection>(
    debt?.direction ?? defaultDirection ?? "owed_to_me",
  );
  const [amount, setAmount] = useState(debt ? minorToInput(debt.principal) : "");
  const [currency, setCurrency] = useState(debt?.currency ?? defaultCurrency);
  const [personId, setPersonId] = useState(
    debt?.personId ?? defaultPersonId ?? "",
  );
  const [counterparty, setCounterparty] = useState(debt?.counterparty ?? "");
  const [title, setTitle] = useState(debt?.title ?? "");
  const [date, setDate] = useState(debt?.date ?? clientToday());
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? "");
  const [note, setNote] = useState(debt?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const minor = parseAmount(amount);
    if (!minor) {
      setError("Введите сумму");
      return;
    }
    if (!personId && !counterparty.trim()) {
      setError("Укажите человека или имя");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          direction,
          principal: minor,
          currency,
          personId: personId || null,
          counterparty: personId ? null : counterparty.trim() || null,
          title: title.trim() || null,
          date,
          dueDate: dueDate || null,
          note: note.trim() || null,
        };
        if (editing && debt) await updateDebt(debt.id, payload);
        else await createDebt(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!debt) return;
    if (!confirm("Удалить долг вместе с историей возвратов?")) return;
    startTransition(async () => {
      await deleteDebt(debt.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Долг" : "Новый долг"}
      footer={
        <div className="flex w-full items-center justify-between">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 size={15} /> Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-1.5">
          {(
            [
              ["owed_to_me", "Мне должны"],
              ["i_owe", "Я должен"],
            ] as [DebtDirection, string][]
          ).map(([d, label]) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={cn(
                "h-9 flex-1 rounded-lg border text-[13px] font-medium transition-colors",
                direction === d
                  ? d === "owed_to_me"
                    ? "border-transparent bg-success-soft text-success"
                    : "border-transparent bg-danger-soft text-danger"
                  : "border-border text-muted hover:bg-surface-2",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Сумма" error={error ?? undefined}>
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 text-[16px] tabular"
            />
          </Field>
          <Field label="Валюта">
            <CurrencySelect
              value={currency}
              onChange={setCurrency}
              className="h-11"
            />
          </Field>
        </div>

        <Field label="Человек" hint="Из «Людей» — долг появится в его карточке">
          <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">— вписать имя вручную —</option>
            {personOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        {!personId && (
          <Field label="Имя">
            <Input
              placeholder="Например, Азиз"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
            />
          </Field>
        )}

        <Field label="За что">
          <Input
            placeholder="Например, за учебник"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Когда взяли">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Вернуть до" hint="Необязательно">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
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

/* ────────────────────────  План / подписка  ──────────────────────── */

const RECURRENCE_LABELS: Record<PlannedRecurrence, string> = {
  once: "Разово",
  week: "Каждую неделю",
  month: "Каждый месяц",
  year: "Каждый год",
};

export type PlannedForEdit = {
  id: string;
  title: string;
  kind: TransactionKind;
  amount: number;
  currency: string;
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  areaId: string | null;
  projectId: string | null;
  subjectId: string | null;
  personId: string | null;
  recurrence: PlannedRecurrence;
  interval: number;
  nextDate: string;
  autopost: boolean;
  note: string | null;
};

export function PlannedDialog({
  onClose,
  plan,
  accountOptions,
  categoryOptions,
  areaOptions,
  projectOptions,
  subjectOptions,
  personOptions,
}: {
  onClose: () => void;
  plan?: PlannedForEdit | null;
  accountOptions: AccountOption[];
  categoryOptions: CategoryOption[];
  areaOptions: AreaOption[];
  projectOptions: ProjectOption[];
  subjectOptions: SubjectOption[];
  personOptions: PersonOption[];
}) {
  const editing = !!plan;
  const [title, setTitle] = useState(plan?.title ?? "");
  const [kind, setKind] = useState<TransactionKind>(plan?.kind ?? "expense");
  const [amount, setAmount] = useState(plan ? minorToInput(plan.amount) : "");
  const [accountId, setAccountId] = useState(
    plan?.accountId ?? accountOptions[0]?.id ?? "",
  );
  const [toAccountId, setToAccountId] = useState(plan?.toAccountId ?? "");
  const [categoryId, setCategoryId] = useState(plan?.categoryId ?? "");
  const [recurrence, setRecurrence] = useState<PlannedRecurrence>(
    plan?.recurrence ?? "month",
  );
  const [interval, setInterval] = useState(String(plan?.interval ?? 1));
  const [nextDate, setNextDate] = useState(plan?.nextDate ?? clientToday());
  const [autopost, setAutopost] = useState(plan?.autopost ?? false);
  const [areaId, setAreaId] = useState(plan?.areaId ?? "");
  const [projectId, setProjectId] = useState(plan?.projectId ?? "");
  const [subjectId, setSubjectId] = useState(plan?.subjectId ?? "");
  const [personId, setPersonId] = useState(plan?.personId ?? "");
  const [note, setNote] = useState(plan?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const currency =
    accountOptions.find((a) => a.id === accountId)?.currency ?? "RUB";
  const cats = categoryOptions.filter(
    (c) => c.kind === (kind === "income" ? "income" : "expense"),
  );

  function submit() {
    const minor = parseAmount(amount);
    if (!minor) {
      setError("Введите сумму");
      return;
    }
    if (!title.trim()) {
      setError("Введите название");
      return;
    }
    if (!accountId) {
      setError("Выберите счёт");
      return;
    }
    if (kind === "transfer" && (!toAccountId || toAccountId === accountId)) {
      setError("Выберите счёт-получатель");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          kind,
          amount: minor,
          currency,
          accountId,
          toAccountId: kind === "transfer" ? toAccountId || null : null,
          categoryId: kind === "transfer" ? null : categoryId || null,
          recurrence,
          interval: Math.max(Number(interval) || 1, 1),
          nextDate,
          autopost,
          areaId: areaId || null,
          projectId: projectId || null,
          subjectId: subjectId || null,
          personId: kind === "transfer" ? null : personId || null,
          note: note.trim() || null,
        };
        if (editing && plan) await updatePlanned(plan.id, payload);
        else await createPlanned(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!plan) return;
    if (!confirm("Удалить план?")) return;
    startTransition(async () => {
      await deletePlanned(plan.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "План" : "Новый план"}
      description="Разовый — попадёт в планировщик, регулярный — станет подпиской."
      footer={
        <div className="flex w-full items-center justify-between">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 size={15} /> Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field error={error ?? undefined}>
          <Input
            autoFocus
            placeholder="Например, Подписка Spotify"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 text-[15px]"
          />
        </Field>

        <div className="flex gap-1.5">
          {TX_KINDS_ORDER.map((k) => {
            const active = kind === k;
            const tone = TX_KIND_META[k].tone;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "h-9 flex-1 rounded-lg border text-[13px] font-medium transition-colors",
                  active
                    ? tone === "income"
                      ? "border-transparent bg-success-soft text-success"
                      : tone === "expense"
                        ? "border-transparent bg-danger-soft text-danger"
                        : "border-transparent bg-surface-3 text-text"
                    : "border-border text-muted hover:bg-surface-2",
                )}
              >
                {TX_KIND_META[k].label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={`Сумма, ${currencySymbol(currency)}`}>
            <Input
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 text-[16px] tabular"
            />
          </Field>
          <Field label={kind === "transfer" ? "Со счёта" : "Счёт"}>
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {kind === "transfer" ? (
          <Field label="На счёт">
            <Select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
            >
              <option value="">Выберите…</option>
              {accountOptions
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </Field>
        ) : (
          <Field label="Категория">
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Без категории</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Как часто">
            <Select
              value={recurrence}
              onChange={(e) =>
                setRecurrence(e.target.value as PlannedRecurrence)
              }
            >
              {(Object.keys(RECURRENCE_LABELS) as PlannedRecurrence[]).map(
                (r) => (
                  <option key={r} value={r}>
                    {RECURRENCE_LABELS[r]}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field
            label={recurrence === "once" ? "Дата" : "Ближайшее списание"}
          >
            <Input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
            />
          </Field>
        </div>

        {recurrence !== "once" && (
          <Field label="Интервал" hint="1 = каждый период, 2 = через раз">
            <Input
              inputMode="numeric"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            />
          </Field>
        )}

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5">
          <input
            type="checkbox"
            checked={autopost}
            onChange={(e) => setAutopost(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-[13.5px] text-text">
            Проводить автоматически
            <span className="block text-[12px] text-faint">
              Иначе будет ждать кнопки «Провести»
            </span>
          </span>
        </label>

        {kind !== "transfer" && (
          <div>
            <div className="mb-2 text-[12px] font-medium text-faint">
              Привязка (необязательно)
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                <option value="">Сфера</option>
                {areaOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              <Select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Предмет</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Проект</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
              >
                <option value="">Человек</option>
                {personOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

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

/* ─────────────────────────────  Цель  ───────────────────────────── */

export type GoalForEdit = {
  id: string;
  title: string;
  targetAmount: number;
  currency: string;
  accountId: string | null;
  dueDate: string | null;
  color: string | null;
  icon: string | null;
  image: string | null;
  note: string | null;
};

export function GoalDialog({
  onClose,
  goal,
  accountOptions,
  defaultCurrency = "RUB",
}: {
  onClose: () => void;
  goal?: GoalForEdit | null;
  accountOptions: AccountOption[];
  defaultCurrency?: string;
}) {
  const editing = !!goal;
  const [title, setTitle] = useState(goal?.title ?? "");
  const [target, setTarget] = useState(
    goal ? minorToInput(goal.targetAmount) : "",
  );
  const [currency, setCurrency] = useState(goal?.currency ?? defaultCurrency);
  const [accountId, setAccountId] = useState(goal?.accountId ?? "");
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? "");
  const [color, setColor] = useState(goal?.color ?? AREA_PALETTE[0].value);
  const [icon, setIcon] = useState(goal?.icon ?? "");
  const [image, setImage] = useState<string | null>(goal?.image ?? null);
  const [note, setNote] = useState(goal?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const minor = parseAmount(target);
    if (!minor) {
      setError("Введите цель");
      return;
    }
    if (!title.trim()) {
      setError("Введите название");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          targetAmount: minor,
          currency,
          accountId: accountId || null,
          dueDate: dueDate || null,
          color,
          icon: icon || null,
          image,
          note: note.trim() || null,
        };
        if (editing && goal) await updateGoal(goal.id, payload);
        else await createGoal(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!goal) return;
    if (!confirm("Удалить цель вместе с историей взносов?")) return;
    startTransition(async () => {
      await deleteGoal(goal.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Цель" : "Новая цель"}
      footer={
        <div className="flex w-full items-center justify-between">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 size={15} /> Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5">
          <AvatarUpload
            value={image}
            onChange={setImage}
            emoji={icon || "🎯"}
            tone={financeColor(color)}
            name={title}
            size={52}
          />
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 2))}
            placeholder="🎯"
            className="w-12 text-center text-lg"
            aria-label="Эмодзи"
          />
          <div className="flex-1">
            <Field error={error ?? undefined}>
              <Input
                autoFocus
                placeholder="Например, Новый ноутбук"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 text-[15px]"
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Цель, сумма">
            <Input
              inputMode="decimal"
              placeholder="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-11 text-[16px] tabular"
            />
          </Field>
          <Field label="Валюта">
            <CurrencySelect
              value={currency}
              onChange={setCurrency}
              className="h-11"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Копится на счёте" hint="Необязательно">
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">— не привязано —</option>
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Срок" hint="Необязательно">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Цвет">
          <ColorPicker value={color} onChange={setColor} />
        </Field>

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
