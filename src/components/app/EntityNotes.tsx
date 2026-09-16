"use client";

import { useRef, useState } from "react";
import { BookText, Check, Loader2 } from "lucide-react";
import { stripHtml } from "@/lib/text";
import { autosaveEntityBody, type NotableKind } from "@/lib/actions";
import { RichEditor } from "./RichEditor";

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
 * Единый редактор (тот же, что и конспекты) + автосохранение по сущности.
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted">
          <BookText size={14} />
          {title}
        </h2>
        <span className="ml-auto flex items-center gap-1 text-[12px] text-faint">
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
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <RichEditor
          initialHTML={initialHTML}
          placeholder={
            placeholder ??
            "Пиши что угодно и вставляй фото: перетащи, вставь из буфера или жми «/». Заметки, идеи, контекст…"
          }
          onChange={onBody}
          minHeightClass="min-h-[30vh]"
        />
      </div>
    </section>
  );
}
