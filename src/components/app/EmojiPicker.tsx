"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Shuffle, X } from "lucide-react";
import { cn } from "@/lib/cn";

// Курированная палитра — покрывает типичные страницы личной системы.
const EMOJI: string[] = [
  "📄", "📝", "📌", "📋", "🗒️", "📁", "🗂️", "📚",
  "💡", "🎯", "🚀", "🔥", "⭐", "✅", "🧠", "❤️",
  "💼", "💰", "📈", "📊", "🧾", "🏦", "🪙", "💳",
  "🎓", "📖", "✏️", "🔬", "🧪", "📐", "🗓️", "⏰",
  "🏠", "✈️", "🌍", "🗺️", "🏔️", "🏖️", "🚗", "🎒",
  "🍳", "🥗", "☕", "🍎", "🏋️", "🏃", "🧘", "💊",
  "🎨", "🎵", "🎬", "🎮", "📷", "🎧", "🕹️", "🎸",
  "👤", "👥", "💬", "📞", "🤝", "🎁", "🎉", "🔑",
];

/**
 * Компактный выбор эмодзи-иконки: курированная сетка, «перемешать» и «убрать».
 * Триггер задаёт родитель (большая иконка страницы, кнопка в списке и т. п.).
 */
export function EmojiPicker({
  value,
  onPick,
  trigger,
  triggerClassName,
  align = "left",
}: {
  value: string | null;
  onPick: (emoji: string | null) => void;
  trigger: ReactNode;
  triggerClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(e: string | null) {
    onPick(e);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
        aria-label="Выбрать иконку"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1 w-[268px] animate-panel-in rounded-2xl border border-border bg-surface p-2.5 shadow-[var(--shadow-lg)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="mb-2 flex items-center justify-between px-0.5">
            <button
              type="button"
              onClick={() => pick(EMOJI[Math.floor(Math.random() * EMOJI.length)])}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Shuffle size={13} /> Случайная
            </button>
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-danger"
            >
              <X size={13} /> Убрать
            </button>
          </div>
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => pick(e)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-[18px] leading-none transition-colors hover:bg-surface-2",
                  value === e && "bg-accent-soft",
                )}
                aria-label={`Иконка ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
