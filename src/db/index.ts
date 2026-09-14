import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/parviz.db";

// Для локального файла заранее создаём каталог, чтобы первый запуск был бесшовным.
if (url.startsWith("file:")) {
  const path = url.slice("file:".length);
  const dir = dirname(path);
  if (dir && dir !== "." && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export const client = createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export { schema };

/** Путь к файлу локальной БД (или null, если БД удалённая). */
export function databaseFilePath(): string | null {
  return url.startsWith("file:") ? url.slice("file:".length) : null;
}

let ready: Promise<void> | null = null;

/**
 * Гарантирует, что схема применена. Идемпотентно и кэшируется на процесс:
 * вызывать в начале любого чтения/записи ничего не стоит.
 */
export function schemaReady(): Promise<void> {
  if (!ready) {
    ready = migrate(db, { migrationsFolder: "drizzle" }).catch((err) => {
      ready = null; // разрешаем повтор при следующем обращении
      throw err;
    });
  }
  return ready;
}
