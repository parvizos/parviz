"use server";

import { statSync } from "node:fs";
import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/session";
import { databaseFilePath } from "@/db";
import { getSetting, setSetting, deleteSetting, SETTING_KEYS } from "@/lib/settings";
import {
  s3TestConfig,
  getStorageConfig,
  s3ListUsage,
  litestreamConfig,
  type S3Config,
  type UsageResult,
} from "@/lib/storage";

async function guard() {
  if (!(await isAuthed())) throw new Error("unauthorized");
}

export type StorageForm = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secret: string;
  prefix: string;
};
export type ActionResult = { ok: boolean; error?: string };

const clean = (s: string) => (s || "").trim();

/**
 * Проверить конфигурацию и, если работает, сохранить. Сперва делаем реальный
 * PUT/GET/DELETE — чтобы не сохранить нерабочие ключи. Секрет с пустым полем
 * на форме означает «оставить прежний» (клиенту мы его не показываем).
 */
export async function connectStorage(form: StorageForm): Promise<ActionResult> {
  await guard();
  const endpoint = clean(form.endpoint).replace(/\/+$/, "");
  const bucket = clean(form.bucket);
  const accessKeyId = clean(form.accessKey);
  const region = clean(form.region) || "auto";
  const prefix = clean(form.prefix).replace(/^\/+|\/+$/g, "");
  let secretAccessKey = clean(form.secret);
  if (!secretAccessKey) {
    secretAccessKey = (await getSetting(SETTING_KEYS.s3Secret)) || "";
  }

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return { ok: false, error: "Заполни endpoint, бакет, Access Key и Secret" };
  }

  const cfg: S3Config = { endpoint, region, accessKeyId, secretAccessKey, bucket, prefix };
  const test = await s3TestConfig(cfg);
  if (!test.ok) return test;

  await setSetting(SETTING_KEYS.s3Endpoint, endpoint);
  await setSetting(SETTING_KEYS.s3Region, region);
  await setSetting(SETTING_KEYS.s3Bucket, bucket);
  await setSetting(SETTING_KEYS.s3AccessKey, accessKeyId);
  await setSetting(SETTING_KEYS.s3Secret, secretAccessKey);
  await setSetting(SETTING_KEYS.s3Prefix, prefix);
  await deleteSetting(SETTING_KEYS.s3Uploads); // по умолчанию заливка включена
  revalidatePath("/nastroiki");
  return { ok: true };
}

/** Отключить облако: стереть настройки из интерфейса (env-переменные, если
 *  заданы, продолжат действовать — о чём карточка предупреждает). */
export async function disconnectStorage(): Promise<ActionResult> {
  await guard();
  for (const k of [
    SETTING_KEYS.s3Endpoint,
    SETTING_KEYS.s3Region,
    SETTING_KEYS.s3Bucket,
    SETTING_KEYS.s3AccessKey,
    SETTING_KEYS.s3Secret,
    SETTING_KEYS.s3Prefix,
    SETTING_KEYS.s3Uploads,
  ]) {
    await deleteSetting(k);
  }
  revalidatePath("/nastroiki");
  return { ok: true };
}

/** Пауза/возобновление заливки новых файлов в облако. */
export async function setCloudUploads(enabled: boolean): Promise<ActionResult> {
  await guard();
  await setSetting(SETTING_KEYS.s3Uploads, enabled ? "on" : "off");
  revalidatePath("/nastroiki");
  return { ok: true };
}

export type CloudStatus = {
  available: boolean;
  error?: string;
  /** Настроено ли облако для медиа (загрузки идут в R2). */
  mediaConfigured: boolean;
  /** Включена ли непрерывная репликация базы (Litestream). */
  replication: boolean;
  usage?: UsageResult;
  /** Размер локального файла базы (для сравнения с копией в облаке). */
  localDbBytes?: number;
};

/**
 * Полное состояние облака для панели в настройках: сколько всего в R2 с
 * разбивкой по типам (фото/вложения/музыка/база), количество объектов и
 * когда последний раз что-то менялось. Считаем реальным листингом бакета.
 */
export async function getCloudStatus(): Promise<CloudStatus> {
  await guard();
  const media = await getStorageConfig();
  const ls = litestreamConfig();
  const mediaConfigured = !!media;
  const replication = !!ls;

  let localDbBytes: number | undefined;
  try {
    const p = databaseFilePath();
    if (p) localDbBytes = statSync(p).size;
  } catch {}

  // Листим тем конфигом, что есть: медиа-ключи или ключи репликации — бакет
  // один и тот же, объём считается целиком.
  const listCfg: S3Config | null = media ?? ls;
  if (!listCfg) {
    return { available: false, mediaConfigured, replication, localDbBytes };
  }
  try {
    const usage = await s3ListUsage(listCfg);
    return { available: true, mediaConfigured, replication, usage, localDbBytes };
  } catch (e) {
    return {
      available: false,
      mediaConfigured,
      replication,
      localDbBytes,
      error: e instanceof Error ? e.message : "не удалось получить состояние",
    };
  }
}
