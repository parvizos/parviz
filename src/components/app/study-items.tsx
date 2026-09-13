"use client";

import Link from "next/link";
import { useState, useTransition, type MouseEvent } from "react";
import { Pin, MapPin, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleNotePin } from "@/lib/actions";
import { LESSON_KIND_META } from "@/lib/study-format";
import { areaColor } from "@/lib/task-format";
import { useUi } from "./ui-context";
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
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <div className="w-12 shrink-0 text-[12.5px] leading-tight tabular">
        <div className="font-semibold text-text">{lesson.startTime || "—"}</div>
        {lesson.endTime && <div className="text-faint">{lesson.endTime}</div>}
      </div>
      <span
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ background: areaColor(lesson.subjectColor) }}
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
  );
}

export function NoteCard({ note }: { note: NoteWithSubject }) {
  const { openEditNote } = useUi();
  const [pinned, setPinned] = useState(note.pinned);
  const [, startTransition] = useTransition();

  function togglePin(e: MouseEvent) {
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
    <div className="group relative flex flex-col rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <button
        onClick={() =>
          openEditNote({
            id: note.id,
            title: note.title,
            body: note.body,
            subjectId: note.subjectId,
            pinned: note.pinned,
          })
        }
        className="min-w-0 text-left"
      >
        <h3 className="truncate pr-7 text-[15px] font-medium text-text">
          {note.title}
        </h3>
        {note.body && (
          <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
            {note.body}
          </p>
        )}
        {note.subjectName && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: areaColor(note.subjectColor) }}
            />
            {note.subjectName}
          </div>
        )}
      </button>
      <button
        onClick={togglePin}
        aria-label={pinned ? "Открепить" : "Закрепить"}
        title={pinned ? "Открепить" : "Закрепить"}
        className={cn(
          "absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          pinned
            ? "text-accent"
            : "text-faint opacity-0 hover:bg-surface-2 group-hover:opacity-100",
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
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[18px]"
        style={{
          background: `color-mix(in oklab, ${areaColor(subject.color)} 16%, transparent)`,
          color: areaColor(subject.color),
        }}
      >
        {subject.icon || subject.name.charAt(0).toUpperCase()}
      </div>
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
