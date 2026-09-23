"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarRange,
  ChevronDown,
  Check,
  Plus,
  Pencil,
  Trash2,
  Settings2,
  CircleCheckBig,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { areaColor } from "@/lib/task-format";
import { useToast } from "./toast";
import {
  createTerm,
  renameTerm,
  setActiveTerm,
  deleteTerm,
} from "@/lib/term-actions";
import type { TermRow, TermSwitcherItem } from "@/lib/term-queries";

/* ───────────────────────────  Переключатель  ─────────────────────────── */

/**
 * Компактный переключатель активного семестра для шапок учебных страниц.
 * Показывается только когда семестров больше одного — иначе не мешается.
 */
export function TermSwitcher({
  terms,
}: {
  terms: TermSwitcherItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (terms.length < 2) return null;

  const active = terms.find((t) => t.active) ?? terms[terms.length - 1];

  function choose(id: string) {
    if (id === active.id) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        await setActiveTerm(id);
        router.refresh();
      } catch {}
      setOpen(false);
    });
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Сменить семестр"
        className={cn(
          "inline-flex h-8 max-w-[220px] items-center gap-2 rounded-[10px] border border-border bg-surface px-3 text-[13px] font-medium text-text transition-colors hover:bg-surface-2 hover:border-border-strong disabled:opacity-60",
        )}
      >
        <CalendarRange size={15} className="shrink-0 text-muted" />
        <span className="truncate">{active.name}</span>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-faint transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-1.5 w-64 animate-panel-in overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-lg)]"
        >
          <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Семестр
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {terms.map((t) => {
              const isActive = t.id === active.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => choose(t.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors",
                      isActive
                        ? "bg-accent-soft font-medium text-accent-soft-text"
                        : "text-text hover:bg-surface-2",
                    )}
                  >
                    <span className="flex-1 truncate">{t.name}</span>
                    {isActive && <Check size={15} className="shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-border pt-1">
            <Link
              href="/semestry"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Settings2 size={15} className="shrink-0" />
              Управление семестрами
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────  Страница  ─────────────────────────────── */

function gpaTone(g: number | null): string {
  if (g == null) return "text-faint";
  if (g >= 4.5) return "text-success";
  if (g >= 3.5) return "text-text";
  if (g >= 2.5) return "text-warning";
  return "text-danger";
}

export function TermsView({ terms }: { terms: TermRow[] }) {
  const [dialog, setDialog] = useState<
    | { mode: "create" }
    | { mode: "rename"; id: string; name: string }
    | null
  >(null);

  return (
    <div>
      <PageHeader
        title="Семестры"
        subtitle="Активный семестр — то, что видно в предметах, расписании, оценках и сессии. Прошлые остаются с оценками и историей."
        actions={
          <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
            <Plus size={16} />
            Новый семестр
          </Button>
        }
      />

      {terms.length > 0 ? (
        <div className="flex flex-col gap-3">
          {terms.map((t) => (
            <TermCard
              key={t.id}
              term={t}
              onRename={() =>
                setDialog({ mode: "rename", id: t.id, name: t.name })
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarRange size={22} />}
          title="Пока нет семестров"
          description="Заведи первый семестр — к нему привяжутся предметы, а со следующего курса просто создашь новый и переключишься."
          action={
            <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
              <Plus size={16} />
              Новый семестр
            </Button>
          }
        />
      )}

      {dialog && (
        <TermDialog
          mode={dialog.mode}
          termId={dialog.mode === "rename" ? dialog.id : undefined}
          initialName={dialog.mode === "rename" ? dialog.name : ""}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function TermCard({
  term,
  onRename,
}: {
  term: TermRow;
  onRename: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function activate() {
    if (term.active) return;
    startTransition(async () => {
      try {
        await setActiveTerm(term.id);
        router.refresh();
      } catch {
        toast({ title: "Не удалось переключить семестр" });
      }
    });
  }

  function remove() {
    if (term.subjectCount > 0) {
      toast({
        title: "В семестре есть предметы",
        body: "Сначала перенеси или удали предметы этого семестра.",
      });
      return;
    }
    if (!confirm(`Удалить семестр «${term.name}»?`)) return;
    startTransition(async () => {
      try {
        await deleteTerm(term.id);
        router.refresh();
      } catch (e) {
        toast({
          title: "Не удалось удалить",
          body: e instanceof Error ? e.message : undefined,
        });
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface p-5 transition-colors",
        term.active ? "border-accent shadow-[var(--shadow-sm)]" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[16px] font-semibold text-text">{term.name}</h2>
            {term.active && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-soft-text">
                <CircleCheckBig size={12} />
                Активный
              </span>
            )}
          </div>
          <div className="mt-1 text-[13px] text-muted">
            {term.subjectCount > 0
              ? `${term.subjectCount} ${plural(term.subjectCount, "предмет", "предмета", "предметов")}`
              : "Нет предметов"}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={cn(
              "text-[24px] font-semibold leading-none tabular",
              gpaTone(term.gpa5),
            )}
          >
            {term.gpa5 != null ? term.gpa5.toFixed(2) : "—"}
          </div>
          <div className="mt-1 text-[11px] text-faint">средний балл</div>
        </div>
      </div>

      {term.subjects.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {term.subjects.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[12.5px] text-text"
            >
              {s.icon ? (
                <span className="text-[13px] leading-none">{s.icon}</span>
              ) : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: areaColor(s.color) }}
                />
              )}
              <span className="max-w-[160px] truncate">{s.name}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-1">
        {!term.active && (
          <Button
            variant="soft"
            size="sm"
            onClick={activate}
            disabled={pending}
          >
            <CircleCheckBig size={15} />
            Сделать активным
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onRename} disabled={pending}>
          <Pencil size={15} />
          Переименовать
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={remove}
          disabled={pending}
          className="hover:text-danger"
          title={
            term.subjectCount > 0
              ? "Сначала перенеси предметы"
              : "Удалить семестр"
          }
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </div>
  );
}

function TermDialog({
  mode,
  termId,
  initialName,
  onClose,
}: {
  mode: "create" | "rename";
  termId?: string;
  initialName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [makeActive, setMakeActive] = useState(true);
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
        if (mode === "rename" && termId) {
          await renameTerm(termId, n);
        } else {
          await createTerm(n, makeActive);
        }
        router.refresh();
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "rename" ? "Переименовать семестр" : "Новый семестр"}
      description={
        mode === "create"
          ? "Например: «2 курс · осень» или «1 семестр 2026»."
          : undefined
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {mode === "rename" ? "Сохранить" : "Создать"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field error={error ?? undefined}>
          <Input
            autoFocus
            placeholder="Название семестра"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="h-11 text-[15px]"
          />
        </Field>

        {mode === "create" && (
          <button
            type="button"
            onClick={() => setMakeActive((v) => !v)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
              makeActive
                ? "border-accent bg-accent-soft"
                : "border-border hover:bg-surface-2",
            )}
          >
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[13.5px] font-medium",
                  makeActive ? "text-accent-soft-text" : "text-text",
                )}
              >
                Сделать активным сейчас
              </span>
              <span className="mt-0.5 block text-[12px] text-muted">
                Предметы, расписание и оценки переключатся на этот семестр.
              </span>
            </span>
            <span
              className={cn(
                "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                makeActive ? "bg-accent" : "bg-surface-3",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  makeActive ? "translate-x-[18px]" : "translate-x-0.5",
                )}
              />
            </span>
          </button>
        )}
      </div>
    </Modal>
  );
}

/* Простое склонение для «предмет/предмета/предметов». */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
