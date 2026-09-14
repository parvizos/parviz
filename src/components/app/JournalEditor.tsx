"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { upsertJournal } from "@/lib/actions";
import { MOODS } from "@/lib/journal-format";

export function JournalEditor({
  date,
  initialMood,
  initialBody,
}: {
  date: string;
  initialMood: number | null;
  initialBody: string | null;
}) {
  const [mood, setMood] = useState<number | null>(initialMood);
  const [body, setBody] = useState(initialBody ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [, startTransition] = useTransition();
  const savedBody = useRef(initialBody ?? "");

  function save(nextMood: number | null, nextBody: string) {
    setStatus("saving");
    startTransition(async () => {
      try {
        await upsertJournal(date, {
          mood: nextMood,
          body: nextBody.trim() || null,
        });
        savedBody.current = nextBody;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch {
        setStatus("idle");
      }
    });
  }

  function chooseMood(v: number) {
    const next = mood === v ? null : v;
    setMood(next);
    save(next, body);
  }

  function onBlurBody() {
    if (body === savedBody.current) return;
    save(mood, body);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">
          Как прошёл день?
        </span>
        <span className="flex items-center gap-1 text-[12px] text-faint">
          {status === "saving" && (
            <>
              <Loader2 size={13} className="animate-spin" /> Сохраняю…
            </>
          )}
          {status === "saved" && (
            <>
              <Check size={13} className="text-success" /> Сохранено
            </>
          )}
        </span>
      </div>

      <div className="mb-4 flex gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => chooseMood(m.value)}
            title={m.label}
            aria-label={m.label}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border text-[20px] transition-all",
              mood === m.value
                ? "scale-105 border-accent bg-accent-soft"
                : "border-border opacity-70 hover:bg-surface-2 hover:opacity-100",
            )}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={onBlurBody}
        placeholder="Что случилось, что важно, о чём думаешь…"
        className="min-h-[160px] w-full resize-y rounded-xl border border-border bg-bg px-3.5 py-2.5 text-[14.5px] leading-relaxed text-text placeholder:text-faint focus:border-accent"
      />
      <p className="mt-2 text-[12px] text-faint">Сохраняется автоматически.</p>
    </div>
  );
}
