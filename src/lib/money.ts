/*
 * Деньги хранятся в минимальных единицах — value × 100 (целые числа),
 * чтобы не терять точность. amount всегда положительный; знак задаёт вид
 * операции. Валюта у каждого счёта своя — форматтеры принимают код валюты.
 */

import { currencySymbol } from "./currency";

const cache = new Map<string, Intl.NumberFormat>();

function nf(currency: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = currency + "|" + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency,
        ...opts,
      });
    } catch {
      // Неизвестный ISO-код — форматируем как число, символ добавим сами.
      f = new Intl.NumberFormat("ru-RU", opts);
    }
    cache.set(key, f);
  }
  return f;
}

function withFallbackSymbol(
  formatted: string,
  currency: string,
  hadStyle: boolean,
): string {
  // Если Intl не знал валюту и отформатировал просто число — допишем символ.
  return hadStyle ? formatted : `${formatted} ${currencySymbol(currency)}`;
}

function isKnown(currency: string): boolean {
  try {
    new Intl.NumberFormat("ru-RU", { style: "currency", currency });
    return true;
  } catch {
    return false;
  }
}

/** Полный формат с копейками (для валют, где они есть — по правилам самой валюты). */
export function formatMoney(minor: number, currency = "RUB"): string {
  const known = isKnown(currency);
  const out = nf(currency, known ? {} : { minimumFractionDigits: 2 }).format(
    minor / 100,
  );
  return withFallbackSymbol(out, currency, known);
}

/** Без дробной части — для крупных чисел (баланс, суммы за месяц, капитал). */
export function formatMoneyShort(minor: number, currency = "RUB"): string {
  const known = isKnown(currency);
  const out = nf(currency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(minor / 100));
  return withFallbackSymbol(out, currency, known);
}

export function formatSigned(
  minor: number,
  kind: "income" | "expense" | "transfer",
  currency = "RUB",
): string {
  const sign = kind === "income" ? "+" : kind === "expense" ? "−" : "";
  return sign + formatMoney(Math.abs(minor), currency);
}

/** Разобрать пользовательский ввод в минорные единицы. null при ошибке. */
export function parseAmount(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/[\s ]/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const v = Number(cleaned);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100);
}

/** Минорные единицы → строка для поля ввода (например, "1234,50"). */
export function minorToInput(minor: number): string {
  return (minor / 100).toFixed(2).replace(".", ",");
}
