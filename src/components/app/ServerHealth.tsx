"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Database,
  Server,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Health } from "@/lib/health";

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} Б`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} КБ`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} МБ`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} ГБ`;
}

function fmtUptime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} дн`);
  if (h) parts.push(`${h} ч`);
  parts.push(`${m} мин`);
  return parts.join(" ");
}

function plCores(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "ядро";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "ядра";
  return "ядер";
}

function toneColor(pct: number): string {
  if (pct >= 90) return "var(--danger)";
  if (pct >= 75) return "var(--warning)";
  return "var(--accent)";
}

function Meter({
  icon,
  label,
  pct,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  pct: number;
  value: string;
  sub: string;
}) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] text-muted">
          <span className="text-faint">{icon}</span>
          {label}
        </span>
        <span className="tabular text-[13px] font-medium text-text">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${p}%`, background: toneColor(p) }}
        />
      </div>
      <div className="mt-1 text-[11.5px] text-faint">{sub}</div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11.5px] text-faint">{label}</div>
        <div className="truncate text-[13px] font-medium text-text tabular">
          {value}
        </div>
      </div>
    </div>
  );
}

export function ServerHealth({ initial }: { initial: Health }) {
  const [h, setH] = useState<Health>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as Health;
        if (alive) {
          setH(data);
          setLive(true);
        }
      } catch {}
    };
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const memPct = h.memory.total ? (h.memory.used / h.memory.total) * 100 : 0;
  const diskPct = h.disk && h.disk.total ? (h.disk.used / h.disk.total) * 100 : 0;
  const cpuPct = h.cpu.usage * 100;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
          <Activity size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-text">
            {h.system.hostname}
          </div>
          <div className="truncate text-[12px] text-faint">
            {h.system.platform} · {h.system.arch} · Node {h.system.node}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] text-faint">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              live ? "animate-pulse bg-success" : "bg-faint",
            )}
          />
          live
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <Meter
          icon={<MemoryStick size={14} />}
          label="Оперативная память"
          pct={memPct}
          value={`${fmtBytes(h.memory.used)} / ${fmtBytes(h.memory.total)}`}
          sub={`${memPct.toFixed(0)}% занято · свободно ${fmtBytes(h.memory.free)}`}
        />
        {h.disk && (
          <Meter
            icon={<HardDrive size={14} />}
            label="Диск"
            pct={diskPct}
            value={`${fmtBytes(h.disk.used)} / ${fmtBytes(h.disk.total)}`}
            sub={`${diskPct.toFixed(0)}% занято · свободно ${fmtBytes(h.disk.free)}`}
          />
        )}
        <Meter
          icon={<Cpu size={14} />}
          label="Процессор"
          pct={cpuPct}
          value={`${cpuPct.toFixed(0)}%`}
          sub={`нагрузка ${h.cpu.load1.toFixed(2)} · ${h.cpu.cores} ${plCores(h.cpu.cores)}`}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
        <Stat
          icon={<Clock size={15} />}
          label="Сервер работает"
          value={fmtUptime(h.uptime.system)}
        />
        <Stat
          icon={<Server size={15} />}
          label="Сервис работает"
          value={fmtUptime(h.uptime.process)}
        />
        <Stat
          icon={<Database size={15} />}
          label="Размер базы"
          value={fmtBytes(h.db.size)}
        />
        <Stat
          icon={<Gauge size={15} />}
          label="Нагрузка 1·5·15м"
          value={`${h.cpu.load1.toFixed(2)} · ${h.cpu.load5.toFixed(2)} · ${h.cpu.load15.toFixed(2)}`}
        />
        <Stat
          icon={<HardDrive size={15} />}
          label="Бэкапы"
          value={`${h.db.backups} шт`}
        />
        <Stat
          icon={<Cpu size={15} />}
          label="Ядра"
          value={`${h.cpu.cores} ${plCores(h.cpu.cores)}`}
        />
      </div>
    </div>
  );
}
