"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Check, Loader2, Hash, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { autosaveJournal } from "@/lib/actions";
import { MOODS } from "@/lib/journal-format";
import { parseTags, dedupeTags } from "@/lib/journal-tags";
import { RichEditor } from "./RichEditor";

export function JournalEditor({
  date,
  initialMood,
  initialBody,
  initialTags,
}: {
  date: string;
  initialMood: number | null;
  initialBody: string | null;
  initialTags: string[];
}) {
  const [mood, setMood] = useState<number | null>(initialMood);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const moodRef = useRef<number | null>(initialMood);
  const bodyRef = useRef<string>(initialBody ?? "");
  const tagsRef = useRef<string[]>(initialTags);
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
          tags: tagsRef.current,
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

  function setTagsAndSave(next: string[]) {
    const deduped = dedupeTags(next);
    setTags(deduped);
    tagsRef.current = deduped;
    save();
  }

  function commitInput() {
    const parsed = parseTags(tagInput);
    if (parsed.length) setTagsAndSave([...tags, ...parsed]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTagsAndSave(tags.filter((x) => x !== t));
  }

  function onTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      if (tagInput.trim()) {
        e.preventDefault();
        commitInput();
      }
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
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

      {/* Теги записи */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 focus-within:border-accent">
        <Hash size={15} className="text-faint" />
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-lg bg-accent-soft py-0.5 pl-2 pr-1 text-[12.5px] font-medium text-accent-soft-text"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              aria-label={`Убрать тег ${t}`}
              className="flex h-4 w-4 items-center justify-center rounded text-accent-soft-text/70 transition-colors hover:bg-accent/15 hover:text-accent-soft-text"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={onTagKeyDown}
          onBlur={commitInput}
          placeholder={tags.length === 0 ? "Теги: настя, учёба, спорт…" : "ещё тег…"}
          className="min-w-[120px] flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-faint"
        />
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
