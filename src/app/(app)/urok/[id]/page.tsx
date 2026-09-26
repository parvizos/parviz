import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, GraduationCap } from "lucide-react";
import { getLesson } from "@/lib/queries";
import { weekdayFull, LESSON_KIND_META } from "@/lib/study-format";
import { EntityAvatar } from "@/components/app/EntityAvatar";
import { BackLink } from "@/components/app/BackLink";
import { EditLessonButton } from "@/components/app/study-buttons";
import { EntityNotes } from "@/components/app/EntityNotes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const l = await getLesson(id);
  return { title: l ? `${l.subjectName} — занятие` : "Занятие" };
}

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getLesson(id);
  if (!lesson) notFound();

  const kind = LESSON_KIND_META[lesson.kind];
  const time =
    lesson.startTime && lesson.endTime
      ? `${lesson.startTime}–${lesson.endTime}`
      : lesson.startTime || null;

  return (
    <div>
      <BackLink label="Назад" />

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <EntityAvatar
            image={lesson.subjectImage}
            emoji={lesson.subjectIcon}
            color={lesson.subjectColor}
            name={lesson.subjectName}
            size={52}
          />
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-text">
              {lesson.subjectName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[13px] text-muted">
              <Link
                href={`/predmety/${lesson.subjectId}`}
                className="inline-flex items-center gap-1 transition-colors hover:text-text"
              >
                <GraduationCap size={13} />
                {kind.label}
              </Link>
              <span>{weekdayFull(lesson.dayOfWeek)}</span>
              {time && <span className="tabular">{time}</span>}
              {lesson.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} />
                  {lesson.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <EditLessonButton
          lesson={{
            id: lesson.id,
            subjectId: lesson.subjectId,
            dayOfWeek: lesson.dayOfWeek,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            location: lesson.location,
            kind: lesson.kind,
            note: lesson.note,
          }}
        />
      </div>

      {lesson.note && (
        <p className="mb-6 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-[14px] leading-relaxed text-muted">
          {lesson.note}
        </p>
      )}

      {/* Заметки к занятию — свободный текст с фото */}
      <EntityNotes
        kind="lesson"
        id={id}
        initialHTML={lesson.body ?? ""}
        title="Заметки к занятию"
        placeholder="Всё по этой паре: что нужно приносить, особенности, фото доски/слайдов… Жми «/» или перетащи фото."
      />
    </div>
  );
}
