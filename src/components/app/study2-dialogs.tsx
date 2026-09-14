"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  GRADE_KINDS_ORDER,
  GRADE_KIND_META,
  EXAM_KINDS_ORDER,
  EXAM_KIND_META,
} from "@/lib/study-format";
import {
  createGrade,
  updateGrade,
  deleteGrade,
  createExam,
  updateExam,
  deleteExam,
} from "@/lib/study-actions";
import type { GradeKind, ExamKind } from "@/db/schema";
import { clientToday, type SubjectOption } from "./types";

/* ─────────────────────────────  Оценка  ───────────────────────────── */

export type GradeForEdit = {
  id: string;
  subjectId: string;
  value: number;
  maxValue: number;
  weight: number;
  kind: GradeKind;
  title: string | null;
  date: string;
  note: string | null;
};

export function GradeDialog({
  onClose,
  grade,
  defaultSubjectId,
  subjectOptions,
}: {
  onClose: () => void;
  grade?: GradeForEdit | null;
  defaultSubjectId?: string | null;
  subjectOptions: SubjectOption[];
}) {
  const editing = !!grade;
  const [subjectId, setSubjectId] = useState(
    grade?.subjectId ?? defaultSubjectId ?? subjectOptions[0]?.id ?? "",
  );
  const [value, setValue] = useState(grade ? String(grade.value) : "");
  const [maxValue, setMaxValue] = useState(String(grade?.maxValue ?? 5));
  const [weight, setWeight] = useState(String(grade?.weight ?? 1));
  const [kind, setKind] = useState<GradeKind>(grade?.kind ?? "other");
  const [title, setTitle] = useState(grade?.title ?? "");
  const [date, setDate] = useState(grade?.date ?? clientToday());
  const [note, setNote] = useState(grade?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const v = Number(value.replace(",", "."));
    const mx = Number(maxValue.replace(",", ".")) || 5;
    if (!value.trim() || !Number.isFinite(v) || v < 0) {
      setError("Введите оценку");
      return;
    }
    if (v > mx) {
      setError(`Оценка не может быть больше ${mx}`);
      return;
    }
    if (!subjectId) {
      setError("Выберите предмет");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          subjectId,
          value: v,
          maxValue: mx,
          weight: Number(weight.replace(",", ".")) || 1,
          kind,
          title: title.trim() || null,
          date,
          note: note.trim() || null,
        };
        if (editing && grade) await updateGrade(grade.id, payload);
        else await createGrade(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!grade) return;
    if (!confirm("Удалить оценку?")) return;
    startTransition(async () => {
      await deleteGrade(grade.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Оценка" : "Новая оценка"}
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
        <Field label="Предмет" error={error ?? undefined}>
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Field label="Оценка">
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="5"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-11 text-center text-[17px] tabular"
            />
          </Field>
          <span className="pb-2.5 text-[15px] text-faint">из</span>
          <Field label="Шкала">
            <Input
              inputMode="decimal"
              value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
              className="h-11 text-center text-[17px] tabular"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Тип">
            <Select value={kind} onChange={(e) => setKind(e.target.value as GradeKind)}>
              {GRADE_KINDS_ORDER.map((k) => (
                <option key={k} value={k}>
                  {GRADE_KIND_META[k].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Вес" hint="Экзамен весомее ДЗ">
            <Input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="За что" hint="Необязательно">
            <Input
              placeholder="Контрольная №2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Дата">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Заметка">
          <Input
            placeholder="Необязательно"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────  Экзамен  ───────────────────────────── */

export type ExamForEdit = {
  id: string;
  subjectId: string;
  kind: ExamKind;
  date: string;
  time: string | null;
  location: string | null;
  autopass: boolean;
  readiness: number;
  note: string | null;
};

export function ExamDialog({
  onClose,
  exam,
  defaultSubjectId,
  subjectOptions,
}: {
  onClose: () => void;
  exam?: ExamForEdit | null;
  defaultSubjectId?: string | null;
  subjectOptions: SubjectOption[];
}) {
  const editing = !!exam;
  const [subjectId, setSubjectId] = useState(
    exam?.subjectId ?? defaultSubjectId ?? subjectOptions[0]?.id ?? "",
  );
  const [kind, setKind] = useState<ExamKind>(exam?.kind ?? "exam");
  const [date, setDate] = useState(exam?.date ?? clientToday());
  const [time, setTime] = useState(exam?.time ?? "");
  const [location, setLocation] = useState(exam?.location ?? "");
  const [autopass, setAutopass] = useState(exam?.autopass ?? false);
  const [readiness, setReadiness] = useState(exam?.readiness ?? 0);
  const [note, setNote] = useState(exam?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!subjectId) {
      setError("Выберите предмет");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          subjectId,
          kind,
          date,
          time: time || null,
          location: location.trim() || null,
          autopass,
          readiness,
          note: note.trim() || null,
        };
        if (editing && exam) await updateExam(exam.id, payload);
        else await createExam(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!exam) return;
    if (!confirm("Удалить из сессии?")) return;
    startTransition(async () => {
      await deleteExam(exam.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Экзамен" : "В сессию"}
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
        <Field label="Предмет" error={error ?? undefined}>
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Тип">
            <Select value={kind} onChange={(e) => setKind(e.target.value as ExamKind)}>
              {EXAM_KINDS_ORDER.map((k) => (
                <option key={k} value={k}>
                  {EXAM_KIND_META[k].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Дата">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Время" hint="Необязательно">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Аудитория" hint="Необязательно">
            <Input
              placeholder="напр. 401"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
        </div>

        <Field label={`Готовность: ${readiness}%`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={readiness}
            onChange={(e) => setReadiness(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-[var(--accent)]"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={autopass}
            onChange={(e) => setAutopass(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-[13.5px] text-text">Автомат получен</span>
        </label>

        <Field label="Заметка">
          <Input
            placeholder="Что повторить, темы…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
