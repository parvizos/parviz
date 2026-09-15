import * as os from "node:os";
import { statfs } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { databaseFilePath } from "@/db";
import { listBackups } from "@/lib/backup";

export type Health = {
  memory: { total: number; used: number; free: number };
  disk: { total: number; used: number; free: number } | null;
  cpu: {
    cores: number;
    model: string;
    load1: number;
    load5: number;
    load15: number;
    usage: number; // 0..1, мгновенная загрузка
  };
  uptime: { system: number; process: number };
  db: { size: number; backups: number; lastBackup: string | null };
  system: {
    platform: string;
    arch: string;
    node: string;
    hostname: string;
  };
  now: string;
};

function sample(cpus: os.CpuInfo[]): { idle: number; total: number } {
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

// Мгновенная загрузка CPU — усреднённая по всем ядрам за короткий интервал.
async function cpuUsage(sampleMs = 180): Promise<number> {
  const a = sample(os.cpus());
  await new Promise((r) => setTimeout(r, sampleMs));
  const b = sample(os.cpus());
  const idle = b.idle - a.idle;
  const total = b.total - a.total;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - idle / total));
}

// Память: на Linux берём MemAvailable из /proc/meminfo (совпадает с `free`),
// иначе — os.freemem().
async function memInfo(): Promise<{ total: number; used: number; free: number }> {
  const total = os.totalmem();
  let free = os.freemem();
  try {
    const txt = await readFile("/proc/meminfo", "utf8");
    const m = /MemAvailable:\s+(\d+)\s+kB/.exec(txt);
    if (m) free = Number(m[1]) * 1024;
  } catch {}
  return { total, used: Math.max(0, total - free), free };
}

async function diskInfo(): Promise<Health["disk"]> {
  const dbPath = databaseFilePath();
  const dir = dbPath ? dirname(dbPath) : process.cwd();
  const target = existsSync(dir) ? dir : process.cwd();
  try {
    const s = await statfs(target);
    const bsize = Number(s.bsize);
    const total = Number(s.blocks) * bsize;
    const free = Number(s.bavail) * bsize;
    return { total, used: Math.max(0, total - free), free };
  } catch {
    return null;
  }
}

function dbSize(): number {
  const dbPath = databaseFilePath();
  if (!dbPath) return 0;
  let size = 0;
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      size += statSync(dbPath + suffix).size;
    } catch {}
  }
  return size;
}

export async function getServerHealth(): Promise<Health> {
  const cpus = os.cpus();
  const load = os.loadavg();
  const [memory, disk, usage] = await Promise.all([
    memInfo(),
    diskInfo(),
    cpuUsage(),
  ]);
  const backups = listBackups();

  return {
    memory,
    disk,
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model?.trim() || "—",
      load1: load[0],
      load5: load[1],
      load15: load[2],
      usage,
    },
    uptime: { system: os.uptime(), process: process.uptime() },
    db: {
      size: dbSize(),
      backups: backups.length,
      lastBackup: backups[0]?.date ?? null,
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      node: process.version,
      hostname: os.hostname(),
    },
    now: new Date().toISOString(),
  };
}
