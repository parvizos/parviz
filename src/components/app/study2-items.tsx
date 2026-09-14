"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  Plus,
  Check,
  RotateCcw,
  Clock,
  MapPin,
  Zap,
  CalendarClock,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { ruMonthDayShort } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import {
  GRADE_KIND_META,
  EXAM_KIND_META,
  ATTENDANCE_META,
  gradeTone,
} from "@/lib/study-format";
import { setAttendance, clearAttendanceSlot, setExamDone } from "@/lib/study-actions";
import { useUi } from "./ui-context";
import { clientToday } from "./types";
import type {
  GradeRow as GradeRowT,
  ExamRow,
  SubjectAverage,
  AttendanceStatus,
} from "@/lib/study-queries";

/* ─────────────────────────────  Кнопки  ───────────────────────────── */

export function NewGradeButton({
  subjectId,
  variant = "primary",
  children = "Оценка",
}: {
  subjectId?: string | null;
  variant?: "primary" | "secondary" | "soft";
  children?: ReactNode;
}) {
  const { openNewGrade } = useUi();
  return (
    <Button size="sm" variant={variant} onClick={() => openNewGrade(subjectId)}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function NewExamButton({
  subjectId,
  variant = "primary",
  children = "В сессию",
}: {
  subjectId?: string | null;
  variant?: "primary" | "secondary" | "soft";
  children?: ReactNode;
}) {
  const { openNewExam } = useUi();
  return (
    <Button size="sm" variant={variant} onClick={() => openNewExam(subjectId)}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

/* ─────────────────────────────  Оценки  ───────────────────────────── */

export function GradeRow({
  grade,
  showSubject = true,
}: {
  grade: GradeRowT;
  showSubject?: boolean;
}) {
  const { openEditGrade } = useUi();
  const ratio = grade.maxValue > 0 ? grade.value / grade.maxValue : 0;
  const tone = gradeTone(ratio);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <button
      onClick={() =>
        openEditGrade({
          id: grade.id,
          subjectId: grade.subjectId,
          value: grade.value,
          maxValue: grade.maxValue,
          weight: grade.weight,
          kind: grade.kind,
          title: grade.title,
          date: grade.date,
          note: grade.note,
        })
      }
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[16px] font-semibold tabular"
        style={{
          background: `color-mix(in oklab, ${tone} 18%, transparent)`,
          color: tone,
        }}
      >
        {fmt(grade.value)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] text-text">
          {grade.title || GRADE_KIND_META[grade.kind].label}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
          {showSubject && (
            <span className="truncate">
              {grade.subjectIcon ? `${grade.subjectIcon} ` : ""}
              {grade.subjectName}
            </span>
          )}
          <span>{GRADE_KIND_META[grade.kind].label}</span>
          <span className="text-faint">{ruMonthDayShort(grade.date)}</span>
        </div>
      </div>
      <div className="shrink-0 text-right text-[12px] text-faint tabular">
        из {fmt(grade.maxValue)}
        {grade.weight !== 1 && (
          <span className="block text-[11px]">вес ×{fmt(grade.weight)}</span>
        )}
      </div>
    </button>
  );
}

export function SubjectAverageCard({
  avg,
  attendance,
}: {
  avg: SubjectAverage;
  attendance?: { pct: number; absent: number } | null;
}) {
  const color = areaColor(avg.color);
  const hasGrades = avg.count > 0;
  const tone = avg.avgPct >= 0.85 ? "var(--success)" : avg.avgPct >= 0.65 ? "var(--warning)" : "var(--danger)";
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <Link
      href={`/predmety/${avg.subjectId}`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[17px]"
          style={{
            background: `color-mix(in oklab, ${color} 16%, transparent)`,
            color,
          }}
        >
          {avg.icon || avg.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-medium text-text">
            {avg.name}
          </div>
          <div className="text-[12px] text-muted">
            {avg.credits != null ? `${avg.credits} кр. · ` : ""}
            {hasGrades ? `${avg.count} оц.` : "нет оценок"}
          </div>
        </div>
        {hasGrades && (
          <div className="shrink-0 text-right">
            {avg.avgOnScale != null ? (
              <div className="text-[19px] font-semibold tabular" style={{ color: tone }}>
                {avg.avgOnScale.toFixed(2)}
                <span className="text-[12px] font-normal text-faint">
                  {" "}
                  /{fmt(avg.commonMax as number)}
                </span>
              </div>
            ) : (
              <div className="text-[19px] font-semibold tabular" style={{ color: tone }}>
                {Math.round(avg.avgPct * 100)}%
              </div>
            )}
          </div>
        )}
      </div>

      {(avg.need || attendance) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2.5 text-[12px]">
          {avg.need && (
            <span className="text-muted">
              до {fmt(avg.need.target)}: нужно{" "}
              <span className="font-medium text-text">
                {fmt(Math.ceil(avg.need.need * 10) / 10)}
              </span>{" "}
              на след.
            </span>
          )}
          {attendance && attendance.pct < 1 && (
            <span
              className={cn(
                "ml-auto",
                attendance.pct < 0.75 ? "text-danger" : "text-muted",
              )}
            >
              посещаемость {Math.round(attendance.pct * 100)}%
              {attendance.absent > 0 ? ` · пропусков ${attendance.absent}` : ""}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

/* ─────────────────────────────  Экзамены  ───────────────────────────── */

function ExamDoneDialog({
  onClose,
  examId,
  autopass,
}: {
  onClose: () => void;
  examId: string;
  autopass: boolean;
}) {
  const [grade, setGrade] = useState("");
  const [auto, setAuto] = useState(autopass);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await setExamDone(examId, {
        done: true,
        grade: grade.trim() ? Number(grade.replace(",", ".")) : null,
        autopass: auto,
      });
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Сдал"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            Готово
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Оценка" hint="Необязательно">
          <Input
            autoFocus
            inputMode="decimal"
            placeholder="напр. 5"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="h-11 text-[16px] tabular"
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-[13.5px] text-text">Был автомат</span>
        </label>
      </div>
    </Modal>
  );
}

export function ExamCard({ exam }: { exam: ExamRow }) {
  const { openEditExam } = useUi();
  const [doneOpen, setDoneOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const color = areaColor(exam.subjectColor);
  const meta = EXAM_KIND_META[exam.kind];

  const countdown =
    exam.daysLeft == null
      ? null
      : exam.daysLeft < 0
        ? { text: "прошёл", tone: "var(--danger)" }
        : exam.daysLeft === 0
          ? { text: "сегодня", tone: "var(--danger)" }
          : exam.daysLeft === 1
            ? { text: "завтра", tone: "var(--warning)" }
            : {
                text: `через ${exam.daysLeft} дн.`,
                tone: exam.daysLeft <= 3 ? "var(--warning)" : "var(--muted)",
              };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-surface p-4",
        exam.done ? "border-border opacity-80" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() =>
            openEditExam({
              id: exam.id,
              subjectId: exam.subjectId,
              kind: exam.kind,
              date: exam.date,
              time: exam.time,
              location: exam.location,
              autopass: exam.autopass,
              readiness: exam.readiness,
              note: exam.note,
            })
          }
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[16px]"
            style={{
              background: `color-mix(in oklab, ${color} 16%, transparent)`,
              color,
            }}
          >
            {exam.subjectIcon || meta.short.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[14.5px] font-medium text-text">
                {exam.subjectName}
              </span>
              {exam.autopass && <Zap size={13} className="shrink-0 text-accent" />}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px] text-muted">
              <span>{meta.label}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={12} />
                {ruMonthDayShort(exam.date)}
              </span>
              {exam.time && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} />
                  {exam.time}
                </span>
              )}
              {exam.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} />
                  {exam.location}
                </span>
              )}
            </div>
          </div>
        </button>
        <div className="shrink-0 text-right">
          {exam.done ? (
            <div className="text-[15px] font-semibold tabular text-success">
              {exam.grade != null
                ? Number.isInteger(exam.grade)
                  ? exam.grade
                  : exam.grade.toFixed(1)
                : "✓"}
            </div>
          ) : (
            countdown && (
              <div
                className="text-[13px] font-medium tabular"
                style={{ color: countdown.tone }}
              >
                {countdown.text}
              </div>
            )
          )}
        </div>
      </div>

      {!exam.done && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${exam.readiness}%`,
              background: exam.readiness >= 70 ? "var(--success)" : "var(--accent)",
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        {!exam.done && (
          <span className="text-[12px] text-faint">
            готовность {exam.readiness}%
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {exam.done ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setExamDone(exam.id, { done: false });
                })
              }
            >
              <RotateCcw size={15} /> Вернуть
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setDoneOpen(true)}>
              <Check size={15} /> Сдал
            </Button>
          )}
        </div>
      </div>

      {doneOpen && (
        <ExamDoneDialog
          onClose={() => setDoneOpen(false)}
          examId={exam.id}
          autopass={exam.autopass}
        />
      )}
    </div>
  );
}

/* ───────────────────────────  Посещаемость  ─────────────────────────── */

const TONE_VAR: Record<string, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  muted: "var(--muted)",
};

export function AttendanceControls({
  subjectId,
  lessonId,
  date = clientToday(),
  current,
}: {
  subjectId: string;
  lessonId: string;
  date?: string;
  current?: AttendanceStatus | null;
}) {
  const [status, setStatus] = useState<AttendanceStatus | null>(current ?? null);
  const [pending, startTransition] = useTransition();

  function pick(s: AttendanceStatus) {
    const next = status === s ? null : s;
    setStatus(next);
    startTransition(async () => {
      try {
        if (next === null) await clearAttendanceSlot(lessonId, date);
        else await setAttendance({ subjectId, lessonId, date, status: next });
      } catch {
        setStatus(current ?? null);
      }
    });
  }

  return (
    <div className="flex items-center gap-1" aria-busy={pending}>
      {(["present", "late", "absent"] as AttendanceStatus[]).map((s) => {
        const active = status === s;
        const tone = TONE_VAR[ATTENDANCE_META[s].tone];
        return (
          <button
            key={s}
            type="button"
            onClick={() => pick(s)}
            title={ATTENDANCE_META[s].label}
            className={cn(
              "h-7 rounded-lg px-2.5 text-[12px] font-medium transition-colors",
              active ? "text-white" : "text-muted hover:bg-surface-2",
            )}
            style={active ? { background: tone } : undefined}
          >
            {ATTENDANCE_META[s].short}
          </button>
        );
      })}
    </div>
  );
}
