"use server";

import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/session";
import { setSetting, deleteSetting, SETTING_KEYS } from "@/lib/settings";
import { clearConnection } from "@/lib/gdrive";

async function guard() {
  if (!(await isAuthed())) throw new Error("unauthorized");
}

export type ActionResult = { ok: boolean; error?: string };

/** Сохранить Client ID/Secret из формы настроек. */
export async function saveDriveCredentials(
  clientId: string,
  clientSecret: string,
): Promise<ActionResult> {
  await guard();
  const id = clientId.trim();
  const secret = clientSecret.trim();
  if (!id || !secret) {
    return { ok: false, error: "Заполни Client ID и Client Secret" };
  }
  await setSetting(SETTING_KEYS.gdriveClientId, id);
  await setSetting(SETTING_KEYS.gdriveClientSecret, secret);
  revalidatePath("/nastroiki");
  return { ok: true };
}

/** Отключить Drive (стереть токены; ключи оставить, чтобы легко переподключить). */
export async function disconnectDrive(): Promise<ActionResult> {
  await guard();
  await clearConnection();
  revalidatePath("/nastroiki");
  return { ok: true };
}

/** Полностью забыть Google-подключение, включая Client ID/Secret. */
export async function forgetDriveCredentials(): Promise<ActionResult> {
  await guard();
  await clearConnection();
  await deleteSetting(SETTING_KEYS.gdriveClientId);
  await deleteSetting(SETTING_KEYS.gdriveClientSecret);
  revalidatePath("/nastroiki");
  return { ok: true };
}

/** Включить/поставить на паузу заливку новых файлов в Drive. */
export async function setDriveUploads(enabled: boolean): Promise<ActionResult> {
  await guard();
  await setSetting(SETTING_KEYS.gdriveUploads, enabled ? "on" : "off");
  revalidatePath("/nastroiki");
  return { ok: true };
}
