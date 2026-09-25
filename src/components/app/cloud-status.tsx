"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Cloud,
  RefreshCw,
  Image as ImageIcon,
  Music,
  Paperclip,
  Database,
  Box,
  Loader2,
  Check,
} from "lucide-react";
import { getCloudStatus, type CloudStatus } from "@/lib/storage-actions";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} КБ`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} МБ`;
  return `${(mb / 1024).toFixed(2)} ГБ`;
}

function plFiles(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "файл";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "файла";
  return "файлов";
}

function ago(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "только что";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

const META: Record<string, { label: string; color: string; Icon: typeof Cloud }> = {
  images: { label: "Фото", color: "#6366f1", Icon: ImageIcon },
  tracks: { label: "Музыка", color: "#a855f7", Icon: Music },
  files: { label: "Вложения", color: "#14b8a6", Icon: Paperclip },
  litestream: { label: "База (репликация)", color: "#f59e0b", Icon: Database },
};
function meta(prefix: string) {
  return (
    META[prefix] ?? {
      label: prefix.startsWith(".") ? "Служебное" : "Прочее",
      color: "#94a3b8",
      Icon: Box,
    }
  );
}

export function CloudStatus() {
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getCloudStatus());
    } catch {
      setStatus({ available: false, mediaConfigured: false, replication: false, error: "нет связи" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- загрузка состояния при монтировании
    load();
  }, [load]);

  const groups = status?.usage
    ? [...status.usage.groups].sort((a, b) => b.bytes - a.bytes)
    : [];
  const totalBytes = status?.usage?.total.bytes ?? 0;
  const lsGroup = groups.find((g) => g.prefix === "litestream");

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-text">
          <Cloud size={17} />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-medium text-text">Состояние облака</p>
          <p className="text-[12px] text-faint">Сколько занято в Cloudflare R2</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Обновить"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && !status && (
        <div className="flex items-center gap-2 py-4 text-[13px] text-muted">
          <Loader2 size={15} className="animate-spin" /> Считаю объём в облаке…
        </div>
      )}

      {status && !status.available && (
        <div className="py-2 text-[13px] text-muted">
          {status.error ? (
            <span className="text-danger">Не удалось получить состояние: {status.error}</span>
          ) : (
            "Облако не подключено — настрой хранилище выше."
          )}
        </div>
      )}

      {status?.available && status.usage && (
        <div className="space-y-4">
          {/* Всего */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold tracking-tight text-text">
                {fmtBytes(totalBytes)}
              </span>
              <span className="text-[13px] text-faint">
                · {status.usage.total.count} объектов
              </span>
            </div>
            {/* Сегментированная полоса */}
            <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              {groups.map((g) => {
                const w = totalBytes ? (g.bytes / totalBytes) * 100 : 0;
                if (w <= 0) return null;
                return (
                  <div
                    key={g.prefix}
                    style={{ width: `${w}%`, background: meta(g.prefix).color }}
                    title={`${meta(g.prefix).label}: ${fmtBytes(g.bytes)}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Разбивка */}
          <div className="space-y-1">
            {groups.map((g) => {
              const m = meta(g.prefix);
              const Icon = m.Icon;
              return (
                <div key={g.prefix} className="flex items-center gap-2.5 py-1">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: m.color }}
                  />
                  <Icon size={15} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-text">
                    {m.label}
                  </span>
                  <span className="shrink-0 text-[12px] text-faint">
                    {g.count} шт
                  </span>
                  <span className="w-16 shrink-0 text-right text-[13px] font-medium text-text">
                    {fmtBytes(g.bytes)}
                  </span>
                </div>
              );
            })}
            {groups.length === 0 && (
              <p className="py-1 text-[13px] text-muted">В облаке пока пусто.</p>
            )}
          </div>

          {/* Репликация базы */}
          <div className="border-t border-border pt-3">
            {status.replication ? (
              <div className="flex items-start gap-2 text-[13px]">
                <Check size={15} className="mt-0.5 shrink-0 text-success" />
                <div>
                  <span className="text-text">База реплицируется в реальном времени</span>
                  {lsGroup?.lastModified && (
                    <span className="block text-[12px] text-faint">
                      последняя запись {ago(lsGroup.lastModified)}
                      {lsGroup.count
                        ? ` · ${lsGroup.count} ${plFiles(lsGroup.count)}, ${fmtBytes(lsGroup.bytes)}`
                        : ""}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-[13px] text-muted">
                <Database size={15} className="mt-0.5 shrink-0" />
                <span>
                  Репликация базы не настроена
                  <span className="block text-[12px] text-faint">
                    добавь LITESTREAM_* в .env (см. DEPLOY.md)
                  </span>
                </span>
              </div>
            )}
            {status.localDbBytes != null && (
              <p className="mt-2 text-[12px] text-faint">
                Локальная база на сервере: {fmtBytes(status.localDbBytes)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
