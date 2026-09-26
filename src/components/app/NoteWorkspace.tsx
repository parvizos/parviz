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
  FileText,
  Image as ImageIcon,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { stripHtml } from "@/lib/text";
import { areaColor } from "@/lib/task-format";
import { coverStyle } from "@/lib/cover";
import {
  autosaveNote,
  updateNote,
  toggleNotePin,
  deleteNote,
} from "@/lib/actions";
import { RichEditor } from "./RichEditorLazy";
import { EmojiPicker } from "./EmojiPicker";
import { CoverPicker } from "./CoverPicker";
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
    icon: string | null;
    cover: string | null;
    subjectId: string | null;
    subjectName: string | null;
    subjectColor: string | null;
    pinned: boolean;
  };
  subjectOptions: SubjectOption[];
}) {
  const router = useRouter();
  const { focusMode, setFocusMode } = useUi();
  const [title, setTitle] = useState(note.title);
  const [icon, setIcon] = useState<string | null>(note.icon);
  const [cover, setCover] = useState<string | null>(note.cover);
  const [subjectId, setSubjectId] = useState(note.subjectId ?? "");
  const [pinned, setPinned] = useState(note.pinned);
  const [words, setWords] = useState(() => countWords(stripHtml(note.body)));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, startTransition] = useTransition();

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Чип предмета: берём из опций активного семестра, иначе — из самого
  // конспекта (предмет может быть из другого семестра).
  const optSubject = subjectOptions.find((s) => s.id === subjectId);
  const subject: { id: string; name: string; color: string | null } | null =
    optSubject
      ? { id: optSubject.id, name: optSubject.name, color: optSubject.color }
      : subjectId && subjectId === note.subjectId && note.subjectName
        ? { id: subjectId, name: note.subjectName, color: note.subjectColor }
        : null;

  useEffect(() => () => setFocusMode(false), [setFocusMode]);

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

  function onIcon(next: string | null) {
    setIcon(next);
    setStatus("saving");
    startTransition(async () => {
      try {
        await updateNote(note.id, { icon: next });
        markSaved();
      } catch {
        setStatus("idle");
      }
    });
  }

  function onCover(next: string | null) {
    setCover(next);
    setStatus("saving");
    startTransition(async () => {
      try {
        await updateNote(note.id, { cover: next });
        markSaved();
      } catch {
        setStatus("idle");
      }
    });
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

  const head = (
    <>
      {cover && (
        <div
          className="group/cover relative mb-3 h-40 overflow-hidden rounded-2xl sm:h-52"
          style={coverStyle(cover)}
        >
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover/cover:opacity-100">
            <CoverPicker
              value={cover}
              onPick={onCover}
              align="right"
              triggerClassName="flex h-7 items-center gap-1.5 rounded-lg bg-black/35 px-2.5 text-[12px] font-medium text-white backdrop-blur transition-colors hover:bg-black/55"
              trigger={
                <>
                  <ImageIcon size={13} /> Изменить обложку
                </>
              }
            />
          </div>
        </div>
      )}
      <div className={cn("mb-2", cover && icon && "relative z-10 -mt-10")}>
        {!cover && (
          <div className="mb-1">
            <CoverPicker
              value={cover}
              onPick={onCover}
              triggerClassName="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-faint transition-colors hover:bg-surface-2 hover:text-muted"
              trigger={
                <>
                  <ImageIcon size={14} /> Добавить обложку
                </>
              }
            />
          </div>
        )}
        <EmojiPicker
          value={icon}
          onPick={onIcon}
          triggerClassName={cn(
            "flex items-center justify-center transition-colors",
            icon
              ? cn(
                  "h-16 w-16 rounded-2xl text-[48px] leading-none",
                  cover
                    ? "bg-surface shadow-[var(--shadow-sm)] ring-4 ring-bg"
                    : "hover:bg-surface-2",
                )
              : "h-9 gap-1.5 rounded-xl px-2 text-[13px] text-faint hover:bg-surface-2",
          )}
          trigger={
            icon ? (
              icon
            ) : (
              <>
                <FileText size={16} /> Добавить иконку
              </>
            )
          }
        />
        <input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Без названия"
          autoFocus={!title}
          className="mt-2 w-full bg-transparent text-[34px] font-bold leading-tight tracking-tight text-text outline-none placeholder:text-faint/50"
        />
        {subject && (
          <Link
            href={`/predmety/${subject.id}`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium transition-opacity hover:opacity-80"
            style={{
              background: `color-mix(in oklab, ${areaColor(subject.color)} 15%, transparent)`,
              color: areaColor(subject.color),
            }}
          >
            <GraduationCap size={13} />
            {subject.name}
          </Link>
        )}
      </div>
    </>
  );

  const editor = (
    <RichEditor
      initialHTML={note.body ?? ""}
      placeholder="Пиши конспект: заголовки, списки, выноски, фото, видео и файлы. Жми «/» для команд."
      onChange={onBody}
      minHeightClass="min-h-[40vh]"
    />
  );

  if (focusMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg">
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-bg/95 px-4 backdrop-blur sm:px-6">
          {topBar}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-6">
            {head}
            {editor}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-5 flex items-center gap-2">{topBar}</div>
      {head}
      {editor}
    </div>
  );
}
