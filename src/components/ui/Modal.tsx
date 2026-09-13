"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./Button";
import type { ReactNode } from "react";

const SIZE: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
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
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-4 sm:p-6">
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
          "relative z-10 mb-8 mt-[7vh] h-fit w-full animate-panel-in rounded-2xl border border-border bg-surface shadow-[var(--shadow-lg)]",
          SIZE[size],
        )}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
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
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
