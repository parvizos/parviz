"use client";

import { useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { autosaveJournal } from "@/lib/actions";
import { MOODS } from "@/lib/journal-format";
import { RichEditor } from "./RichEditor";

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
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const moodRef = useRef<number | null>(initialMood);
  const bodyRef = useRef<string>(initialBody ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function markSaved() {
    setStatus("saved");
    setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
  }

  function save() {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await autosaveJournal(date, {
          mood: moodRef.current,
          body: bodyRef.current.trim() ? bodyRef.current : null,
        });
        markSaved();
      } catch {
        setStatus("idle");
      }
    }, 700);
  }

  function chooseMood(v: number) {
    const next = mood === v ? null : v;
    setMood(next);
    moodRef.current = next;
    save();
  }

  function onBody(html: string) {
    bodyRef.current = html;
    save();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
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
        </span>
      </div>

      <RichEditor
        initialHTML={initialBody ?? ""}
        placeholder="Как прошёл день? Что случилось, что важно, о чём думаешь…"
        onChange={onBody}
        minHeightClass="min-h-[38vh]"
      />
    </div>
  );
}
