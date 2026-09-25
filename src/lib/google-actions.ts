"use server";

import { revalidatePath } from "next/cache";
import { getSettings, setSetting, deleteSetting, SETTING_KEYS } from "@/lib/settings";

export type GoogleForm = { clientId: string; apiKey: string };
export type GoogleResult = { ok: boolean; error?: string };

/** Публичная конфигурация Picker для браузера (или null, если не настроено). */
export type GooglePickerConfig = { clientId: string; apiKey: string };

/**
 * Client ID и API-ключ — публичные (Google Picker работает в браузере и всё
 * равно их раскрывает), поэтому храним как обычные настройки и отдаём клиенту.
 * Ограничения задаются на стороне Google (домены-источники для ключа и OAuth).
 */
export async function connectGoogleDrive(form: GoogleForm): Promise<GoogleResult> {
  const clientId = form.clientId.trim();
  const apiKey = form.apiKey.trim();
  if (!clientId || !apiKey) {
    return { ok: false, error: "Укажи Client ID и API-ключ" };
  }
  if (!/\.apps\.googleusercontent\.com$/.test(clientId)) {
    return {
      ok: false,
      error: "Client ID должен заканчиваться на .apps.googleusercontent.com",
    };
  }
  await setSetting(SETTING_KEYS.googleClientId, clientId);
  await setSetting(SETTING_KEYS.googleApiKey, apiKey);
  revalidatePath("/nastroiki");
  return { ok: true };
}

export async function disconnectGoogleDrive(): Promise<GoogleResult> {
  await deleteSetting(SETTING_KEYS.googleClientId);
  await deleteSetting(SETTING_KEYS.googleApiKey);
  revalidatePath("/nastroiki");
  return { ok: true };
}

export async function getGoogleDriveStatus(): Promise<{ configured: boolean; clientId: string | null }> {
  const m = await getSettings([SETTING_KEYS.googleClientId, SETTING_KEYS.googleApiKey]);
  const clientId = m.get(SETTING_KEYS.googleClientId) ?? null;
  const apiKey = m.get(SETTING_KEYS.googleApiKey) ?? null;
  return { configured: !!(clientId && apiKey), clientId };
}

export async function getGooglePickerConfig(): Promise<GooglePickerConfig | null> {
  const m = await getSettings([SETTING_KEYS.googleClientId, SETTING_KEYS.googleApiKey]);
  const clientId = m.get(SETTING_KEYS.googleClientId);
  const apiKey = m.get(SETTING_KEYS.googleApiKey);
  if (!clientId || !apiKey) return null;
  return { clientId, apiKey };
}
