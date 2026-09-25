/**
 * Облачное хранилище медиа — S3-совместимое (Cloudflare R2, Oracle Object
 * Storage, Backblaze B2…). Настраивается прямо в интерфейсе (Настройки →
 * Облачное хранилище); значения лежат в таблице settings. Если в интерфейсе
 * не задано — падаем на переменные окружения S3_*, а если и их нет — файлы
 * остаются на диске/в БД.
 *
 * Подпись SigV4 — через aws4fetch (крохотный клиент), стрим без буферизации
 * в память, отдача с поддержкой Range (перемотка аудио).
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { AwsClient } from "aws4fetch";
import { getSettings, SETTING_KEYS } from "@/lib/settings";

export type S3Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  prefix: string;
};

const S3_KEYS = [
  SETTING_KEYS.s3Endpoint,
  SETTING_KEYS.s3Region,
  SETTING_KEYS.s3Bucket,
  SETTING_KEYS.s3AccessKey,
  SETTING_KEYS.s3Secret,
  SETTING_KEYS.s3Prefix,
  SETTING_KEYS.s3Uploads,
];

/** Текущая конфигурация хранилища: сперва из настроек (UI), затем из env. */
export async function getStorageConfig(): Promise<S3Config | null> {
  const m = await getSettings(S3_KEYS);
  const endpoint = (m.get(SETTING_KEYS.s3Endpoint) || process.env.S3_ENDPOINT || "")
    .trim()
    .replace(/\/+$/, "");
  const accessKeyId = (m.get(SETTING_KEYS.s3AccessKey) || process.env.S3_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (m.get(SETTING_KEYS.s3Secret) || process.env.S3_SECRET_ACCESS_KEY || "").trim();
  const bucket = (m.get(SETTING_KEYS.s3Bucket) || process.env.S3_BUCKET || "").trim();
  // Регион для R2 — 'auto'; для остальных берётся заданный. Пусто → 'auto'.
  const region = (m.get(SETTING_KEYS.s3Region) || process.env.S3_REGION || "auto").trim();
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  const prefix = (m.get(SETTING_KEYS.s3Prefix) || process.env.S3_PREFIX || "").replace(/^\/+|\/+$/g, "");
  return { endpoint, region, accessKeyId, secretAccessKey, bucket, prefix };
}

/** Настроено ли облачное хранилище (готово принимать файлы). */
export async function s3Enabled(): Promise<boolean> {
  return (await getStorageConfig()) !== null;
}

/** Льём ли НОВЫЕ загрузки в облако (настроено и не на паузе). */
export async function cloudUploadsEnabled(): Promise<boolean> {
  const cfg = await getStorageConfig();
  if (!cfg) return false;
  const m = await getSettings([SETTING_KEYS.s3Uploads]);
  return m.get(SETTING_KEYS.s3Uploads) !== "off";
}

// Клиент кэшируем по ключам/региону — при смене настроек пересоздаём.
let cached: { sig: string; client: AwsClient } | null = null;
function clientFor(cfg: S3Config): AwsClient {
  const sig = `${cfg.accessKeyId}|${cfg.secretAccessKey}|${cfg.region}`;
  if (!cached || cached.sig !== sig) {
    cached = {
      sig,
      client: new AwsClient({
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
        region: cfg.region,
        service: "s3",
      }),
    };
  }
  return cached.client;
}

/** Ключи объектов по типу медиа. */
export function trackKey(id: string, ext: string): string {
  return `tracks/${id}.${ext || "bin"}`;
}
export function imageKey(id: string, ext: string): string {
  return `images/${id}.${ext || "bin"}`;
}
export function fileKey(id: string): string {
  return `files/${id}`;
}

function urlFor(cfg: S3Config, key: string): string {
  const parts = [cfg.bucket, ...(cfg.prefix ? [cfg.prefix] : []), key].join("/");
  return `${cfg.endpoint}/${parts}`;
}

async function putBody(
  cfg: S3Config,
  key: string,
  body: () => BodyInit,
  size: number,
  contentType: string,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
      const res = await clientFor(cfg).fetch(urlFor(cfg, key), {
        method: "PUT",
        body: body(),
        headers: {
          "content-type": contentType || "application/octet-stream",
          "content-length": String(size),
          "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        },
        duplex: "half",
      } as RequestInit & { duplex: "half" });
      if (!res.ok) throw new Error(`S3 PUT ${res.status}`);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("S3 PUT failed");
}

/** Заливает локальный файл (стримом, с известной длиной), с повтором при сбое. */
export async function s3PutFile(
  key: string,
  filePath: string,
  contentType: string,
): Promise<void> {
  const cfg = await getStorageConfig();
  if (!cfg) throw new Error("Облачное хранилище не настроено");
  const size = (await stat(filePath)).size;
  await putBody(
    cfg,
    key,
    () => Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream,
    size,
    contentType,
  );
}

/** Заливает буфер (картинки, вложения). */
export async function s3PutBytes(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const cfg = await getStorageConfig();
  if (!cfg) throw new Error("Облачное хранилище не настроено");
  // Uint8Array — валидное тело fetch; приводим тип (лоб в лоб TS 5.7 не пускает
  // Uint8Array<ArrayBufferLike> в BodyInit, как и со стримом выше).
  await putBody(cfg, key, () => bytes as unknown as BodyInit, bytes.byteLength, contentType);
}

export type S3GetResult = {
  status: number;
  contentType: string | null;
  contentLength: string | null;
  contentRange: string | null;
  acceptRanges: string | null;
  body: ReadableStream | null;
};

/** Читает объект (с опциональным Range) — для проксирования воспроизведения. */
export async function s3Get(
  key: string,
  range?: string | null,
): Promise<S3GetResult> {
  const cfg = await getStorageConfig();
  if (!cfg) throw new Error("Облачное хранилище не настроено");
  const headers: Record<string, string> = {};
  if (range) headers["range"] = range;
  const res = await clientFor(cfg).fetch(urlFor(cfg, key), { method: "GET", headers });
  return {
    status: res.status,
    contentType: res.headers.get("content-type"),
    contentLength: res.headers.get("content-length"),
    contentRange: res.headers.get("content-range"),
    acceptRanges: res.headers.get("accept-ranges"),
    body: res.body,
  };
}

/** Размер объекта (HEAD) или null, если его нет. */
export async function s3Head(key: string): Promise<number | null> {
  const cfg = await getStorageConfig();
  if (!cfg) throw new Error("Облачное хранилище не настроено");
  const res = await clientFor(cfg).fetch(urlFor(cfg, key), { method: "HEAD" });
  if (!res.ok) return null;
  const len = res.headers.get("content-length");
  return len ? Number(len) : null;
}

/** Удаляет объект (404 не считаем ошибкой). */
export async function s3Delete(key: string): Promise<void> {
  const cfg = await getStorageConfig();
  if (!cfg) throw new Error("Облачное хранилище не настроено");
  const res = await clientFor(cfg).fetch(urlFor(cfg, key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`S3 DELETE ${res.status}`);
}

/**
 * Проверка ПРОИЗВОЛЬНОЙ конфигурации (для кнопки «Проверить»): кладём
 * маленький объект, читаем обратно, удаляем. Так ловим неверные ключи/бакет
 * ещё до сохранения. Клиент строим разово, кэш не трогаем.
 */
export async function s3TestConfig(
  cfg: S3Config,
): Promise<{ ok: boolean; error?: string }> {
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: cfg.region,
    service: "s3",
  });
  const key = urlFor(cfg, `.parviz-check/${Date.now()}.txt`);
  const payload = "parviz-storage-check";
  try {
    const put = await client.fetch(key, {
      method: "PUT",
      body: payload,
      headers: {
        "content-type": "text/plain",
        "content-length": String(payload.length),
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      },
    });
    if (!put.ok) {
      return { ok: false, error: putError(put.status) };
    }
    const get = await client.fetch(key, { method: "GET" });
    const body = get.ok ? await get.text() : "";
    await client.fetch(key, { method: "DELETE" }).catch(() => {});
    if (!get.ok || body !== payload) {
      return { ok: false, error: "Записали, но не смогли прочитать обратно" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "нет связи с хранилищем" };
  }
}

function putError(status: number): string {
  if (status === 403) return "Доступ запрещён — проверь ключи и права токена";
  if (status === 404) return "Бакет не найден — проверь имя бакета и endpoint";
  if (status === 301 || status === 400) return "Неверный endpoint или регион";
  return `Хранилище ответило ${status}`;
}
