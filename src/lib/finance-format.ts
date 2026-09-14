import type { AccountKind, TransactionKind } from "@/db/schema";

export const ACCOUNT_KIND_META: Record<
  AccountKind,
  { label: string; icon: string }
> = {
  cash: { label: "Наличные", icon: "💵" },
  card: { label: "Карта", icon: "💳" },
  bank: { label: "Счёт в банке", icon: "🏦" },
  savings: { label: "Накопления", icon: "🐷" },
  other: { label: "Другое", icon: "◦" },
};

export const ACCOUNT_KINDS_ORDER: AccountKind[] = [
  "card",
  "cash",
  "bank",
  "savings",
  "other",
];

export const TX_KIND_META: Record<
  TransactionKind,
  { label: string; tone: "income" | "expense" | "neutral" }
> = {
  income: { label: "Доход", tone: "income" },
  expense: { label: "Расход", tone: "expense" },
  transfer: { label: "Перевод", tone: "neutral" },
};

export const TX_KINDS_ORDER: TransactionKind[] = [
  "expense",
  "income",
  "transfer",
];

export function financeColor(color: string | null | undefined): string {
  return color || "var(--accent)";
}
