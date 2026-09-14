"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  Link as LinkIcon,
  FileText,
  BookOpen,
  Video,
  Paperclip,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import {
  TOPIC_STATUS_META,
  nextTopicStatus,
  MATERIAL_KINDS_ORDER,
  MATERIAL_KIND_META,
  formatBytes,
} from "@/lib/study-format";
import {
  createTopic,
  setTopicStatus,
  deleteTopic,
  createMaterial,
  deleteMaterial,
} from "@/lib/study-actions";
import type { Topic, TopicStatus, MaterialKind } from "@/db/schema";
import type { MaterialRow } from "@/lib/study-queries";

const TONE_VAR: Record<string, string> = {
  muted: "var(--faint)",
  warning: "var(--warning)",
  success: "var(--success)",
  accent: "var(--accent)",
};

/* ─────────────────────────  Программа курса (темы)  ───────────────────────── */

export function TopicList({
  subjectId,
  topics,
}: {
  subjectId: string;
  topics: Topic[];
}) {
  const [title, setTitle] = useState("");
  const [override, setOverride] = useState<Record<string, TopicStatus>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const visible = topics.filter((t) => !removed.has(t.id));
  const statusOf = (t: Topic): TopicStatus => override[t.id] ?? t.status;
  const known = visible.filter((t) => statusOf(t) === "known").length;
  const total = visible.length;
  const pct = total > 0 ? (known / total) * 100 : 0;

  function add() {
    const v = title.trim();
    if (!v) return;
    setTitle("");
    startTransition(async () => {
      try {
        await createTopic({ subjectId, title: v });
      } catch {}
    });
  }

  function cycle(t: Topic) {
    const next = nextTopicStatus(statusOf(t));
    setOverride((o) => ({ ...o, [t.id]: next }));
    startTransition(async () => {
      try {
        await setTopicStatus(t.id, next);
      } catch {}
    });
  }

  function remove(id: string) {
    setRemoved((s) => new Set(s).add(id));
    startTransition(async () => {
      try {
        await deleteTopic(id);
      } catch {}
    });
  }

  return (
    <div>
      {total > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-[12.5px] text-muted">
            <span>
              знаю {known} из {total}
            </span>
            <span className="tabular">{Math.round(pct)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <Input
          placeholder="Добавить тему…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-10"
        />
        <Button size="sm" variant="secondary" onClick={add} disabled={pending}>
          <Plus size={16} />
        </Button>
      </div>

      {visible.length > 0 ? (
        <div className="flex flex-col divide-y divide-border">
          {visible.map((t) => {
            const st = statusOf(t);
            const meta = TOPIC_STATUS_META[st];
            const tone = TONE_VAR[meta.tone];
            return (
              <div key={t.id} className="group flex items-center gap-2.5 py-2">
                <button
                  onClick={() => cycle(t)}
                  title="Сменить статус"
                  className={cn(
                    "h-6 w-[62px] shrink-0 rounded-md text-[11.5px] font-medium transition-colors",
                    st === "not_started"
                      ? "border border-border text-faint hover:bg-surface-2"
                      : "text-white",
                  )}
                  style={st === "not_started" ? undefined : { background: tone }}
                >
                  {meta.short}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[14px]",
                    st === "known" ? "text-muted" : "text-text",
                  )}
                >
                  {t.title}
                </span>
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Удалить тему"
                  className="shrink-0 text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-1 text-[13.5px] text-faint">
          Раскидай программу на темы — будет видно готовность к экзамену.
        </p>
      )}
    </div>
  );
}

/* ───────────────────────────  Материалы  ─────────────────────────── */

function kindIcon(kind: MaterialKind, size = 16) {
  switch (kind) {
    case "file":
      return <Paperclip size={size} />;
    case "book":
      return <BookOpen size={size} />;
    case "video":
      return <Video size={size} />;
    case "other":
      return <FileText size={size} />;
    default:
      return <LinkIcon size={size} />;
  }
}

function MaterialDialog({
  onClose,
  subjectId,
}: {
  onClose: () => void;
  subjectId: string;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<MaterialKind>("link");
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onPick(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { id: string };
      setFileId(json.id);
      setFileName(file.name);
      if (!title.trim()) setTitle(file.name);
      setKind("file");
    } catch {
      setError("Не удалось загрузить файл (макс. 25 МБ)");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    const t = title.trim();
    if (!t) {
      setError("Введите название");
      return;
    }
    if (mode === "url" && !url.trim()) {
      setError("Вставьте ссылку");
      return;
    }
    if (mode === "file" && !fileId) {
      setError("Загрузите файл");
      return;
    }
    startTransition(async () => {
      try {
        await createMaterial({
          subjectId,
          title: t,
          kind: mode === "file" ? "file" : kind,
          url: mode === "url" ? url.trim() : null,
          fileId: mode === "file" ? fileId : null,
        });
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
      title="Материал"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button size="sm" onClick={submit} disabled={pending || uploading}>
            Добавить
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-1.5">
          {(["url", "file"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "h-9 flex-1 rounded-lg border text-[13px] font-medium transition-colors",
                mode === m
                  ? "border-transparent bg-surface-3 text-text"
                  : "border-border text-muted hover:bg-surface-2",
              )}
            >
              {m === "url" ? "Ссылка" : "Файл"}
            </button>
          ))}
        </div>

        <Field label="Название" error={error ?? undefined}>
          <Input
            autoFocus
            placeholder="Например, Методичка по матану"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 text-[15px]"
          />
        </Field>

        {mode === "url" ? (
          <>
            <Field label="Ссылка">
              <Input
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>
            <Field label="Тип">
              <Select value={kind} onChange={(e) => setKind(e.target.value as MaterialKind)}>
                {MATERIAL_KINDS_ORDER.filter((k) => k !== "file").map((k) => (
                  <option key={k} value={k}>
                    {MATERIAL_KIND_META[k].label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <Field label="Файл" hint="До 25 МБ — хранится прямо в базе">
            <label
              className={cn(
                "flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-[13px] transition-colors hover:bg-surface-2",
                fileId ? "text-text" : "text-muted",
              )}
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : fileId ? (
                <>
                  <Paperclip size={18} className="text-success" />
                  {fileName}
                </>
              ) : (
                <>
                  <Paperclip size={18} />
                  Выбрать файл
                </>
              )}
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPick(f);
                }}
              />
            </label>
          </Field>
        )}
      </div>
    </Modal>
  );
}

export function SubjectMaterials({
  subjectId,
  materials,
}: {
  subjectId: string;
  materials: MaterialRow[];
}) {
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const visible = materials.filter((m) => !removed.has(m.id));

  function remove(id: string) {
    setRemoved((s) => new Set(s).add(id));
    startTransition(async () => {
      try {
        await deleteMaterial(id);
      } catch {}
    });
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Материалы
        </h2>
        <Button size="sm" variant="soft" onClick={() => setOpen(true)}>
          <Plus size={16} /> Материал
        </Button>
      </div>

      {visible.length > 0 ? (
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
          {visible.map((m) => {
            const href = m.fileId ? `/api/files/${m.fileId}` : m.url ?? "#";
            return (
              <div key={m.id} className="group flex items-center gap-3 px-3.5 py-2.5">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                    {kindIcon(m.kind)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] text-text group-hover:text-accent">
                        {m.title}
                      </span>
                      <ExternalLink size={12} className="shrink-0 text-faint" />
                    </div>
                    <div className="truncate text-[12px] text-faint">
                      {MATERIAL_KIND_META[m.kind].label}
                      {m.fileSize != null ? ` · ${formatBytes(m.fileSize)}` : ""}
                      {m.url && !m.fileId ? ` · ${hostOf(m.url)}` : ""}
                    </div>
                  </div>
                </a>
                <button
                  onClick={() => remove(m.id)}
                  aria-label="Удалить материал"
                  className="shrink-0 text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-1 text-[13.5px] text-faint">
          Собери методички, записи лекций и ссылки в одном месте.
        </p>
      )}

      {open && <MaterialDialog onClose={() => setOpen(false)} subjectId={subjectId} />}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
