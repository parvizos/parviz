"use server";

import { revalidatePath } from "next/cache";
import { db, schemaReady } from "@/db";
import { exchangeRates } from "@/db/schema";
import { CURRENCIES, normalizeCurrency } from "@/lib/currency";
import {
  getBaseCurrency,
  getSetting,
  setSetting,
  SETTING_KEYS,
} from "@/lib/settings";
import { fetchRatesToBase } from "@/lib/rates";

function revalidateAll() {
  revalidatePath("/", "layout");
}

const KNOWN = new Set(CURRENCIES.map((c) => c.code));

export type RefreshResult = {
  ok: boolean;
  count: number;
  source?: string;
  error?: string;
};

/**
 * Подтянуть курсы из интернета для текущей основной валюты и сохранить.
 * Возвращает результат, а не бросает — чтобы UI показал понятную ошибку.
 */
export async function refreshRates(): Promise<RefreshResult> {
  await schemaReady();
  const base = await getBaseCurrency();
  let data;
  try {
    data = await fetchRatesToBase(base);
  } catch (e) {
    return {
      ok: false,
      count: 0,
      error: e instanceof Error ? e.message : "нет связи с источником курсов",
    };
  }
  const now = new Date();
  const entries = [...data.rates.entries()].filter(([code]) => code !== base);
  for (const [code, rateToBase] of entries) {
    await db
      .insert(exchangeRates)
      .values({ code, rateToBase })
      .onConflictDoUpdate({
        target: exchangeRates.code,
        set: { rateToBase, updatedAt: now },
      });
  }
  await setSetting(SETTING_KEYS.ratesUpdatedAt, String(data.fetchedAt));
  await setSetting(SETTING_KEYS.ratesSource, data.source);
  revalidateAll();
  return { ok: true, count: entries.length, source: data.source };
}

/**
 * Сменить основную валюту. Старые курсы (они были к прежней базе) сбрасываем
 * и сразу подтягиваем свежие под новую базу.
 */
export async function setBaseCurrency(code: string): Promise<RefreshResult> {
  await schemaReady();
  const c = normalizeCurrency(code);
  if (!KNOWN.has(c)) throw new Error("Неизвестная валюта");
  const prev = await getBaseCurrency();
  if (c === prev) return { ok: true, count: 0 };
  await setSetting(SETTING_KEYS.baseCurrency, c);
  // Все прежние курсы были к старой базе — они больше не валидны.
  await db.delete(exchangeRates);
  const res = await refreshRates();
  revalidateAll();
  return res;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
const TWELVE_HOURS = 12 * 60 * 60 * 1000;
let lastCheck = 0;

/**
 * Мягкое автообновление курсов — зовётся из layout. Не чаще раза в 6 ч на
 * процесс и только если сохранённые курсы старше 12 ч. Ошибки глушим.
 */
export async function refreshRatesIfDue(): Promise<void> {
  const now = Date.now();
  if (now - lastCheck < SIX_HOURS) return;
  lastCheck = now;
  const stamp = await getSetting(SETTING_KEYS.ratesUpdatedAt).catch(() => null);
  const age = stamp ? now - Number(stamp) : Infinity;
  if (Number.isFinite(age) && age < TWELVE_HOURS) return;
  await refreshRates().catch(() => {});
}
