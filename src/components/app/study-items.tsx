"use client";

import Link from "next/link";
import { useState, useTransition, type MouseEvent } from "react";
import { Pin, MapPin, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleNotePin } from "@/lib/actions";
import { EntityAvatar } from "./EntityAvatar";
import { LESSON_KIND_META } from "@/lib/study-format";
import { areaColor } from "@/lib/task-format";
import { excerpt } from "@/lib/text";
import { coverStyle } from "@/lib/cover";
import { useUi } from "./ui-context";
import { NoteFromLessonButton } from "./study-buttons";
import type {
  LessonWithSubject,
  NoteWithSubject,
  SubjectWithCounts,
} from "@/lib/queries";

export function LessonRow({
  lesson,
  showSubject = true,
}: {
  lesson: LessonWithSubject;
  showSubject?: boolean;
}) {
  const { openEditLesson } = useUi();
  const kind = LESSON_KIND_META[lesson.kind];

  return (
    <div className="flex w-full items-center gap-1 rounded-xl border border-border bg-surface pr-2 transition-colors hover:border-border-strong hover:bg-surface-2">
      <button
        onClick={() =>
          openEditLesson({
            id: lesson.id,
            subjectId: lesson.subjectId,
            dayOfWeek: lesson.dayOfWeek,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            location: lesson.location,
            kind: lesson.kind,
            note: lesson.note,
          })
        }
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className="w-12 shrink-0 text-[12.5px] leading-tight tabular">
          <div className="font-semibold text-text">{lesson.startTime || "—"}</div>
          {lesson.endTime && <div className="text-faint">{lesson.endTime}</div>}
        </div>
        <EntityAvatar
          image={lesson.subjectImage}
          emoji={lesson.subjectIcon}
          color={lesson.subjectColor}
          name={lesson.subjectName}
          size={34}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] text-text">
            {showSubject ? lesson.subjectName : kind.label}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted">
            {showSubject && <span>{kind.label}</span>}
            {lesson.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin size={12} className="shrink-0" />
                {lesson.location}
              </span>
            )}
          </div>
        </div>
      </button>
      <NoteFromLessonButton subjectId={lesson.subjectId} />
    </div>
  );
}

export function NoteCard({ note }: { note: NoteWithSubject }) {
  const [pinned, setPinned] = useState(note.pinned);
  const [, startTransition] = useTransition();
  const snippet = excerpt(note.body, 200);

  function togglePin(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !pinned;
    setPinned(next);
    startTransition(async () => {
      try {
        await toggleNotePin(note.id, next);
      } catch {
        setPinned(!next);
      }
    });
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-border-strong hover:bg-surface-2">
      {note.cover && (
        <div className="h-20 w-full" style={coverStyle(note.cover)} />
      )}
      <Link href={`/konspekty/${note.id}`} className="flex min-w-0 gap-3 p-4">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[22px] leading-none",
            note.cover
              ? "-mt-9 bg-surface shadow-[var(--shadow-sm)] ring-4 ring-surface"
              : "bg-surface-2",
          )}
        >
          {note.icon || <FileText size={18} className="text-faint" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate pr-7 text-[15px] font-medium text-text">
            {note.title || "Без названия"}
          </h3>
          {snippet && (
            <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-muted">
              {snippet}
            </p>
          )}
          {note.subjectName && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: areaColor(note.subjectColor) }}
              />
              {note.subjectName}
            </div>
          )}
        </div>
      </Link>
      <button
        onClick={togglePin}
        aria-label={pinned ? "Открепить" : "Закрепить"}
        title={pinned ? "Открепить" : "Закрепить"}
        className={cn(
          "absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          pinned
            ? "text-accent"
            : "text-faint opacity-0 hover:bg-surface-2 group-hover:opacity-100",
          note.cover && "bg-black/25 text-white/90 opacity-100 backdrop-blur hover:bg-black/40 hover:text-white",
        )}
      >
        <Pin size={15} className={pinned ? "fill-current" : ""} />
      </button>
    </div>
  );
}

export function SubjectCard({ subject }: { subject: SubjectWithCounts }) {
  const parts = [
    `${subject.lessonCount} в расписании`,
    subject.homeworkOpen > 0 ? `${subject.homeworkOpen} домашки` : null,
    subject.noteCount > 0 ? `${subject.noteCount} конспектов` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/predmety/${subject.id}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <EntityAvatar
        image={subject.image}
        emoji={subject.icon}
        color={subject.color}
        name={subject.name}
        size={44}
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-medium text-text">
          {subject.name}
        </h3>
        <p className="mt-0.5 truncate text-[12.5px] text-muted">
          {subject.teacher ? subject.teacher + " · " : ""}
          {parts.join(" · ")}
        </p>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
