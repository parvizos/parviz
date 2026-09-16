"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, X, Loader2 } from "lucide-react";
import { exitDemo } from "@/lib/demo-actions";

/** Полоса-напоминание, что сейчас активен демо-режим, с кнопкой выхода. */
export function DemoBanner() {
  const router = useRouter();
  const [pending, start] = useTransition();
  function exit() {
    start(async () => {
      try {
        await exitDemo();
      } catch {}
      router.refresh();
    });
  }
  return (
    <div className="flex items-center gap-2 bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg">
      <Clapperboard size={15} className="shrink-0" />
      <span className="flex-1 truncate">
        Демо-режим — твои настоящие данные не тронуты.
      </span>
      <button
        onClick={exit}
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 transition-colors hover:bg-white/30 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <X size={13} />
        )}
        Выйти
      </button>
    </div>
  );
}
