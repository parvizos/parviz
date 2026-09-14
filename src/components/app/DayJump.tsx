"use client";

import { useRouter } from "next/navigation";

export function DayJump({ date }: { date: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      value={date}
      onChange={(e) => {
        if (e.target.value) router.push(`/dnevnik/${e.target.value}`);
      }}
      aria-label="Перейти к дате"
      className="h-9 rounded-xl border border-border bg-surface px-3 text-[13px] text-muted transition-colors focus:border-accent"
    />
  );
}
