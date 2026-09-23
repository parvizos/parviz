/*
 * Автоматические курсы валют.
 *
 * Основной источник — open.er-api.com (движок exchangerate-api.com):
 * широкое покрытие, включая рубль и лиру, бесплатно и без ключа,
 * обновляется раз в сутки. Фолбэк — frankfurter.dev (референсные
 * курсы Европейского центрального банка; часть валют, напр. рубль,
 * ЕЦБ не публикует — поэтому это именно запасной вариант).
 *
 * Приводим всё к rateToBase: сколько базовой валюты стоит 1 единица
 * данной. Базовая исключается из результата (её курс всегда 1).
 */

import { CURRENCIES, normalizeCurrency } from "@/lib/currency";

export type FetchedRates = {
  /** code → rateToBase (базовая валюта не входит). */
  rates: Map<string, number>;
  /** Человекочитаемый источник для интерфейса. */
  source: string;
  /** Когда источник обновил данные (мс). */
  fetchedAt: number;
};

const TIMEOUT_MS = 12000;

async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

function round6(x: number): number {
  return Number(x.toPrecision(6));
}

/**
 * Источники отдают «1 base = perBase[code] единиц code».
 * Нам нужен обратный курс: rateToBase[code] = 1 / perBase[code].
 * Берём только валюты из нашего справочника CURRENCIES.
 */
function toRateToBase(
  base: string,
  perBase: Record<string, unknown>,
): Map<string, number> {
  const out = new Map<string, number>();
  const b = normalizeCurrency(base);
  for (const c of CURRENCIES) {
    if (c.code === b) continue;
    const v = perBase[c.code];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      out.set(c.code, round6(1 / v));
    }
  }
  return out;
}

// Базовый URL основного источника. Переопределяется RATES_PRIMARY_URL —
// это нужно только для тестов (локальный мок в форме open.er-api).
const OER_BASE = (
  process.env.RATES_PRIMARY_URL || "https://open.er-api.com/v6/latest"
).replace(/\/$/, "");

async function fromOpenErApi(base: string): Promise<FetchedRates> {
  const j = await getJson(`${OER_BASE}/${encodeURIComponent(base)}`);
  if (j.result !== "success" || typeof j.rates !== "object" || !j.rates) {
    throw new Error("open.er-api: неожиданный ответ");
  }
  const ts =
    typeof j.time_last_update_unix === "number"
      ? j.time_last_update_unix * 1000
      : Date.now();
  return {
    rates: toRateToBase(base, j.rates as Record<string, unknown>),
    source: "open.er-api.com",
    fetchedAt: ts,
  };
}

async function fromFrankfurter(base: string): Promise<FetchedRates> {
  const j = await getJson(
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`,
  );
  if (typeof j.rates !== "object" || !j.rates) {
    throw new Error("frankfurter: неожиданный ответ");
  }
  const ts =
    typeof j.date === "string" ? Date.parse(j.date) || Date.now() : Date.now();
  return {
    rates: toRateToBase(base, j.rates as Record<string, unknown>),
    source: "frankfurter.dev (ЕЦБ)",
    fetchedAt: ts,
  };
}

/**
 * Подтянуть курсы к базовой валюте. Пробуем основной источник, при неудаче —
 * фолбэк. Бросает, если ни один источник не ответил.
 */
export async function fetchRatesToBase(base: string): Promise<FetchedRates> {
  try {
    const r = await fromOpenErApi(base);
    if (r.rates.size > 0) return r;
    throw new Error("open.er-api: пустой ответ");
  } catch {
    return fromFrankfurter(base);
  }
}
