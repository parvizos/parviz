/**
 * Локальное хранилище треков для оффлайна. Аудио скачивается в IndexedDB
 * (Blob), метаданные — в отдельном лёгком сторе, чтобы список скачанного
 * читался без загрузки самих файлов. Плеер, найдя локальную копию, играет
 * из неё — значит, работает полностью без сети.
 */
import type { TrackMeta } from "@/lib/music-queries";

const DB_NAME = "parviz-tracks";
const VERSION = 1;
const META = "meta";
const AUDIO = "audio";

export type DownloadedMeta = TrackMeta & { savedAt: number; bytes: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META))
        db.createObjectStore(META, { keyPath: "id" });
      if (!db.objectStoreNames.contains(AUDIO))
        db.createObjectStore(AUDIO, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ── Реактивный кэш id скачанного (для мгновенного UI) ── */

let idCache: Set<string> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeDownloads(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Синхронно — то, что уже известно (может быть пустым до первой загрузки). */
export function downloadedIdsSync(): Set<string> {
  return idCache ?? new Set();
}

/** Гарантирует загруженный кэш id из базы. */
export async function ensureDownloadedIds(): Promise<Set<string>> {
  if (idCache) return idCache;
  try {
    const metas = await allDownloadedMeta();
    idCache = new Set(metas.map((m) => m.id));
  } catch {
    idCache = new Set();
  }
  return idCache;
}

/* ── Чтение ── */

export async function allDownloadedMeta(): Promise<DownloadedMeta[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(META, "readonly");
    const rows = await reqToPromise(tx.objectStore(META).getAll());
    return (rows as DownloadedMeta[]).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/** Blob скачанного трека или null. Читается только при воспроизведении. */
export async function getDownloadedBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(AUDIO, "readonly");
    const row = (await reqToPromise(tx.objectStore(AUDIO).get(id))) as
      | { id: string; blob: Blob }
      | undefined;
    return row?.blob ?? null;
  } catch {
    return null;
  }
}

export async function totalDownloadedBytes(): Promise<number> {
  const metas = await allDownloadedMeta();
  return metas.reduce((s, m) => s + (m.size || 0), 0);
}

/* ── Запись ── */

async function putDownloaded(meta: TrackMeta, blob: Blob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([META, AUDIO], "readwrite");
  tx.objectStore(META).put({ ...meta, savedAt: Date.now(), bytes: blob.size });
  tx.objectStore(AUDIO).put({ id: meta.id, blob });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  (idCache ??= new Set()).add(meta.id);
  emit();
}

export async function removeDownload(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([META, AUDIO], "readwrite");
    tx.objectStore(META).delete(id);
    tx.objectStore(AUDIO).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {}
  idCache?.delete(id);
  emit();
}

/**
 * Скачивает трек в устройство с прогрессом. Попутно прогревает обложку
 * (её кэширует сервис-воркер), чтобы она была видна и без сети.
 */
export async function downloadTrack(
  track: TrackMeta,
  onProgress?: (frac: number) => void,
): Promise<void> {
  const res = await fetch(`/api/tracks/${track.id}/audio`, {
    cache: "no-store",
  });
  if (!res.ok || !res.body) throw new Error("Не удалось скачать");

  const total = Number(res.headers.get("content-length")) || track.size || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (total) onProgress?.(Math.min(0.99, received / total));
    }
  }
  const blob = new Blob(chunks as BlobPart[], {
    type: track.mime || res.headers.get("content-type") || "audio/mpeg",
  });

  // Целостность: сверяем с известным на сервере размером (он же — байты на
  // диске). Не совпало — это обрыв связи; битую копию не сохраняем.
  const expected = track.size || total || 0;
  if (expected > 0 && blob.size !== expected) {
    throw new Error("Загрузка оборвалась — попробуй ещё раз");
  }

  await putDownloaded(track, blob);
  if (track.coverImageId) {
    try {
      await fetch(`/api/images/${track.coverImageId}`);
    } catch {}
  }
  // Просим не вытеснять наши данные (best-effort).
  await ensurePersisted();
  onProgress?.(1);
}

/* ── Закреплённое хранилище и место ── */

/**
 * Просит браузер не вытеснять наши данные. Возвращает, закреплено ли хранилище.
 * В установленном PWA обычно даётся автоматически.
 */
export async function ensurePersisted(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export type StorageInfo = { usage: number; quota: number; persisted: boolean };

/** Сколько занято/доступно и закреплено ли хранилище. */
export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    const est = (await navigator.storage?.estimate?.()) ?? {};
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    return {
      usage: est.usage ?? 0,
      quota: est.quota ?? 0,
      persisted,
    };
  } catch {
    return { usage: 0, quota: 0, persisted: false };
  }
}
