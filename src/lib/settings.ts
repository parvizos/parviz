/*
 * Настройки приложения (key-value).
 *
 * Здесь живёт то, что пользователь меняет из интерфейса и что должно
 * пережить перезапуск: основная валюта, дата последнего обновления
 * курсов и т. п. Хранится в таблице `settings`, читается из БД.
 *
 * Модуль серверный (тянет @/db) — не импортировать в клиентские компоненты.
 */

import { eq, inArray } from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_BASE_CURRENCY, normalizeCurrency } from "@/lib/currency";

export const SETTING_KEYS = {
  baseCurrency: "base_currency",
  ratesUpdatedAt: "rates_updated_at",
  ratesSource: "rates_source",
  // Google Drive как облачное хранилище новых файлов (настраивается в UI).
  gdriveClientId: "gdrive_client_id",
  gdriveClientSecret: "gdrive_client_secret",
  gdriveRefreshToken: "gdrive_refresh_token",
  gdriveFolderId: "gdrive_folder_id",
  gdriveEmail: "gdrive_email",
  /** 'off' — подключение есть, но новые загрузки временно не льём в Drive. */
  gdriveUploads: "gdrive_uploads",
} as const;

/** Удалить настройку (по ключу). Нет строки — тихо ок. */
export async function deleteSetting(key: string): Promise<void> {
  await schemaReady();
  await db.delete(settings).where(eq(settings.key, key));
}

export async function getSetting(key: string): Promise<string | null> {
  await schemaReady();
  const [r] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return r?.value ?? null;
}

/** Несколько настроек за один запрос: карта key → value. */
export async function getSettings(
  keys: string[],
): Promise<Map<string, string>> {
  await schemaReady();
  if (keys.length === 0) return new Map();
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, keys));
  return new Map(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(key: string, value: string): Promise<void> {
  await schemaReady();
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
}

/**
 * Основная валюта приложения (в неё сводятся капитал и аналитика).
 * Читается из настроек; если не задана — дефолт (лира / APP_BASE_CURRENCY).
 */
export async function getBaseCurrency(): Promise<string> {
  const v = await getSetting(SETTING_KEYS.baseCurrency);
  return normalizeCurrency(v || DEFAULT_BASE_CURRENCY);
}
