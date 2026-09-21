"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Check,
  Loader2,
  Hash,
  X,
  Maximize2,
  Minimize2,
  NotebookPen,
} from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);
  const moodRef = useRef<number | null>(initialMood);
  const bodyRef = useRef<string>(initialBody ?? "");
  const tagsRef = useRef<string[]>(initialTags);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
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
    </span>
  );

  const inner = (
    <>
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
        <div className="flex items-center gap-2">
          {statusEl}
          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="Развернуть на весь экран"
              title="Развернуть на весь экран"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Maximize2 size={16} />
            </button>
          )}
        </div>
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
        toolbarStickyClass={expanded ? "top-0" : undefined}
      />
    </>
  );

  return (
    <div className={cn(expanded && "fixed inset-0 z-50 flex flex-col bg-bg")}>
      {expanded && (
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-bg/95 px-4 backdrop-blur sm:px-6">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted">
            <NotebookPen size={14} /> Запись дня
          </h2>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Свернуть"
            title="Свернуть (Esc)"
            className="ml-auto flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <Minimize2 size={15} /> Свернуть
          </button>
        </div>
      )}
      <div
        className={cn(
          expanded &&
            "mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 sm:px-6",
        )}
      >
        {inner}
      </div>
    </div>
  );
}
