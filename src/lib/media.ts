import { dirname, join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { databaseFilePath } from "@/db";

/**
 * Каталог для медиа (аудиофайлы фонотеки) — рядом с базой, внутри тома data,
 * чтобы файлы переживали пересоздание контейнера. Держим их на диске, а не в
 * базе: так база и бэкапы остаются лёгкими даже при большой коллекции.
 */
export function mediaDir(): string {
  const dbPath = databaseFilePath();
  const base = dbPath ? dirname(dbPath) : "./data";
  return join(base, "media");
}

/** Гарантирует существование каталога медиа и возвращает его. */
export function ensureMediaDir(): string {
  const dir = mediaDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Путь к файлу трека на диске. */
export function trackFilePath(id: string, ext: string): string {
  const name = ext ? `${id}.${ext}` : id;
  return join(mediaDir(), name);
}
