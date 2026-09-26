"use client";

import { useEffect, useRef, useState } from "react";
import { BookText, Check, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { stripHtml } from "@/lib/text";
import { autosaveEntityBody, type NotableKind } from "@/lib/actions";
import { RichEditor } from "./RichEditorLazy";

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
function plWords(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "слово";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "слова";
  return "слов";
}

/**
 * «База знаний» одной сущности: большое свободное описание с фото.
 * Разворачивается на весь экран отдельным окном (тот же редактор — курсор не теряется).
 */
export function EntityNotes({
  kind,
  id,
  initialHTML,
  title = "База знаний",
  placeholder,
}: {
  kind: NotableKind;
  id: string;
  initialHTML: string;
  title?: string;
  placeholder?: string;
}) {
  const [words, setWords] = useState(() => countWords(stripHtml(initialHTML)));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  function markSaved() {
    setStatus("saved");
    setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
  }

  function onBody(html: string, text: string) {
    setWords(countWords(text));
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await autosaveEntityBody(kind, id, html);
        markSaved();
      } catch {
        setStatus("idle");
      }
    }, 800);
  }

  const statusEl = (
    <span className="flex items-center gap-1 text-[12px] text-faint">
      {status === "saving" && (
        <>
          <Loader2 size={12} className="animate-spin" /> Сохраняю…
        </>
      )}
      {status === "saved" && (
        <>
          <Check size={12} className="text-success" /> Сохранено
        </>
      )}
      {status === "idle" && words > 0 && `${words} ${plWords(words)}`}
    </span>
  );

  const heading = (
    <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted">
      <BookText size={14} />
      {title}
    </h2>
  );

  return (
    <section>
      {!expanded && (
        <div className="mb-2.5 flex items-center gap-2 px-1">
          {heading}
          <div className="ml-auto flex items-center gap-2">
            {statusEl}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="Развернуть на весь экран"
              title="Развернуть на весь экран"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          expanded
            ? "fixed inset-0 z-50 flex flex-col bg-bg"
            : "rounded-2xl border border-border bg-surface p-4 sm:p-5",
        )}
      >
        {expanded && (
          <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-bg/95 px-4 backdrop-blur sm:px-6">
            {heading}
            <div className="ml-auto flex items-center gap-2">
              {statusEl}
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Свернуть"
                title="Свернуть (Esc)"
                className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <Minimize2 size={15} /> Свернуть
              </button>
            </div>
          </div>
        )}

        <div
          className={cn(
            expanded &&
              "mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 sm:px-6",
          )}
        >
          <RichEditor
            initialHTML={initialHTML}
            placeholder={
              placeholder ??
              "Пиши что угодно и вставляй фото: перетащи, вставь из буфера или жми «/». Заметки, идеи, контекст…"
            }
            onChange={onBody}
            minHeightClass={expanded ? "min-h-[40vh]" : "min-h-[30vh]"}
          />
        </div>
      </div>
    </section>
  );
}
