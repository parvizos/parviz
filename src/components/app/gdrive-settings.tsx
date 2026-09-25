"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  Check,
  Loader2,
  ChevronDown,
  Copy,
  Power,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useToast } from "./toast";
import {
  saveDriveCredentials,
  disconnectDrive,
  forgetDriveCredentials,
  setDriveUploads,
} from "@/lib/gdrive-actions";

type Notice = "connected" | "denied" | "badstate" | "error" | "nocreds" | null;

const NOTICE: Record<
  Exclude<Notice, null>,
  { tone: "ok" | "warn" | "bad"; text: string }
> = {
  connected: { tone: "ok", text: "Google Drive подключён — новые файлы теперь летят туда." },
  denied: { tone: "warn", text: "Доступ не выдан. Ничего не подключили." },
  badstate: { tone: "warn", text: "Сессия подтверждения истекла. Нажми «Подключить» ещё раз." },
  error: { tone: "bad", text: "Не удалось подключиться к Google. Проверь ключи и попробуй снова." },
  nocreds: { tone: "warn", text: "Сначала сохрани Client ID и Client Secret." },
};

export function GDriveSettings({
  hasCredentials,
  connected,
  email,
  uploadsOn,
  redirectUri,
  notice = null,
}: {
  hasCredentials: boolean;
  connected: boolean;
  email: string | null;
  uploadsOn: boolean;
  redirectUri: string;
  notice?: Notice;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(!hasCredentials);
  const [showSteps, setShowSteps] = useState(!hasCredentials);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  function copyRedirect() {
    navigator.clipboard?.writeText(redirectUri).then(
      () => toast({ title: "Redirect URI скопирован" }),
      () => {},
    );
  }

  function save() {
    if (pending) return;
    start(async () => {
      const res = await saveDriveCredentials(clientId, clientSecret);
      if (res.ok) {
        setEditing(false);
        setClientId("");
        setClientSecret("");
        router.refresh();
        toast({ title: "Ключи сохранены", body: "Теперь нажми «Подключить Google Drive»." });
      } else {
        toast({ title: "Не сохранилось", body: res.error });
      }
    });
  }

  function disconnect() {
    if (pending) return;
    start(async () => {
      await disconnectDrive();
      router.refresh();
      toast({ title: "Google Drive отключён", body: "Новые файлы снова сохраняются локально." });
    });
  }

  function forget() {
    if (pending) return;
    start(async () => {
      await forgetDriveCredentials();
      setEditing(true);
      router.refresh();
      toast({ title: "Ключи удалены" });
    });
  }

  function toggleUploads(next: boolean) {
    if (pending) return;
    start(async () => {
      await setDriveUploads(next);
      router.refresh();
      toast({
        title: next ? "Загрузка в Drive включена" : "Загрузка в Drive на паузе",
        body: next
          ? "Новые файлы идут в облако."
          : "Новые файлы пока сохраняются локально.",
      });
    });
  }

  const n = notice ? NOTICE[notice] : null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            connected
              ? "bg-success/15 text-success"
              : "bg-accent-soft text-accent-soft-text",
          )}
        >
          <Cloud size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-medium text-text">Google Drive</p>
            {connected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11.5px] font-medium text-success">
                <Check size={12} /> Подключён
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Новые фото, файлы и музыка сохраняются в папке{" "}
            <span className="font-medium text-text">ParvizOS</span> на твоём
            Google Диске и оттуда же открываются в приложении. Старое остаётся
            на месте.
          </p>

          {n && (
            <div
              className={cn(
                "mt-3 rounded-lg border px-3 py-2 text-[12.5px]",
                n.tone === "ok" &&
                  "border-success/30 bg-success/10 text-success",
                n.tone === "warn" &&
                  "border-warning/30 bg-warning/10 text-warning",
                n.tone === "bad" &&
                  "border-danger/30 bg-danger/10 text-danger",
              )}
            >
              {n.text}
            </div>
          )}

          {/* ── Подключено ── */}
          {connected && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-[13px]">
                <KeyRound size={15} className="text-muted" />
                <span className="min-w-0 flex-1 truncate text-text">
                  {email || "Google-аккаунт"}
                </span>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-[13px] text-text">
                  Складывать новые файлы в Drive
                  <span className="block text-[12px] text-faint">
                    {uploadsOn
                      ? "Включено — всё новое идёт в облако"
                      : "На паузе — новое сохраняется локально"}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={uploadsOn}
                  disabled={pending}
                  onClick={() => toggleUploads(!uploadsOn)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
                    uploadsOn ? "bg-accent" : "bg-border-strong",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      uploadsOn ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              </label>

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button variant="secondary" size="sm" onClick={disconnect} disabled={pending}>
                  {pending ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
                  Отключить
                </Button>
              </div>
            </div>
          )}

          {/* ── Ключи есть, но не подключено ── */}
          {!connected && hasCredentials && !editing && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href="/api/google/connect"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover"
              >
                <Cloud size={16} />
                Подключить Google Drive
              </a>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={pending}>
                Изменить ключи
              </Button>
              <Button variant="ghost" size="sm" onClick={forget} disabled={pending}>
                Забыть
              </Button>
            </div>
          )}

          {/* ── Форма ключей ── */}
          {editing && (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowSteps((s) => !s)}
                className="flex w-full items-center gap-1.5 text-left text-[12.5px] font-medium text-accent-soft-text"
              >
                <ChevronDown
                  size={15}
                  className={cn("transition-transform", showSteps && "rotate-180")}
                />
                Как получить Client ID и Secret (один раз)
              </button>

              {showSteps && (
                <ol className="space-y-1.5 rounded-xl border border-border bg-surface-2 p-3 text-[12.5px] leading-relaxed text-muted">
                  <li>
                    1. Открой{" "}
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-accent-soft-text hover:underline"
                    >
                      console.cloud.google.com <ExternalLink size={11} />
                    </a>{" "}
                    и создай проект (или выбери свой).
                  </li>
                  <li>2. «APIs &amp; Services» → «Library» → включи <b>Google Drive API</b>.</li>
                  <li>
                    3. «OAuth consent screen» → тип <b>External</b>, впиши название и
                    свою почту, добавь себя в <b>Test users</b>.
                  </li>
                  <li>
                    4. «Credentials» → «Create credentials» → <b>OAuth client ID</b> →
                    тип <b>Web application</b>.
                  </li>
                  <li>
                    5. В «Authorized redirect URIs» вставь этот адрес:
                    <div className="mt-1 flex items-center gap-1.5">
                      <code className="min-w-0 flex-1 truncate rounded-md bg-bg px-2 py-1 text-[11.5px] text-text">
                        {redirectUri}
                      </code>
                      <button
                        type="button"
                        onClick={copyRedirect}
                        aria-label="Скопировать redirect URI"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-surface hover:text-text"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </li>
                  <li>6. Скопируй <b>Client ID</b> и <b>Client Secret</b> в поля ниже.</li>
                </ol>
              )}

              <div className="space-y-2">
                <input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Client ID (…apps.googleusercontent.com)"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-[13px] text-text outline-none transition-colors focus:border-accent"
                />
                <input
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Client Secret"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-[13px] text-text outline-none transition-colors focus:border-accent"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={save}
                  disabled={pending || !clientId.trim() || !clientSecret.trim()}
                >
                  {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Сохранить ключи
                </Button>
                {hasCredentials && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                    Отмена
                  </Button>
                )}
              </div>
              <p className="text-[11.5px] text-faint">
                Ключи хранятся только в твоей базе на сервере и никуда не
                отправляются, кроме самого Google.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
