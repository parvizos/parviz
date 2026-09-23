/**
 * Хранилище медиа. По умолчанию — локальный диск (data/media). Если заданы
 * переменные S3_* (напр. Oracle Object Storage, S3-совместимое), новые треки
 * льются туда, а сервер проксирует их с поддержкой Range. Подпись SigV4 —
 * через aws4fetch (крохотный клиент), стрим без буферизации в память.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { AwsClient } from "aws4fetch";

type S3Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  prefix: string;
};

function config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/+$/, "");
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }
  const prefix = (process.env.S3_PREFIX || "").replace(/^\/+|\/+$/g, "");
  return { endpoint, region, accessKeyId, secretAccessKey, bucket, prefix };
}

/** Включено ли объектное хранилище (заданы все S3_*). */
export function s3Enabled(): boolean {
  return config() !== null;
}

let cached: AwsClient | null = null;
function client(cfg: S3Config): AwsClient {
  cached ??= new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: cfg.region,
    service: "s3",
  });
  return cached;
}

/** Ключ объекта аудио. */
export function trackKey(id: string, ext: string): string {
  return `tracks/${id}.${ext || "bin"}`;
}

function urlFor(cfg: S3Config, key: string): string {
  const parts = [cfg.bucket, ...(cfg.prefix ? [cfg.prefix] : []), key].join("/");
  return `${cfg.endpoint}/${parts}`;
}

/**
 * Заливает локальный файл в объектное хранилище (стримом, с известной длиной),
 * с повтором при сбое — разовый сетевой блип не роняет загрузку.
 */
export async function s3PutFile(
  key: string,
  filePath: string,
  contentType: string,
): Promise<void> {
  const cfg = config();
  if (!cfg) throw new Error("S3 не настроен");
  const size = (await stat(filePath)).size;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
      // Поток создаём на каждую попытку заново (использованный не перемотать).
      const body = Readable.toWeb(
        createReadStream(filePath),
      ) as unknown as ReadableStream;
      const res = await client(cfg).fetch(urlFor(cfg, key), {
        method: "PUT",
        body,
        headers: {
          "content-type": contentType || "application/octet-stream",
          "content-length": String(size),
          "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        },
        // duplex обязателен для стрима тела запроса в undici/fetch
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
  const cfg = config();
  if (!cfg) throw new Error("S3 не настроен");
  const headers: Record<string, string> = {};
  if (range) headers["range"] = range;
  const res = await client(cfg).fetch(urlFor(cfg, key), {
    method: "GET",
    headers,
  });
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
  const cfg = config();
  if (!cfg) throw new Error("S3 не настроен");
  const res = await client(cfg).fetch(urlFor(cfg, key), { method: "HEAD" });
  if (!res.ok) return null;
  const len = res.headers.get("content-length");
  return len ? Number(len) : null;
}

/** Удаляет объект (404 не считаем ошибкой). */
export async function s3Delete(key: string): Promise<void> {
  const cfg = config();
  if (!cfg) throw new Error("S3 не настроен");
  const res = await client(cfg).fetch(urlFor(cfg, key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`S3 DELETE ${res.status}`);
  }
}
