"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { uploadImage } from "@/lib/image-upload";
import { COVER_GRADIENTS } from "@/lib/cover";

export function CoverPicker({
  value,
  onPick,
  trigger,
  triggerClassName,
  align = "left",
}: {
  value: string | null;
  onPick: (cover: string | null) => void;
  trigger: ReactNode;
  triggerClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const url = await uploadImage(f);
      if (url) {
        onPick(url);
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
        aria-label="Обложка"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1.5 w-[304px] animate-panel-in rounded-2xl border border-border bg-surface p-2.5 shadow-[var(--shadow-lg)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="mb-2 flex items-center justify-between px-0.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ImagePlus size={13} />
              )}
              Загрузить фото
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onPick(null);
                  setOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-danger"
              >
                <X size={13} /> Убрать
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {COVER_GRADIENTS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  onPick(g);
                  setOpen(false);
                }}
                style={{ background: g }}
                className={cn(
                  "h-12 rounded-lg ring-1 ring-black/5 transition-transform hover:scale-[1.04]",
                  value === g && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
                )}
                aria-label="Градиент-обложка"
              />
            ))}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFile}
          />
        </div>
      )}
    </div>
  );
}
