/*
 * Деньги хранятся в копейках (целые числа), чтобы не терять точность.
 * amount всегда положительный; знак задаёт вид операции.
 */

const RUB = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const RUB0 = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatMoney(minor: number): string {
  return RUB.format(minor / 100);
}

/** Целые рубли без копеек — для крупных чисел (баланс, суммы за месяц). */
export function formatMoneyShort(minor: number): string {
  return RUB0.format(Math.round(minor / 100));
}

export function formatSigned(
  minor: number,
  kind: "income" | "expense" | "transfer",
): string {
  const sign = kind === "income" ? "+" : kind === "expense" ? "−" : "";
  return sign + formatMoney(Math.abs(minor));
}

/** Разобрать пользовательский ввод в копейки. Возвращает null при ошибке. */
export function parseAmount(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/[\s ]/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const v = Number(cleaned);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100);
}

/** Копейки → строка для поля ввода (например, "1234,50"). */
export function minorToInput(minor: number): string {
  return (minor / 100).toFixed(2).replace(".", ",");
}
