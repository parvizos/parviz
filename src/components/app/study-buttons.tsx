"use client";

import { Plus, Pencil, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useUi } from "./ui-context";
import type { SubjectForEdit, LessonForEdit } from "./study-dialogs";
import type { ReactNode } from "react";

export function NewSubjectButton({
  children = "Новый предмет",
}: {
  children?: ReactNode;
}) {
  const { openNewSubject } = useUi();
  return (
    <Button size="sm" onClick={openNewSubject}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function EditSubjectButton({ subject }: { subject: SubjectForEdit }) {
  const { openEditSubject } = useUi();
  return (
    <Button variant="secondary" size="sm" onClick={() => openEditSubject(subject)}>
      <Pencil size={15} />
      Изменить
    </Button>
  );
}

export function EditLessonButton({ lesson }: { lesson: LessonForEdit }) {
  const { openEditLesson } = useUi();
  return (
    <Button variant="secondary" size="sm" onClick={() => openEditLesson(lesson)}>
      <Pencil size={15} />
      Изменить
    </Button>
  );
}

export function NewLessonButton({
  subjectId,
  day,
  variant = "primary",
  children = "Занятие",
}: {
  subjectId?: string | null;
  day?: number;
  variant?: "primary" | "secondary" | "soft";
  children?: ReactNode;
}) {
  const { openNewLesson } = useUi();
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() => openNewLesson({ subjectId, day })}
    >
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function NewNoteButton({
  subjectId,
  children = "Новый конспект",
}: {
  subjectId?: string | null;
  children?: ReactNode;
}) {
  const { openNewNote } = useUi();
  return (
    <Button size="sm" onClick={() => openNewNote({ subjectId })}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

// Компактная кнопка «завести конспект по этой паре» — прямо в списке пар,
// чтобы на уроке за один тап открыть чистый лист, привязанный к предмету.
export function NoteFromLessonButton({
  subjectId,
  className,
}: {
  subjectId: string;
  className?: string;
}) {
  const { openNewNote } = useUi();
  return (
    <button
      type="button"
      onClick={() => openNewNote({ subjectId })}
      title="Конспект по этой паре"
      aria-label="Конспект по этой паре"
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text",
        className,
      )}
    >
      <NotebookPen size={15} />
      <span className="hidden md:inline">Конспект</span>
    </button>
  );
}
