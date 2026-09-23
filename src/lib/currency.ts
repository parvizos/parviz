/*
 * Мультивалютность.
 *
 * Суммы всех операций и счетов хранятся в минимальных единицах — value × 100
 * (как копейки), в валюте самого счёта. Мы НИКОГДА не перезаписываем сумму
 * операции при смене курса — конвертация делается только «на лету», когда
 * нужно свести всё в одну (базовую) валюту: капитал, аналитика, итоги.
 *
 * Курс валюты хранится как rateToBase — сколько базовой валюты стоит одна
 * единица данной. Пример: базовая RUB, у USD rateToBase = 90 → 1 $ = 90 ₽.
 * Базовая валюта всегда имеет курс 1.
 */

export type CurrencyMeta = {
  code: string;
  /** Русское название в единственном числе. */
  name: string;
  symbol: string;
};

/** Ходовые для студента из СНГ валюты. Список открытый — код можно вписать любой. */
export const CURRENCIES: CurrencyMeta[] = [
  { code: "RUB", name: "Рубль", symbol: "₽" },
  { code: "USD", name: "Доллар", symbol: "$" },
  { code: "EUR", name: "Евро", symbol: "€" },
  { code: "KZT", name: "Тенге", symbol: "₸" },
  { code: "UAH", name: "Гривна", symbol: "₴" },
  { code: "BYN", name: "Бел. рубль", symbol: "Br" },
  { code: "GBP", name: "Фунт", symbol: "£" },
  { code: "TRY", name: "Лира", symbol: "₺" },
  { code: "GEL", name: "Лари", symbol: "₾" },
  { code: "AED", name: "Дирхам", symbol: "AED" },
  { code: "CNY", name: "Юань", symbol: "¥" },
  { code: "JPY", name: "Иена", symbol: "¥" },
  { code: "PLN", name: "Злотый", symbol: "zł" },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

/**
 * Дефолтная основная валюта, если в настройках ничего не задано.
 * По умолчанию — турецкая лира; можно переопределить через APP_BASE_CURRENCY.
 * Саму основную валюту читай через getBaseCurrency() из "@/lib/settings"
 * (она берётся из БД и меняется из интерфейса).
 */
export const DEFAULT_BASE_CURRENCY = (
  process.env.APP_BASE_CURRENCY || "TRY"
).toUpperCase();

/** Привести код валюты к канону (верхний регистр, без пробелов). */
export function normalizeCurrency(code: string): string {
  return code.trim().toUpperCase();
}

export function currencyMeta(code: string): CurrencyMeta {
  return BY_CODE.get(code) ?? { code, name: code, symbol: code };
}

export function currencySymbol(code: string): string {
  return currencyMeta(code).symbol;
}

/**
 * Конвертировать сумму (в минорных единицах) из валюты `code` в базовую.
 * rates — карта rateToBase по коду валюты (базовая = 1). Если курса нет,
 * возвращаем как есть (1:1) — интерфейс подскажет задать курс.
 */
export function toBase(
  minor: number,
  code: string,
  rates: Map<string, number>,
  base: string,
): number {
  if (code === base) return minor;
  const r = rates.get(code);
  if (!r || r <= 0) return minor;
  return Math.round(minor * r);
}

/** Есть ли для валюты заданный курс (для базовой — всегда да). */
export function hasRate(
  code: string,
  rates: Map<string, number>,
  base: string,
): boolean {
  return code === base || (rates.get(code) ?? 0) > 0;
}
