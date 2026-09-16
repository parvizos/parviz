import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

const realUrl = process.env.DATABASE_URL ?? "file:./data/parviz.db";

// Для локального файла заранее создаём каталог, чтобы первый запуск был бесшовным.
function ensureDir(url: string) {
  if (!url.startsWith("file:")) return;
  const dir = dirname(url.slice("file:".length));
  if (dir && dir !== "." && !existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// Демо-база — отдельный файл рядом с реальной (только для файловой БД).
// Твои настоящие данные и демо физически в разных файлах.
const demoUrl = realUrl.startsWith("file:")
  ? realUrl.replace(/\.db$/i, "") + "-demo.db"
  : null;

function make(url: string) {
  ensureDir(url);
  const c = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  return { client: c, db: drizzle(c, { schema }) };
}

const real = make(realUrl);
const demo = demoUrl ? make(demoUrl) : null;

export type DrizzleDb = typeof real.db;
export type Workspace = "real" | "demo";

/** Реальный клиент — ВСЕГДА твоя настоящая база (бэкапы/экспорт идут отсюда). */
export const client = real.client;

/** Демо-режим доступен только для файловой БД. */
export const demoAvailable = demo !== null;

let workspace: Workspace = "real";

/**
 * Активная база. Это «живая» ES-привязка: при setWorkspace значение меняется,
 * и все, кто импортировал { db }, начинают работать с выбранной базой.
 */
export let db: DrizzleDb = real.db;

export function currentWorkspace(): Workspace {
  return workspace;
}

/** Переключить активную базу (real ↔ demo). */
export function setWorkspace(ws: Workspace): void {
  if (ws === "demo" && !demo) return; // для удалённой БД демо недоступно
  workspace = ws;
  db = ws === "demo" && demo ? demo.db : real.db;
}

/** Прямой доступ к демо-базе для наполнения (или null). */
export const demoDb: DrizzleDb | null = demo?.db ?? null;

export { schema };

/** Путь к файлу РЕАЛЬНОЙ базы (для бэкапов/экспорта). */
export function databaseFilePath(): string | null {
  return realUrl.startsWith("file:") ? realUrl.slice("file:".length) : null;
}

/* ── Миграции: кэшируем готовность отдельно для каждой базы ── */

const ready = new WeakMap<object, Promise<void>>();
function migrateOnce(d: DrizzleDb): Promise<void> {
  let p = ready.get(d as object);
  if (!p) {
    p = migrate(d, { migrationsFolder: "drizzle" }).catch((err) => {
      ready.delete(d as object);
      throw err;
    });
    ready.set(d as object, p);
  }
  return p;
}

/** Гарантирует, что схема применена к АКТИВНОЙ базе. Идемпотентно. */
export function schemaReady(): Promise<void> {
  return migrateOnce(db);
}

/** Гарантирует миграции для конкретного воркспейса (real/demo). */
export function ensureWorkspace(ws: Workspace): Promise<void> {
  return migrateOnce(ws === "demo" && demo ? demo.db : real.db);
}
