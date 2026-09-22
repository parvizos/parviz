/**
 * Экспорт и восстановление ВСЕХ данных. Работает на «сырых» строках SQLite
 * поверх реального клиента — предельно точная копия (включая картинки-блобы).
 * Внешние ключи в базе выключены, поэтому порядок таблиц при чистке/вставке
 * не важен. Перед перезаписью всегда делается снимок текущей базы.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { createClient, type Client, type InValue } from "@libsql/client";
import { client, databaseFilePath, schemaReady } from "@/db";

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

export const EXPORT_VERSION = 1;

/** Имена таблиц с данными (без служебных sqlite_* и миграций drizzle). */
async function dataTables(c: Client): Promise<string[]> {
  const r = await c.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  return r.rows
    .map((row) => String(row.name))
    .filter((n) => !n.startsWith("__drizzle") && !n.startsWith("_litestream"));
}

/* ─────────────────────────  JSON: экспорт  ───────────────────────── */

function encodeValue(v: unknown): unknown {
  if (v instanceof Uint8Array) {
    return { $b64: Buffer.from(v).toString("base64") };
  }
  if (typeof v === "bigint") return Number(v);
  return v;
}

/** Полный дамп всех таблиц в обычный объект (готов к JSON.stringify). */
export async function exportJson(): Promise<{
  app: string;
  version: number;
  exportedAt: string;
  tables: Tables;
}> {
  await schemaReady();
  const names = await dataTables(client);
  const tables: Tables = {};
  for (const t of names) {
    const r = await client.execute(`SELECT * FROM "${t}"`);
    tables[t] = r.rows.map((row) => {
      const o: Row = {};
      for (const k in row) o[k] = encodeValue((row as Row)[k]);
      return o;
    });
  }
  return {
    app: "ParvizOS",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

/* ─────────────────────────  Чтение источников  ───────────────────────── */

function decodeValue(v: unknown): InValue {
  if (v && typeof v === "object" && "$b64" in (v as object)) {
    return Buffer.from(String((v as { $b64: unknown }).$b64), "base64");
  }
  return v as InValue;
}

/** Разбирает JSON-бэкап в таблицы (с раскодированием блобов). */
export function tablesFromJson(parsed: unknown): Tables {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("tables" in parsed) ||
    typeof (parsed as { tables: unknown }).tables !== "object"
  ) {
    throw new Error("Не похоже на резервную копию ParvizOS.");
  }
  const raw = (parsed as { tables: Record<string, unknown> }).tables;
  const out: Tables = {};
  for (const [t, rows] of Object.entries(raw)) {
    if (!Array.isArray(rows)) continue;
    out[t] = rows.map((row) => {
      const o: Row = {};
      for (const k in row as Row) o[k] = decodeValue((row as Row)[k]);
      return o;
    });
  }
  return out;
}

/** Читает все таблицы из файла .db (снимка/бэкапа). */
export async function tablesFromDbFile(path: string): Promise<Tables> {
  const src = createClient({ url: `file:${path}` });
  try {
    const names = await dataTables(src);
    const out: Tables = {};
    for (const t of names) {
      const r = await src.execute(`SELECT * FROM "${t}"`);
      out[t] = r.rows as unknown as Row[];
    }
    return out;
  } finally {
    src.close();
  }
}

/* ─────────────────────────  Восстановление  ───────────────────────── */

/** Снимок текущей базы перед перезаписью — чтобы восстановление можно было откатить. */
async function snapshotBeforeRestore(): Promise<void> {
  const dbPath = databaseFilePath();
  if (!dbPath) return;
  const dir = join(dirname(dbPath), "backups");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const target = join(dir, `parviz-before-restore-${ts}.db`);
  await client.execute(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
}

/**
 * Перезаписывает базу данными из бэкапа: чистит все таблицы и вставляет строки.
 * Атомарно (одна транзакция batch). Возвращает число вставленных строк.
 */
export async function restoreTables(data: Tables): Promise<{
  inserted: number;
  tables: number;
}> {
  await schemaReady();
  const live = new Set(await dataTables(client));

  // Готовим все операции; выполнятся одной транзакцией.
  const stmts: { sql: string; args: InValue[] }[] = [];
  for (const t of live) stmts.push({ sql: `DELETE FROM "${t}"`, args: [] });

  let inserted = 0;
  const touched = new Set<string>();
  for (const [t, rows] of Object.entries(data)) {
    if (!live.has(t)) continue; // неизвестные таблицы пропускаем
    for (const row of rows) {
      const cols = Object.keys(row);
      if (cols.length === 0) continue;
      const sql = `INSERT INTO "${t}" (${cols
        .map((c) => `"${c}"`)
        .join(",")}) VALUES (${cols.map(() => "?").join(",")})`;
      stmts.push({ sql, args: cols.map((c) => decodeValue(row[c])) });
      inserted++;
      touched.add(t);
    }
  }

  // Сначала — страховочный снимок, потом атомарная перезапись.
  await snapshotBeforeRestore();
  await client.batch(stmts, "write");
  return { inserted, tables: touched.size };
}

/** Восстановление из .db файла (снимок/бэкап). */
export async function restoreFromDbFile(path: string) {
  return restoreTables(await tablesFromDbFile(path));
}

/** Восстановление из JSON-строки. */
export async function restoreFromJsonString(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Файл не читается как JSON.");
  }
  return restoreTables(tablesFromJson(parsed));
}

/** Санитизирует имя файла бэкапа (только базовое имя, без переходов по путям). */
export function safeBackupPath(name: string): string | null {
  const dbPath = databaseFilePath();
  if (!dbPath) return null;
  const base = basename(name);
  if (!/^parviz-[\w.-]+\.db$/.test(base)) return null;
  return join(dirname(dbPath), "backups", base);
}
