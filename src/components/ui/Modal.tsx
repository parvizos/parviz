"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./Button";
import type { ReactNode } from "react";

// На телефоне модалка — «шторка» снизу во всю ширину; на десктопе —
// центрированный диалог с ограничением ширины.
const SIZE: Record<string, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden sm:items-start sm:overflow-y-auto sm:p-6">
      <div
        className="fixed inset-0 animate-overlay-in bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden border border-border bg-surface shadow-[var(--shadow-lg)]",
          // Телефон: шторка снизу
          "animate-sheet-rise rounded-t-3xl",
          // Десктоп: центрированный диалог
          "sm:mt-[7vh] sm:mb-8 sm:max-h-[86vh] sm:animate-panel-in sm:rounded-2xl",
          SIZE[size],
        )}
      >
        {/* Грабер (только на телефоне) */}
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />

        {title && (
          <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 sm:pt-5">
            <div>
              <h2 className="text-[15px] font-semibold text-text">{title}</h2>
              {description && (
                <p className="mt-0.5 text-[13px] text-muted">{description}</p>
              )}
            </div>
            <IconButton
              label="Закрыть"
              onClick={onClose}
              className="-mr-1.5 -mt-1"
            >
              <X size={18} />
            </IconButton>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:pb-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
