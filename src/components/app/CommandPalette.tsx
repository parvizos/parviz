"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Sun,
  CalendarDays,
  Inbox,
  CalendarClock,
  FolderKanban,
  Layers,
  Folder,
  CalendarRange,
  GraduationCap,
  NotebookPen,
  BookText,
  Wallet,
  Receipt,
  Users,
  Building2,
  Handshake,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { AreaOption, ProjectOption, SubjectOption } from "./types";

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
};

export function CommandPalette({
  open,
  onClose,
  areas,
  projects,
  subjects,
  onNewTask,
  onNewProject,
  onNewArea,
  onNewSubject,
  onNewNote,
  onNewMeeting,
  onNewTransaction,
  onNewPerson,
  onToggleTheme,
}: {
  open: boolean;
  onClose: () => void;
  areas: AreaOption[];
  projects: ProjectOption[];
  subjects: SubjectOption[];
  onNewTask: () => void;
  onNewProject: () => void;
  onNewArea: () => void;
  onNewSubject: () => void;
  onNewNote: () => void;
  onNewMeeting: () => void;
  onNewTransaction: () => void;
  onNewPerson: () => void;
  onToggleTheme: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      onClose();
    };
    const act = (fn: () => void) => () => {
      onClose();
      fn();
    };
    return [
      { id: "new-task", label: "Новая задача", hint: "N", icon: <Plus size={16} />, run: act(onNewTask) },
      { id: "new-project", label: "Новый проект", icon: <Plus size={16} />, run: act(onNewProject) },
      { id: "new-area", label: "Новая сфера", icon: <Plus size={16} />, run: act(onNewArea) },
      { id: "new-subject", label: "Новый предмет", icon: <Plus size={16} />, run: act(onNewSubject) },
      { id: "new-note", label: "Новый конспект", icon: <Plus size={16} />, run: act(onNewNote) },
      { id: "new-tx", label: "Новая операция", icon: <Plus size={16} />, run: act(onNewTransaction) },
      { id: "new-person", label: "Новый человек", icon: <Plus size={16} />, run: act(onNewPerson) },
      { id: "new-meeting", label: "Новая встреча", icon: <Plus size={16} />, run: act(onNewMeeting) },
      { id: "nav-today", label: "Сегодня", icon: <CalendarDays size={16} />, run: go("/segodnya") },
      { id: "nav-inbox", label: "Входящие", icon: <Inbox size={16} />, run: go("/vhodyaschie") },
      { id: "nav-upcoming", label: "Предстоящее", icon: <CalendarClock size={16} />, run: go("/predstoyaschee") },
      { id: "nav-dnevnik", label: "Ежедневник", icon: <NotebookPen size={16} />, run: go("/dnevnik") },
      { id: "nav-projects", label: "Проекты", icon: <FolderKanban size={16} />, run: go("/proekty") },
      { id: "nav-areas", label: "Сферы", icon: <Layers size={16} />, run: go("/sfery") },
      { id: "nav-schedule", label: "Расписание", icon: <CalendarRange size={16} />, run: go("/raspisanie") },
      { id: "nav-subjects", label: "Предметы", icon: <GraduationCap size={16} />, run: go("/predmety") },
      { id: "nav-notes", label: "Конспекты", icon: <BookText size={16} />, run: go("/konspekty") },
      { id: "nav-finansy", label: "Финансы", icon: <Wallet size={16} />, run: go("/finansy") },
      { id: "nav-operacii", label: "Операции", icon: <Receipt size={16} />, run: go("/finansy/operacii") },
      { id: "nav-lyudi", label: "Люди", icon: <Users size={16} />, run: go("/lyudi") },
      { id: "nav-organizacii", label: "Организации", icon: <Building2 size={16} />, run: go("/organizacii") },
      { id: "nav-vstrechi", label: "Встречи", icon: <Handshake size={16} />, run: go("/vstrechi") },
      { id: "theme", label: "Переключить тему", icon: <Sun size={16} />, run: act(onToggleTheme) },
      ...projects.map((p) => ({
        id: `p-${p.id}`,
        label: p.name,
        hint: "проект",
        icon: <Folder size={16} />,
        run: go(`/proekty/${p.id}`),
      })),
      ...subjects.map((s) => ({
        id: `s-${s.id}`,
        label: s.name,
        hint: "предмет",
        icon: <GraduationCap size={16} />,
        run: go(`/predmety/${s.id}`),
      })),
      ...areas.map((a) => ({
        id: `a-${a.id}`,
        label: a.name,
        hint: "сфера",
        icon: (
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: a.color ?? "var(--faint)" }}
          />
        ),
        run: go(`/sfery/${a.id}`),
      })),
    ];
  }, [router, onClose, onNewTask, onNewProject, onNewArea, onNewSubject, onNewNote, onNewMeeting, onNewTransaction, onNewPerson, onToggleTheme, projects, subjects, areas]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, commands]);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[active]?.run();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 animate-overlay-in bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 mt-[10vh] h-fit w-full max-w-xl animate-panel-in overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search size={17} className="text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Поиск и команды…"
            className="h-12 w-full bg-transparent text-[15px] text-text outline-none placeholder:text-faint"
          />
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">
              Ничего не найдено
            </p>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.id}
                data-idx={i}
                onMouseMove={() => setActive(i)}
                onClick={c.run}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  i === active ? "bg-surface-2 text-text" : "text-muted",
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center text-faint">
                  {c.icon}
                </span>
                <span className="flex-1 truncate text-text">{c.label}</span>
                {c.hint && (
                  <span className="text-[12px] text-faint">{c.hint}</span>
                )}
                {i === active && (
                  <CornerDownLeft size={14} className="text-faint" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
