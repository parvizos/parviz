"use client";

import { useState, useTransition } from "react";
import { Trash2, Flag } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import {
  PRIORITY_OPTIONS,
  PRIORITY_META,
  PROJECT_STATUS_META,
  AREA_PALETTE,
} from "@/lib/task-format";
import {
  createTask,
  updateTask,
  deleteTask,
  createProject,
  updateProject,
  deleteProject,
  createArea,
  updateArea,
  deleteArea,
} from "@/lib/actions";
import type { TaskPriority, ProjectStatus } from "@/db/schema";
import type { TaskWithContext } from "@/lib/queries";
import {
  clientToday,
  clientAddDays,
  type AreaOption,
  type ProjectOption,
  type SubjectOption,
  type TaskPrefill,
} from "./types";

/*
 * Диалоги монтируются заново на каждое открытие (см. ui-context),
 * поэтому локальное состояние инициализируется прямо из пропсов —
 * без эффектов-сбросов.
 */

function PrioritySelect({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (v: TaskPriority) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {PRIORITY_OPTIONS.map((p) => {
        const meta = PRIORITY_META[p];
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-[13px] font-medium transition-colors",
              active
                ? "border-transparent bg-surface-3 text-text"
                : "border-border text-muted hover:bg-surface-2",
            )}
            style={active && meta.color ? { color: meta.color } : undefined}
          >
            {p === 0 ? "—" : <Flag size={13} style={{ color: meta.color ?? undefined }} />}
            {p !== 0 && p}
          </button>
        );
      })}
    </div>
  );
}

function DateQuickPick({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const today = clientToday();
  const chips: { label: string; date: string }[] = [
    { label: "Сегодня", date: today },
    { label: "Завтра", date: clientAddDays(today, 1) },
    { label: "+3 дня", date: clientAddDays(today, 3) },
    { label: "Неделя", date: clientAddDays(today, 7) },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onChange(c.date)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[12.5px] transition-colors",
              value === c.date
                ? "border-accent bg-accent-soft text-accent-soft-text"
                : "border-border text-muted hover:bg-surface-2",
            )}
          >
            {c.label}
          </button>
        ))}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg border border-border px-2.5 py-1 text-[12.5px] text-muted hover:bg-surface-2"
          >
            Очистить
          </button>
        )}
      </div>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[200px]"
      />
    </div>
  );
}

/* ── Задача ── */

export function TaskDialog({
  onClose,
  task,
  prefill,
  areaOptions,
  projectOptions,
  subjectOptions,
}: {
  onClose: () => void;
  task?: TaskWithContext | null;
  prefill?: TaskPrefill;
  areaOptions: AreaOption[];
  projectOptions: ProjectOption[];
  subjectOptions: SubjectOption[];
}) {
  const editing = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [date, setDate] = useState(
    task?.scheduledDate ?? prefill?.scheduledDate ?? "",
  );
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 0);
  const [projectId, setProjectId] = useState(
    task?.projectId ?? prefill?.projectId ?? "",
  );
  const [areaId, setAreaId] = useState(task?.areaId ?? prefill?.areaId ?? "");
  const [subjectId, setSubjectId] = useState(
    task?.subjectId ?? prefill?.subjectId ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function chooseProject(id: string) {
    setProjectId(id);
    const p = projectOptions.find((x) => x.id === id);
    if (id && p?.areaId) setAreaId(p.areaId);
  }

  function submit() {
    const t = title.trim();
    if (!t) {
      setError("Введите название");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          title: t,
          notes: notes.trim() || null,
          scheduledDate: date || null,
          priority,
          projectId: projectId || null,
          areaId: areaId || null,
          subjectId: subjectId || null,
        };
        if (editing && task) await updateTask(task.id, payload);
        else await createTask(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!task) return;
    if (!confirm("Удалить задачу? Это действие необратимо.")) return;
    startTransition(async () => {
      await deleteTask(task.id);
      onClose();
    });
  }

  const areaInherited = !!projectId;

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Задача" : "Новая задача"}
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
        <Field error={error ?? undefined}>
          <Input
            autoFocus
            placeholder="Что нужно сделать?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="h-11 text-[15px]"
          />
        </Field>

        <Field label="Заметки">
          <Textarea
            placeholder="Детали, ссылки, подзадачи…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <Field label="Приоритет">
          <PrioritySelect value={priority} onChange={setPriority} />
        </Field>

        <Field label="Дата">
          <DateQuickPick value={date} onChange={setDate} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Проект">
            <Select
              value={projectId}
              onChange={(e) => chooseProject(e.target.value)}
            >
              <option value="">Без проекта</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Сфера"
            hint={areaInherited ? "Наследуется из проекта" : undefined}
          >
            <Select
              value={areaId}
              disabled={areaInherited}
              onChange={(e) => setAreaId(e.target.value)}
              className={cn(areaInherited && "opacity-60")}
            >
              <option value="">Без сферы</option>
              {areaOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {subjectOptions.length > 0 && (
          <Field label="Предмет" hint="Задача станет домашкой по предмету">
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
        )}
      </div>
    </Modal>
  );
}

