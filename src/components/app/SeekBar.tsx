"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Полоса перемотки/громкости: клик и перетаскивание. Во время перетаскивания
 * показываем локальное значение и коммитим только на отпускании — чтобы не
 * бороться с обновлениями времени от плеера.
 */
export function SeekBar({
  value,
  max,
  onSeek,
  onScrub,
  thin = false,
  className,
  ariaLabel,
}: {
  value: number;
  max: number;
  onSeek: (t: number) => void;
  onScrub?: (t: number) => void;
  thin?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const pct = max > 0 ? Math.min(100, Math.max(0, (shown / max) * 100)) : 0;

  const posFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return x * max;
  };

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(shown)}
      tabIndex={0}
      className={cn(
        "group relative flex cursor-pointer touch-none select-none items-center",
        thin ? "h-3" : "h-5",
        className,
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const t = posFromClientX(e.clientX);
        setDrag(t);
        onScrub?.(t);
      }}
      onPointerMove={(e) => {
        if (drag === null) return;
        const t = posFromClientX(e.clientX);
        setDrag(t);
        onScrub?.(t);
      }}
      onPointerUp={(e) => {
        if (drag !== null) {
          onSeek(posFromClientX(e.clientX));
          setDrag(null);
        }
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
      }}
      onKeyDown={(e) => {
        const step = max / 40 || 1;
        if (e.key === "ArrowRight") onSeek(Math.min(max, value + step));
        else if (e.key === "ArrowLeft") onSeek(Math.max(0, value - step));
      }}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-surface-3",
          thin ? "h-1" : "h-1.5",
        )}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className={cn(
          "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[var(--shadow-sm)] transition-opacity",
          thin
            ? "h-2.5 w-2.5 opacity-0 group-hover:opacity-100"
            : "h-3.5 w-3.5",
          drag !== null && "opacity-100",
        )}
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}
