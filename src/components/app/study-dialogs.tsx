"use client";

import { useState, useTransition } from "react";
import { Trash2, Pin } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { AREA_PALETTE } from "@/lib/task-format";
import { WEEKDAYS, LESSON_KINDS_ORDER, LESSON_KIND_META } from "@/lib/study-format";
import {
  createSubject,
  updateSubject,
  deleteSubject,
  createLesson,
  updateLesson,
  deleteLesson,
  createNote,
  updateNote,
  deleteNote,
} from "@/lib/actions";
import type { LessonKind } from "@/db/schema";
import type { AreaOption, SubjectOption } from "./types";

export type SubjectForEdit = {
  id: string;
  name: string;
  teacher: string | null;
  color: string | null;
  icon: string | null;
  areaId: string | null;
  credits: number | null;
};
export type LessonForEdit = {
  id: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  kind: LessonKind;
  note: string | null;
};
export type NoteForEdit = {
  id: string;
  title: string;
  body: string | null;
  subjectId: string | null;
  pinned: boolean;
};

/* ── Предмет ── */

export function SubjectDialog({
  onClose,
  subject,
  areaOptions,
}: {
  onClose: () => void;
  subject?: SubjectForEdit | null;
  areaOptions: AreaOption[];
}) {
  const editing = !!subject;
  const [name, setName] = useState(subject?.name ?? "");
  const [teacher, setTeacher] = useState(subject?.teacher ?? "");
  const [color, setColor] = useState(subject?.color ?? AREA_PALETTE[0].value);
  const [icon, setIcon] = useState(subject?.icon ?? "");
  const [areaId, setAreaId] = useState(subject?.areaId ?? "");
  const [credits, setCredits] = useState(
    subject?.credits != null ? String(subject.credits) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const n = name.trim();
    if (!n) {
      setError("Введите название");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          name: n,
          teacher: teacher.trim() || null,
          color,
          icon: icon || null,
          areaId: areaId || null,
          credits: credits.trim() ? Number(credits) : null,
        };
        if (editing && subject) await updateSubject(subject.id, payload);
        else await createSubject(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!subject) return;
    if (!confirm("Удалить предмет? Занятия удалятся, домашка и конспекты останутся без предмета."))
      return;
    startTransition(async () => {
      await deleteSubject(subject.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Предмет" : "Новый предмет"}
      footer={
        <div className="flex w-full items-center justify-between">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 size={15} /> Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 2))}
            placeholder="📐"
            className="w-14 text-center text-lg"
            aria-label="Эмодзи"
          />
          <div className="flex-1">
            <Field error={error ?? undefined}>
              <Input
                autoFocus
                placeholder="Например, Матанализ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-[15px]"
              />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Преподаватель">
            <Input
              placeholder="Фамилия И. О."
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            />
          </Field>
          <Field label="Кредиты" hint="Зач. единицы — для GPA">
            <Input
              inputMode="numeric"
              placeholder="напр. 5"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Сфера">
          <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Без сферы</option>
            {areaOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Цвет">
          <div className="flex flex-wrap gap-2">
            {AREA_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => setColor(c.value)}
                className={cn(
                  "h-7 w-7 rounded-full transition-transform hover:scale-110",
                )}
                style={{
                  background: c.value,
                  boxShadow:
                    color === c.value ? `0 0 0 2px ${c.value}` : undefined,
                }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

/* ── Занятие ── */

export function LessonDialog({
  onClose,
  lesson,
  subjectOptions,
  defaultSubjectId,
  defaultDay,
}: {
  onClose: () => void;
  lesson?: LessonForEdit | null;
  subjectOptions: SubjectOption[];
  defaultSubjectId?: string | null;
  defaultDay?: number;
}) {
  const editing = !!lesson;
  const [subjectId, setSubjectId] = useState(
    lesson?.subjectId ?? defaultSubjectId ?? subjectOptions[0]?.id ?? "",
  );
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    lesson?.dayOfWeek ?? defaultDay ?? 1,
  );
  const [startTime, setStartTime] = useState(lesson?.startTime ?? "");
  const [endTime, setEndTime] = useState(lesson?.endTime ?? "");
  const [kind, setKind] = useState<LessonKind>(lesson?.kind ?? "lecture");
  const [location, setLocation] = useState(lesson?.location ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!subjectId) {
      setError("Выберите предмет");
      return;
    }
    startTransition(async () => {
      try {
        if (editing && lesson) {
          await updateLesson(lesson.id, {
            dayOfWeek,
            startTime: startTime || null,
            endTime: endTime || null,
            kind,
            location: location.trim() || null,
          });
        } else {
          await createLesson({
            subjectId,
            dayOfWeek,
            startTime: startTime || null,
            endTime: endTime || null,
            kind,
            location: location.trim() || null,
          });
        }
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!lesson) return;
    if (!confirm("Удалить занятие из расписания?")) return;
    startTransition(async () => {
      await deleteLesson(lesson.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Занятие" : "Новое занятие"}
      footer={
        <div className="flex w-full items-center justify-between">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 size={15} /> Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editing ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {!editing && (
          <Field label="Предмет" error={error ?? undefined}>
            <Select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="День недели">
            <Select
              value={String(dayOfWeek)}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
            >
              {WEEKDAYS.map((d) => (
                <option key={d.iso} value={d.iso}>
                  {d.full}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Тип">
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value as LessonKind)}
            >
              {LESSON_KINDS_ORDER.map((k) => (
                <option key={k} value={k}>
                  {LESSON_KIND_META[k].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Начало">
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field label="Конец">
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Аудитория / место">
          <Input
            placeholder="Напр. 312 или Zoom"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        {editing && error && <p className="text-[12px] text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

/* ── Конспект ── */

export function NoteDialog({
  onClose,
  note,
  subjectOptions,
  defaultSubjectId,
}: {
  onClose: () => void;
  note?: NoteForEdit | null;
  subjectOptions: SubjectOption[];
  defaultSubjectId?: string | null;
}) {
  const editing = !!note;
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [subjectId, setSubjectId] = useState(
    note?.subjectId ?? defaultSubjectId ?? "",
  );
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const t = title.trim();
    if (!t) {
      setError("Введите заголовок");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          title: t,
          body: body.trim() || null,
          subjectId: subjectId || null,
          pinned,
        };
        if (editing && note) await updateNote(note.id, payload);
        else await createNote(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!note) return;
    if (!confirm("Удалить конспект?")) return;
    startTransition(async () => {
      await deleteNote(note.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={editing ? "Конспект" : "Новый конспект"}
      footer={
        <div className="flex w-full items-center justify-between">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 size={15} /> Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field error={error ?? undefined}>
          <Input
            autoFocus
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 text-[15px]"
          />
        </Field>
        <Textarea
          placeholder="Текст конспекта…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[220px]"
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[180px] flex-1">
            <Field label="Предмет">
              <Select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Без предмета</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <button
            type="button"
            onClick={() => setPinned((p) => !p)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-xl border px-3 text-[13px] transition-colors",
              pinned
                ? "border-accent bg-accent-soft text-accent-soft-text"
                : "border-border text-muted hover:bg-surface-2",
            )}
          >
            <Pin size={15} className={pinned ? "fill-current" : ""} />
            {pinned ? "Закреплён" : "Закрепить"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
