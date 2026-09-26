"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Plus,
  Trash2,
  Check,
  Loader2,
  Maximize2,
  Minimize2,
  NotebookText,
  Image as ImageIcon,
  Star,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { stripHtml } from "@/lib/text";
import {
  updatePage,
  autosavePageBody,
  createPage,
  deletePage,
  togglePageFavorite,
} from "@/lib/actions";
import { RichEditor } from "./RichEditorLazy";
import { EmojiPicker } from "./EmojiPicker";
import { CoverPicker } from "./CoverPicker";
import { Backlinks } from "./Backlinks";
import { coverStyle } from "@/lib/cover";
import { useUi } from "./ui-context";
import type { PageTreeNode, Backlink } from "@/lib/queries";

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

type Crumb = { id: string; title: string; icon: string | null };

export function PageWorkspace({
  page,
  breadcrumbs,
  subpages,
  backlinks,
}: {
  page: {
    id: string;
    title: string;
    body: string | null;
    icon: string | null;
    cover: string | null;
    favorite: boolean;
    parentId: string | null;
  };
  breadcrumbs: Crumb[];
  subpages: PageTreeNode[];
  backlinks: Backlink[];
}) {
  const router = useRouter();
  const { focusMode, setFocusMode } = useUi();
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState<string | null>(page.icon);
  const [cover, setCover] = useState<string | null>(page.cover);
  const [favorite, setFavorite] = useState(page.favorite);
  const [words, setWords] = useState(() => countWords(stripHtml(page.body)));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, startTransition] = useTransition();

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creatingRef = useRef(false);

  // Покидая страницу — выходим из полноэкранного режима.
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
        await updatePage(page.id, { title: value });
        markSaved();
      } catch {
        setStatus("idle");
      }
    }, 600);
  }

  function onIcon(next: string | null) {
    setIcon(next);
    setStatus("saving");
    startTransition(async () => {
      try {
        await updatePage(page.id, { icon: next });
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
        await updatePage(page.id, { cover: next });
        markSaved();
      } catch {
        setStatus("idle");
      }
    });
  }

  function onFavorite() {
    const next = !favorite;
    setFavorite(next);
    startTransition(async () => {
      try {
        await togglePageFavorite(page.id, next);
      } catch {
        setFavorite(!next);
      }
    });
  }

  function onBody(html: string, text: string) {
    setWords(countWords(text));
    setStatus("saving");
    if (bodyTimer.current) clearTimeout(bodyTimer.current);
    bodyTimer.current = setTimeout(async () => {
      try {
        await autosavePageBody(page.id, html);
        markSaved();
      } catch {
        setStatus("idle");
      }
    }, 800);
  }

  function addSubpage() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    startTransition(async () => {
      try {
        const id = await createPage({ parentId: page.id });
        router.push(`/bloknot/${id}`);
      } finally {
        creatingRef.current = false;
      }
    });
  }

  function onDelete() {
    const kids = subpages.length;
    const msg = kids
      ? `Удалить страницу вместе с ${kids} вложенными?`
      : "Удалить страницу?";
    if (!confirm(msg)) return;
    startTransition(async () => {
      await deletePage(page.id);
      router.push(page.parentId ? `/bloknot/${page.parentId}` : "/bloknot");
    });
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

  // Хлебные крошки: корень «Блокнот» + предки (последний — текущая страница).
  const trail = breadcrumbs.slice(0, -1);
  const crumbs = (
    <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-[13px] text-muted">
      <Link
        href="/bloknot"
        className="flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <NotebookText size={14} />
        <span className="hidden sm:inline">Блокнот</span>
      </Link>
      {trail.map((c) => (
        <span key={c.id} className="flex min-w-0 items-center gap-1">
          <ChevronRight size={13} className="shrink-0 text-faint" />
          <Link
            href={`/bloknot/${c.id}`}
            className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-surface-2 hover:text-text"
          >
            {c.icon && <span className="shrink-0">{c.icon}</span>}
            <span className="truncate">{c.title || "Без названия"}</span>
          </Link>
        </span>
      ))}
    </nav>
  );

  const topBar = (
    <>
      {crumbs}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {statusEl}
        <button
          onClick={onFavorite}
          aria-label={favorite ? "Убрать из избранного" : "В избранное"}
          title={favorite ? "Убрать из избранного" : "В избранное"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            favorite
              ? "text-warning"
              : "text-faint hover:bg-surface-2 hover:text-text",
          )}
        >
          <Star size={16} className={favorite ? "fill-current" : ""} />
        </button>
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
          disabled={pending}
          aria-label="Удалить"
          title="Удалить"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-danger disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
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
      </div>
    </>
  );

  const editor = (
    <RichEditor
      initialHTML={page.body ?? ""}
      placeholder="Пиши что угодно, вставляй фото, жми «/» для команд…"
      onChange={onBody}
      minHeightClass="min-h-[30vh]"
    />
  );

  const subpagesSection = (
    <section className="mt-8 border-t border-border pt-5">
      <div className="mb-2.5 flex items-center gap-2 px-0.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Подстраницы
        </h2>
        {subpages.length > 0 && (
          <span className="text-[12px] text-faint">{subpages.length}</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {subpages.map((s) => (
          <Link
            key={s.id}
            href={`/bloknot/${s.id}`}
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 transition-colors hover:border-accent/40 hover:bg-surface-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[17px] leading-none">
              {s.icon || <FileText size={16} className="text-faint" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-text">
              {s.title || "Без названия"}
            </span>
            <ChevronRight
              size={16}
              className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
        <button
          onClick={addSubpage}
          disabled={pending}
          className="flex items-center gap-2.5 rounded-xl border border-dashed border-border px-3.5 py-3 text-[14px] text-faint transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text disabled:opacity-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">
            <Plus size={16} />
          </span>
          Добавить страницу
        </button>
      </div>
    </section>
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
            {subpagesSection}
            <Backlinks items={backlinks} />
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
      {subpagesSection}
      <Backlinks items={backlinks} />
    </div>
  );
}
