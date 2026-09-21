"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { createPage } from "@/lib/actions";

/** Создаёт страницу верхнего уровня (или вложенную) и открывает её. */
export function NewPageButton({
  parentId = null,
  children = "Новая страница",
  variant = "primary",
  className,
}: {
  parentId?: string | null;
  children?: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  function create() {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const id = await createPage({ parentId });
        router.push(`/bloknot/${id}`);
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <button
      onClick={create}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-60",
        variant === "primary"
          ? "h-9 bg-accent px-3.5 text-accent-fg shadow-[var(--shadow-sm)] hover:bg-accent-hover"
          : "h-9 border border-border px-3.5 text-muted hover:bg-surface-2 hover:text-text",
        className,
      )}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
      {children}
    </button>
  );
}
