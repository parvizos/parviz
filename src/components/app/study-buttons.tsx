"use client";

import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUi } from "./ui-context";
import type { SubjectForEdit } from "./study-dialogs";
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
