"use client";

import { useRef, useState, useTransition } from "react";
import {
  Upload,
  RotateCcw,
  Loader2,
  Check,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  restoreFromBackup,
  restoreFromUpload,
  type RestoreResult,
} from "@/lib/data-actions";
import type { BackupInfo } from "@/lib/backup";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}
function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Target = { label: string; run: () => Promise<RestoreResult> };

export function DataRestore({ backups }: { backups: BackupInfo[] }) {
  const [confirm, setConfirm] = useState<Target | null>(null);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  function doRestore(t: Target) {
    setConfirm(null);
    setResult(null);
    startTransition(async () => {
      const res = await t.run();
      setResult(res);
      if (res.ok) setTimeout(() => window.location.reload(), 1400);
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setConfirm({
      label: `файла «${f.name}»`,
      run: () => {
        const fd = new FormData();
        fd.append("file", f);
        return restoreFromUpload(fd);
      },
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2 text-[13px] text-muted">
        <ShieldCheck size={16} className="text-success" />
        Каждый день сервер сам делает снимок в{" "}
        <span className="font-mono text-[12px]">data/backups</span>. Хранятся
        последние 7. Восстановление заменит текущие данные, но перед этим
        сохранит снимок «до восстановления» — откатить можно.
      </div>

      {backups.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {backups.map((b) => (
            <li
              key={b.name}
              className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
            >
              <div className="min-w-0">
                <div className="truncate font-mono text-text">{b.name}</div>
                <div className="text-[12px] text-muted tabular">
                  {fmtDate(b.date)} · {fmtBytes(b.size)}
                </div>
              </div>
              <button
                onClick={() =>
                  setConfirm({
                    label: `снимка «${b.name}»`,
                    run: () => restoreFromBackup(b.name),
                  })
                }
                disabled={pending}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50"
              >
                <RotateCcw size={13} /> Восстановить
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-faint">
          Пока нет снимков — первый появится при следующем заходе в приложение.
        </p>
      )}

      {/* Восстановление из файла */}
      <div className="mt-4 border-t border-border pt-4">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-text transition-colors hover:bg-surface-2 hover:border-border-strong disabled:opacity-50"
        >
          <Upload size={16} />
          Восстановить из файла (.db или .json)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".db,.sqlite,.json,application/json"
          hidden
          onChange={onFile}
        />
        <p className="mt-2 text-[12px] text-faint">
          Подойдёт любой скачанный отсюда бэкап — «.db» или «.json».
        </p>
      </div>

      {/* Результат */}
      {(pending || result) && (
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px]",
            pending
              ? "border-border bg-surface-2 text-muted"
              : result?.ok
                ? "border-success/30 bg-success-soft text-success"
                : "border-danger/30 bg-danger-soft text-danger",
          )}
        >
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Восстанавливаю…
            </>
          ) : result?.ok ? (
            <>
              <Check size={15} /> Восстановлено: {result.inserted} записей в{" "}
              {result.tables} таблицах. Перезагружаю…
            </>
          ) : (
            <>
              <AlertTriangle size={15} /> {result?.error}
            </>
          )}
        </div>
      )}

      {/* Подтверждение */}
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 animate-overlay-in bg-black/40 backdrop-blur-[2px]"
            onClick={() => setConfirm(null)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md animate-panel-in rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-lg)]">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-[16px] font-semibold text-text">
                Восстановить данные?
              </h3>
            </div>
            <p className="text-[13.5px] leading-relaxed text-muted">
              Текущие данные будут заменены содержимым {confirm.label}. Перед
              заменой автоматически сохранится снимок «до восстановления», так
              что это можно откатить.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                Отмена
              </button>
              <button
                onClick={() => doRestore(confirm)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-danger px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                <RotateCcw size={16} /> Восстановить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
