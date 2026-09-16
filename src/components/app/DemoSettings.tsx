"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Loader2, LogOut, RefreshCw, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { enterDemo, exitDemo, refreshDemo } from "@/lib/demo-actions";

export function DemoSettings({
  workspace,
  available,
}: {
  workspace: "real" | "demo";
  available: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
      } catch {}
      router.refresh();
    });
  const demo = workspace === "demo";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-text">
          <Clapperboard size={18} />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-medium text-text">
            {demo ? "Ты в демо-режиме" : "Демо-режим для показа"}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Демо — это <strong>отдельная база</strong>, забитая данными во всех
            разделах (для видео и показа). Твои настоящие данные лежат в другом
            файле и не меняются: заходишь в демо и возвращаешься к своим в один
            тап.
          </p>
          {!available ? (
            <p className="mt-3 text-[13px] text-faint">
              Доступно только для локальной базы (файла).
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {demo ? (
                <>
                  <Button onClick={() => run(exitDemo)} disabled={pending}>
                    {pending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <LogOut size={16} />
                    )}
                    Выйти в свои данные
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => run(refreshDemo)}
                    disabled={pending}
                  >
                    <RefreshCw size={15} />
                    Перезалить демо
                  </Button>
                </>
              ) : (
                <Button onClick={() => run(enterDemo)} disabled={pending}>
                  {pending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} />
                  )}
                  Войти в демо
                </Button>
              )}
            </div>
          )}
          {demo && (
            <p className="mt-2 text-[12px] text-faint">
              Что бы ты ни делал здесь — твои реальные данные не тронуты.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
