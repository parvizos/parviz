import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { client, databaseFilePath } from "@/db";

function backupsDir(dbPath: string): string {
  return join(dirname(dbPath), "backups");
}

async function vacuumInto(target: string): Promise<void> {
  await client.execute(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
}

function prune(dir: string, keep: number) {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.startsWith("parviz-") && f.endsWith(".db"))
      .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const { f } of files.slice(keep)) rmSync(join(dir, f), { force: true });
  } catch {}
}

let backupChecked = false;

/**
 * Раз в день (на процесс) делает консистентный снимок базы в data/backups
 * и оставляет последние `keep`. Безопасно вызывать на каждый запрос.
 */
export async function backupIfDue(keep = 7): Promise<void> {
  if (backupChecked) return;
  backupChecked = true;
  const dbPath = databaseFilePath();
  if (!dbPath || !existsSync(dbPath)) return;
  const dir = backupsDir(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const target = join(dir, `parviz-${today}.db`);
  if (existsSync(target)) {
    prune(dir, keep);
    return;
  }
  try {
    await vacuumInto(target);
    prune(dir, keep);
  } catch {
    backupChecked = false;
  }
}

export type BackupInfo = { name: string; date: string; size: number };

export function listBackups(): BackupInfo[] {
  const dbPath = databaseFilePath();
  if (!dbPath) return [];
  const dir = backupsDir(dbPath);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith("parviz-") && f.endsWith(".db"))
    .map((f) => {
      const s = statSync(join(dir, f));
      return { name: f, date: new Date(s.mtimeMs).toISOString(), size: s.size };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Временный консистентный снимок для скачивания (null — если БД удалённая). */
export async function makeExportSnapshot(): Promise<{
  path: string;
  cleanup: () => void;
} | null> {
  const dbPath = databaseFilePath();
  if (!dbPath) return null;
  const os = await import("node:os");
  const fsp = await import("node:fs/promises");
  const tmp = await fsp.mkdtemp(join(os.tmpdir(), "parviz-export-"));
  const path = join(tmp, "parviz.db");
  await vacuumInto(path);
  return {
    path,
    cleanup: () => {
      try {
        rmSync(tmp, { recursive: true, force: true });
      } catch {}
    },
  };
}
