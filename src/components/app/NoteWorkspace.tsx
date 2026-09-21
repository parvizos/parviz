"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pin,
  Trash2,
  Check,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { stripHtml } from "@/lib/text";
import { autosaveNote, updateNote, toggleNotePin, deleteNote } from "@/lib/actions";
import { RichEditor } from "./RichEditor";
import { useUi } from "./ui-context";
import type { SubjectOption } from "./types";

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

export function NoteWorkspace({
  note,
  subjectOptions,
}: {
  note: {
    id: string;
    title: string;
    body: string | null;
    subjectId: string | null;
    pinned: boolean;
  };
  subjectOptions: SubjectOption[];
}) {
  const router = useRouter();
  const { focusMode, setFocusMode } = useUi();
  const [title, setTitle] = useState(note.title);
  const [subjectId, setSubjectId] = useState(note.subjectId ?? "");
  const [pinned, setPinned] = useState(note.pinned);
  const [words, setWords] = useState(() =>
    countWords(stripHtml(note.body)),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, startTransition] = useTransition();

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Выходим из режима фокуса, когда покидаем конспект.
  useEffect(() => () => setFocusMode(false), [setFocusMode]);

  // В полноэкранном режиме: Esc — свернуть, блокируем прокрутку страницы.
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [focusMode, setFocusMode]);

  function markSaved() {
    setStatus("saved");
    setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
  }

  function onTitle(value: string) {
    setTitle(value);
    setStatus("saving");
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      try {
        await autosaveNote(note.id, { title: value });
        markSaved();
      } catch {
        setStatus("idle");
      }
    }, 700);
  }

  function onBody(html: string, text: string) {
    setWords(countWords(text));
    setStatus("saving");
    if (bodyTimer.current) clearTimeout(bodyTimer.current);
    bodyTimer.current = setTimeout(async () => {
      try {
        await autosaveNote(note.id, { body: html });
        markSaved();
      } catch {
        setStatus("idle");
      }
    }, 800);
  }

  function onSubject(value: string) {
    setSubjectId(value);
    startTransition(async () => {
      await updateNote(note.id, { subjectId: value || null });
    });
  }

  function onPin() {
    const next = !pinned;
    setPinned(next);
    startTransition(async () => {
      await toggleNotePin(note.id, next);
    });
  }

  function onDelete() {
    if (!confirm("Удалить конспект?")) return;
    startTransition(async () => {
      await deleteNote(note.id);
      router.push("/konspekty");
    });
  }

  const topBar = (
    <>
      <Link
        href="/konspekty"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Конспекты
      </Link>
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
        {status === "idle" && `${words} ${plWords(words)}`}
      </span>

      <select
        value={subjectId}
        onChange={(e) => onSubject(e.target.value)}
        disabled={pending}
        className="h-8 max-w-[150px] rounded-lg border border-border bg-surface px-2 text-[12.5px] text-muted"
        aria-label="Предмет"
      >
        <option value="">Без предмета</option>
        {subjectOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <button
        onClick={() => setFocusMode(!focusMode)}
        aria-label={focusMode ? "Свернуть" : "Развернуть на весь экран"}
        title={focusMode ? "Свернуть (Esc)" : "Развернуть на весь экран"}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          focusMode
            ? "text-accent"
            : "text-faint hover:bg-surface-2 hover:text-text",
        )}
      >
        {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <button
        onClick={onPin}
        aria-label={pinned ? "Открепить" : "Закрепить"}
        title={pinned ? "Открепить" : "Закрепить"}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          pinned
            ? "text-accent"
            : "text-faint hover:bg-surface-2 hover:text-text",
        )}
      >
        <Pin size={16} className={pinned ? "fill-current" : ""} />
      </button>
      <button
        onClick={onDelete}
        aria-label="Удалить"
        title="Удалить"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-danger"
      >
        <Trash2 size={16} />
      </button>
    </>
  );

  const content = (
    <>
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Заголовок"
        autoFocus={!title}
        className="mb-4 w-full bg-transparent text-[30px] font-semibold leading-tight tracking-tight text-text outline-none placeholder:text-faint/60"
      />
      <RichEditor
        initialHTML={note.body ?? ""}
        placeholder="Пиши как в статье: заголовки, списки, цитаты, чек-боксы…"
        onChange={onBody}
        toolbarStickyClass={focusMode ? "top-0" : undefined}
      />
    </>
  );

  if (focusMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg">
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-bg/95 px-4 backdrop-blur sm:px-6">
          {topBar}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-6">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-6 flex items-center gap-2">{topBar}</div>
      {content}
    </div>
  );
}
