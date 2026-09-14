"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthLabel, currentMonth } from "@/lib/dates";

export function MonthNav({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function go(m: string) {
    const q = m === currentMonth() ? "" : `?m=${m}`;
    router.push(pathname + q);
  }

  const btn =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-2 hover:text-text";

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => go(addMonths(month, -1))} className={btn} aria-label="Прошлый месяц">
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[130px] text-center text-[13px] font-medium capitalize text-text">
        {monthLabel(month)}
      </span>
      <button onClick={() => go(addMonths(month, 1))} className={btn} aria-label="Следующий месяц">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
