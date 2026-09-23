"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { AREA_PALETTE } from "@/lib/task-format";
import {
  ACCOUNT_KINDS_ORDER,
  ACCOUNT_KIND_META,
  TX_KINDS_ORDER,
  TX_KIND_META,
} from "@/lib/finance-format";
import { parseAmount, minorToInput } from "@/lib/money";
import { CURRENCIES, currencySymbol } from "@/lib/currency";
import {
  createAccount,
  updateAccount,
  deleteAccount,
  createCategory,
  updateCategory,
  deleteCategory,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/actions";
import type {
  AccountKind,
  CategoryKind,
  TransactionKind,
} from "@/db/schema";
import {
  clientToday,
  type AreaOption,
  type ProjectOption,
  type SubjectOption,
  type PersonOption,
  type AccountOption,
  type CategoryOption,
  type TransactionPrefill,
} from "./types";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AREA_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.name}
          onClick={() => onChange(c.value)}
          className="h-7 w-7 rounded-full transition-transform hover:scale-110"
          style={{
            background: c.value,
            boxShadow: value === c.value ? `0 0 0 2px ${c.value}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export type AccountForEdit = {
  id: string;
  name: string;
  kind: AccountKind;
  currency: string;
  openingBalance: number;
  color: string | null;
  icon: string | null;
};

export function AccountDialog({
  onClose,
  account,
  defaultCurrency = "RUB",
}: {
  onClose: () => void;
  account?: AccountForEdit | null;
  defaultCurrency?: string;
}) {
  const editing = !!account;
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "card");
  const [currency, setCurrency] = useState(account?.currency ?? defaultCurrency);
  const [opening, setOpening] = useState(
    account ? minorToInput(account.openingBalance) : "",
  );
  const [color, setColor] = useState(account?.color ?? AREA_PALETTE[0].value);
  const [icon, setIcon] = useState(account?.icon ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const n = name.trim();
    if (!n) {
      setError("Введите название");
      return;
    }
    const openingMinor = opening.trim() ? parseAmount(opening) : 0;
    if (openingMinor === null) {
      setError("Некорректный начальный баланс");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          name: n,
          kind,
          currency,
          openingBalance: openingMinor,
          color,
          icon: icon || null,
        };
        if (editing && account) await updateAccount(account.id, payload);
        else await createAccount(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!account) return;
    if (!confirm("Удалить счёт? Все операции по нему тоже удалятся.")) return;
    startTransition(async () => {
      await deleteAccount(account.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Счёт" : "Новый счёт"}
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
        <div className="flex gap-2">
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 2))}
            placeholder={ACCOUNT_KIND_META[kind].icon}
            className="w-14 text-center text-lg"
            aria-label="Эмодзи"
          />
          <div className="flex-1">
            <Field error={error ?? undefined}>
              <Input
                autoFocus
                placeholder="Например, Карта Тинькофф"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-[15px]"
              />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Тип">
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value as AccountKind)}
            >
              {ACCOUNT_KINDS_ORDER.map((k) => (
                <option key={k} value={k}>
                  {ACCOUNT_KIND_META[k].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Валюта">
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label={`Начальный баланс, ${currencySymbol(currency)}`}
          hint={editing ? undefined : "Сколько сейчас на счёте"}
        >
          <Input
            inputMode="decimal"
            placeholder="0"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
        </Field>
        <Field label="Цвет">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </div>
    </Modal>
  );
}

export type CategoryForEdit = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string | null;
  icon: string | null;
  monthlyBudget: number | null;
};

export function CategoryDialog({
  onClose,
  category,
  defaultKind,
}: {
  onClose: () => void;
  category?: CategoryForEdit | null;
  defaultKind?: CategoryKind;
}) {
  const editing = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(
    category?.kind ?? defaultKind ?? "expense",
  );
  const [color, setColor] = useState(category?.color ?? AREA_PALETTE[0].value);
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [budget, setBudget] = useState(
    category?.monthlyBudget != null ? minorToInput(category.monthlyBudget) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const n = name.trim();
    if (!n) {
      setError("Введите название");
      return;
    }
    const budgetMinor =
      kind === "expense" && budget.trim() ? parseAmount(budget) : null;
    if (budget.trim() && budgetMinor === null) {
      setError("Некорректный бюджет");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          name: n,
          kind,
          color,
          icon: icon || null,
          monthlyBudget: budgetMinor,
        };
        if (editing && category) await updateCategory(category.id, payload);
        else await createCategory(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!category) return;
    if (!confirm("Удалить категорию? Операции останутся без категории.")) return;
    startTransition(async () => {
      await deleteCategory(category.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Категория" : "Новая категория"}
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
        <div className="flex gap-2">
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 2))}
            placeholder="🍔"
            className="w-14 text-center text-lg"
            aria-label="Эмодзи"
          />
          <div className="flex-1">
            <Field error={error ?? undefined}>
              <Input
                autoFocus
                placeholder="Например, Еда"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-[15px]"
              />
            </Field>
          </div>
        </div>
        <Field label="Тип">
          <div className="flex gap-1.5">
            {(["expense", "income"] as CategoryKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "h-9 flex-1 rounded-lg border text-[13px] font-medium transition-colors",
                  kind === k
                    ? "border-transparent bg-surface-3 text-text"
                    : "border-border text-muted hover:bg-surface-2",
                )}
              >
                {k === "expense" ? "Расход" : "Доход"}
              </button>
            ))}
          </div>
        </Field>
        {kind === "expense" && (
          <Field label="Месячный бюджет" hint="Необязательно">
            <Input
              inputMode="decimal"
              placeholder="Без лимита"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </Field>
        )}
        <Field label="Цвет">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </div>
    </Modal>
  );
}

export type TransactionForEdit = {
  id: string;
  kind: TransactionKind;
  amount: number;
  amountTo: number | null;
  date: string;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  areaId: string | null;
  projectId: string | null;
  subjectId: string | null;
  personId: string | null;
};

export function TransactionDialog({
  onClose,
  tx,
  prefill,
  accountOptions,
  categoryOptions,
  areaOptions,
  projectOptions,
  subjectOptions,
  personOptions,
}: {
  onClose: () => void;
  tx?: TransactionForEdit | null;
  prefill?: TransactionPrefill;
  accountOptions: AccountOption[];
  categoryOptions: CategoryOption[];
  areaOptions: AreaOption[];
  projectOptions: ProjectOption[];
  subjectOptions: SubjectOption[];
  personOptions: PersonOption[];
}) {
  const editing = !!tx;
  const [kind, setKind] = useState<TransactionKind>(
    tx?.kind ?? prefill?.kind ?? "expense",
  );
  const [amount, setAmount] = useState(tx ? minorToInput(tx.amount) : "");
  const [amountTo, setAmountTo] = useState(
    tx?.amountTo != null ? minorToInput(tx.amountTo) : "",
  );
  const [date, setDate] = useState(tx?.date ?? prefill?.date ?? clientToday());
  const [accountId, setAccountId] = useState(
    tx?.accountId ?? prefill?.accountId ?? accountOptions[0]?.id ?? "",
  );
  const [toAccountId, setToAccountId] = useState(tx?.toAccountId ?? "");
  const [categoryId, setCategoryId] = useState(
    tx?.categoryId ?? prefill?.categoryId ?? "",
  );
  const [note, setNote] = useState(tx?.note ?? "");
  const [areaId, setAreaId] = useState(tx?.areaId ?? prefill?.areaId ?? "");
  const [projectId, setProjectId] = useState(
    tx?.projectId ?? prefill?.projectId ?? "",
  );
  const [subjectId, setSubjectId] = useState(
    tx?.subjectId ?? prefill?.subjectId ?? "",
  );
  const [personId, setPersonId] = useState(
    tx?.personId ?? prefill?.personId ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cats = categoryOptions.filter(
    (c) => c.kind === (kind === "income" ? "income" : "expense"),
  );

  const srcCur =
    accountOptions.find((a) => a.id === accountId)?.currency ?? "RUB";
  const dstCur =
    accountOptions.find((a) => a.id === toAccountId)?.currency ?? srcCur;
  const crossCurrency = kind === "transfer" && !!toAccountId && dstCur !== srcCur;

  function submit() {
    const minor = parseAmount(amount);
    if (!minor) {
      setError("Введите сумму");
      return;
    }
    if (!accountId) {
      setError("Выберите счёт");
      return;
    }
    if (kind === "transfer" && (!toAccountId || toAccountId === accountId)) {
      setError("Выберите другой счёт-получатель");
      return;
    }
    let amountToMinor: number | null = null;
    if (crossCurrency) {
      amountToMinor = parseAmount(amountTo);
      if (!amountToMinor) {
        setError(`Введите сумму в ${currencySymbol(dstCur)}`);
        return;
      }
    }
    startTransition(async () => {
      try {
        const payload = {
          accountId,
          kind,
          amount: minor,
          amountTo: kind === "transfer" ? amountToMinor : null,
          date,
          note: note.trim() || null,
          toAccountId: kind === "transfer" ? toAccountId : null,
          categoryId: kind === "transfer" ? null : categoryId || null,
          areaId: kind === "transfer" ? null : areaId || null,
          projectId: kind === "transfer" ? null : projectId || null,
          subjectId: kind === "transfer" ? null : subjectId || null,
          personId: kind === "transfer" ? null : personId || null,
        };
        if (editing && tx) await updateTransaction(tx.id, payload);
        else await createTransaction(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!tx) return;
    if (!confirm("Удалить операцию?")) return;
    startTransition(async () => {
      await deleteTransaction(tx.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Операция" : "Новая операция"}
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
              {editing ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Вид операции */}
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
          <Field label={`Сумма, ${currencySymbol(srcCur)}`} error={error ?? undefined}>
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              className="h-11 text-[16px] tabular"
            />
          </Field>
          <Field label="Дата">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </Field>
        </div>

        {crossCurrency && (
          <Field
            label={`Зачислится на счёт, ${currencySymbol(dstCur)}`}
            hint={`Курс перевода ${currencySymbol(srcCur)} → ${currencySymbol(dstCur)} может отличаться от общего`}
          >
            <Input
              inputMode="decimal"
              placeholder="0"
              value={amountTo}
              onChange={(e) => setAmountTo(e.target.value)}
              className="h-11 text-[16px] tabular"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <Field label="Комментарий">
          <Input
            placeholder="Например, продукты на неделю"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

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
      </div>
    </Modal>
  );
}
