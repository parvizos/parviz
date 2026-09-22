"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CloudOff,
  Loader2,
  ListTodo,
  FileText,
  Send,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { enqueueCapture, type CaptureKind } from "@/lib/capture-queue";

/** Быстрый захват задачи/заметки. Работает офлайн: не отправилось — в очередь. */
export function QuickCapture({ initialText = "" }: { initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [kind, setKind] = useState<CaptureKind>("task");
  const [state, setState] = useState<"idle" | "sending" | "done" | "queued">(
    "idle",
  );

  async function submit() {
    const t = text.trim();
    if (!t || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, text: t }),
      });
      if (!res.ok) throw new Error("bad");
      setState("done");
      setText("");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      try {
        await enqueueCapture({
          id: crypto.randomUUID(),
          kind,
          text: t,
          at: Date.now(),
        });
        setState("queued");
        setText("");
        setTimeout(() => setState("idle"), 2600);
      } catch {
        setState("idle");
      }
    }
  }

  const tabClass = (active: boolean) =>
    cn(
      "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors",
      active
        ? "bg-surface text-text shadow-[var(--shadow-sm)]"
        : "text-muted hover:text-text",
    );

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex gap-1 rounded-xl bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setKind("task")}
          className={tabClass(kind === "task")}
        >
          <ListTodo size={15} /> Задача
        </button>
        <button
          type="button"
          onClick={() => setKind("note")}
          className={tabClass(kind === "note")}
        >
          <FileText size={15} /> Заметка
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        autoFocus
        rows={3}
        placeholder={
          kind === "task"
            ? "Что нужно сделать…"
            : "Заметка — что записать…"
        }
        className="w-full resize-none rounded-xl border border-border bg-bg px-3.5 py-3 text-[15px] leading-relaxed text-text outline-none transition-colors placeholder:text-faint focus:border-accent"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!text.trim() || state === "sending"}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {state === "sending" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {kind === "task" ? "Во «Входящие»" : "В блокнот"}
        </button>
        <span className="text-[12.5px] text-muted">
          {state === "done" && (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 size={14} /> Сохранено
            </span>
          )}
          {state === "queued" && (
            <span className="inline-flex items-center gap-1 text-warning">
              <CloudOff size={14} /> Офлайн — синхронизируется позже
            </span>
          )}
          {state === "idle" && (
            <span className="text-faint">⌘↵ — быстро отправить</span>
          )}
        </span>
      </div>
    </div>
  );
}