/* ── Проект ── */

export function ProjectDialog({
  onClose,
  project,
  areaOptions,
  defaultAreaId,
}: {
  onClose: () => void;
  project?: {
    id: string;
    name: string;
    notes: string | null;
    areaId: string | null;
    dueDate: string | null;
    status: ProjectStatus;
  } | null;
  areaOptions: AreaOption[];
  defaultAreaId?: string | null;
}) {
  const editing = !!project;
  const [name, setName] = useState(project?.name ?? "");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [areaId, setAreaId] = useState(project?.areaId ?? defaultAreaId ?? "");
  const [dueDate, setDueDate] = useState(project?.dueDate ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? "active",
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
        if (editing && project) {
          await updateProject(project.id, {
            name: n,
            notes: notes.trim() || null,
            areaId: areaId || null,
            dueDate: dueDate || null,
            status,
          });
        } else {
          await createProject({
            name: n,
            notes: notes.trim() || null,
            areaId: areaId || null,
            dueDate: dueDate || null,
          });
        }
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!project) return;
    if (!confirm("Удалить проект? Задачи останутся, но потеряют привязку."))
      return;
    startTransition(async () => {
      await deleteProject(project.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Проект" : "Новый проект"}
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
            placeholder="Название проекта"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 text-[15px]"
          />
        </Field>
        <Field label="Описание">
          <Textarea
            placeholder="Цель, результат, заметки…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Field label="Дедлайн">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>
        {editing && (
          <Field label="Статус">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              {(Object.keys(PROJECT_STATUS_META) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ── Сфера ── */

export function AreaDialog({
  onClose,
  area,
}: {
  onClose: () => void;
  area?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
}) {
  const editing = !!area;
  const [name, setName] = useState(area?.name ?? "");
  const [color, setColor] = useState(area?.color ?? AREA_PALETTE[0].value);
  const [icon, setIcon] = useState(area?.icon ?? "");
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
        if (editing && area) {
          await updateArea(area.id, { name: n, color, icon: icon || null });
        } else {
          await createArea({ name: n, color, icon: icon || null });
        }
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!area) return;
    if (!confirm("Удалить сферу? Проекты и задачи останутся без сферы."))
      return;
    startTransition(async () => {
      await deleteArea(area.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Сфера" : "Новая сфера"}
      size="sm"
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
            placeholder="🎓"
            className="w-14 text-center text-lg"
            aria-label="Эмодзи"
          />
          <div className="flex-1">
            <Field error={error ?? undefined}>
              <Input
                autoFocus
                placeholder="Например, Учёба"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-[15px]"
              />
            </Field>
          </div>
        </div>
        <Field label="Цвет">
          <div className="flex flex-wrap gap-2">
            {AREA_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => setColor(c.value)}
                className={cn(
                  "h-7 w-7 rounded-full transition-transform",
                  color === c.value
                    ? "ring-2 ring-offset-2 ring-offset-surface"
                    : "hover:scale-110",
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
