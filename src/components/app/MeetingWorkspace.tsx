"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Check,
  Loader2,
  Maximize2,
  Minimize2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { stripHtml } from "@/lib/text";
import { autosaveMeeting, updateMeeting, deleteMeeting } from "@/lib/actions";
import { RichEditor } from "./RichEditorLazy";
import { useUi } from "./ui-context";
import type { PersonOption } from "./types";

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

export function MeetingWorkspace({
  meeting,
  personOptions,
}: {
  meeting: {
    id: string;
    title: string;
    body: string | null;
    date: string;
    personId: string | null;
    location: string | null;
  };
  personOptions: PersonOption[];
}) {
  const router = useRouter();
  const { focusMode, setFocusMode } = useUi();
  const [title, setTitle] = useState(meeting.title);
  const [date, setDate] = useState(meeting.date);
  const [personId, setPersonId] = useState(meeting.personId ?? "");
  const [location, setLocation] = useState(meeting.location ?? "");
  const [words, setWords] = useState(() => countWords(stripHtml(meeting.body)));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, startTransition] = useTransition();

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        await autosaveMeeting(meeting.id, { title: value });
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
        await autosaveMeeting(meeting.id, { body: html });
        markSaved();
      } catch {
        setStatus("idle");
      }
    }, 800);
  }

  function onLocation(value: string) {
    setLocation(value);
    setStatus("saving");
    if (locTimer.current) clearTimeout(locTimer.current);
    locTimer.current = setTimeout(async () => {
      try {
        await updateMeeting(meeting.id, { location: value.trim() || null });
        markSaved();
      } catch {
        setStatus("idle");
      }
    }, 700);
  }

  function onDate(value: string) {
    setDate(value);
    if (!value) return;
    startTransition(async () => {
      await updateMeeting(meeting.id, { date: value });
    });
  }

  function onPerson(value: string) {
    setPersonId(value);
    startTransition(async () => {
      await updateMeeting(meeting.id, { personId: value || null });
    });
  }

  function onDelete() {
    if (!confirm("Удалить встречу?")) return;
    startTransition(async () => {
      await deleteMeeting(meeting.id);
      router.push("/vstrechi");
    });
  }

  const topBar = (
    <>
      <Link
        href="/vstrechi"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Встречи
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
      {/* Мета: дата, человек, место */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          disabled={pending}
          aria-label="Дата встречи"
          className="h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-text outline-none focus:border-accent"
        />
        <select
          value={personId}
          onChange={(e) => onPerson(e.target.value)}
          disabled={pending}
          aria-label="С кем"
          className="h-9 max-w-[190px] rounded-lg border border-border bg-surface px-2.5 text-[13px] text-text outline-none focus:border-accent"
        >
          <option value="">С кем встреча…</option>
          {personOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="flex h-9 min-w-[160px] flex-1 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-muted focus-within:border-accent">
          <MapPin size={14} className="shrink-0" />
          <input
            value={location}
            onChange={(e) => onLocation(e.target.value)}
            placeholder="Место (кафе, Zoom…)"
            className="h-full w-full bg-transparent text-[13px] text-text outline-none placeholder:text-faint"
          />
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="О чём встреча…"
        autoFocus={!title}
        className="mb-4 w-full bg-transparent text-[30px] font-semibold leading-tight tracking-tight text-text outline-none placeholder:text-faint/60"
      />

      <RichEditor
        initialHTML={meeting.body ?? ""}
        placeholder="Как прошло, о чём говорили, что решили, что дальше…"
        onChange={onBody}
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
      <div className="mb-4 flex items-center gap-2">{topBar}</div>
      {content}
    </div>
  );
}
