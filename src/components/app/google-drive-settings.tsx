"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  HardDrive,
  Check,
  Loader2,
  ChevronDown,
  Power,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useToast } from "./toast";
import { connectGoogleDrive, disconnectGoogleDrive } from "@/lib/google-actions";

function maskId(id: string): string {
  const head = id.slice(0, 12);
  return `${head}…apps.googleusercontent.com`;
}

export function GoogleDriveSettings({
  configured,
  clientId,
}: {
  configured: boolean;
  clientId: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(!configured);
  const [showSteps, setShowSteps] = useState(!configured);
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );
  const [cid, setCid] = useState("");
  const [key, setKey] = useState("");

  function connect() {
    if (pending) return;
    start(async () => {
      const res = await connectGoogleDrive({ clientId: cid, apiKey: key });
      if (res.ok) {
        setEditing(false);
        setKey("");
        router.refresh();
        toast({ title: "Google Диск подключён", body: "В редакторе появилась кнопка «С Google Диска»." });
      } else {
        toast({ title: "Не сохранилось", body: res.error });
      }
    });
  }
  function disconnect() {
    if (pending) return;
    start(async () => {
      await disconnectGoogleDrive();
      setCid("");
      setKey("");
      setEditing(true);
      router.refresh();
      toast({ title: "Google Диск отключён" });
    });
  }
  function copyOrigin() {
    navigator.clipboard?.writeText(origin).then(
      () => toast({ title: "Адрес скопирован", body: origin }),
      () => {},
    );
  }

  const input =
    "w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-[13px] text-text outline-none transition-colors focus:border-accent";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            configured ? "bg-success/15 text-success" : "bg-accent-soft text-accent-soft-text",
          )}
        >
          <HardDrive size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-medium text-text">
              Google Диск <span className="text-faint">· выбор файлов в редакторе</span>
            </p>
            {configured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11.5px] font-medium text-success">
                <Check size={12} /> Подключено
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Кнопка «С Google Диска» прямо в заметках: выбираешь файл из своего
            Диска — он копируется в твоё облако (R2) и вставляется. Документы
            Google открываются живым превью.
          </p>

          {/* ── Подключено ── */}
          {configured && !editing && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[12.5px]">
                <div className="flex gap-2">
                  <span className="w-20 shrink-0 text-faint">Client ID</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-text">
                    {clientId ? maskId(clientId) : "—"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)} disabled={pending}>
                  Изменить
                </Button>
                <Button variant="ghost" size="sm" onClick={disconnect} disabled={pending}>
                  <Power size={15} /> Отключить
                </Button>
              </div>
            </div>
          )}

          {/* ── Форма ── */}
          {editing && (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowSteps((s) => !s)}
                className="flex w-full items-center gap-1.5 text-left text-[12.5px] font-medium text-accent-soft-text"
              >
                <ChevronDown size={15} className={cn("transition-transform", showSteps && "rotate-180")} />
                Как получить Client ID и API-ключ (один раз)
              </button>

              {showSteps && (
                <ol className="space-y-1.5 rounded-xl border border-border bg-surface-2 p-3 text-[12.5px] leading-relaxed text-muted">
                  <li>
                    1. Открой{" "}
                    <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent-soft-text hover:underline">
                      Google Cloud Console <ExternalLink size={11} />
                    </a>{" "}
                    и создай проект.
                  </li>
                  <li>2. «APIs &amp; Services» → «Enabled APIs» → включи <b>Google Picker API</b> и <b>Google Drive API</b>.</li>
                  <li>3. «OAuth consent screen» → тип <b>External</b> → в «Test users» добавь свою почту.</li>
                  <li>
                    4. «Credentials» → «Create credentials» → <b>OAuth client ID</b> → тип <b>Web application</b>. В «Authorized JavaScript origins» впиши адрес приложения:
                    <span className="mt-1 flex items-center gap-1.5">
                      <code className="min-w-0 flex-1 truncate rounded bg-bg px-1.5 py-0.5 text-[11px]">{origin || "https://твой-домен"}</code>
                      <button type="button" onClick={copyOrigin} title="Скопировать" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-bg hover:text-text">
                        <Copy size={12} />
                      </button>
                    </span>
                    Скопируй <b>Client ID</b>.
                  </li>
                  <li>5. «Credentials» → «Create credentials» → <b>API key</b>. Скопируй ключ (можно ограничить по сайту — этому же адресу).</li>
                  <li>6. Впиши Client ID и ключ ниже.</li>
                </ol>
              )}

              <div className="space-y-2">
                <input value={cid} onChange={(e) => setCid(e.target.value)} placeholder="Client ID · …apps.googleusercontent.com" autoComplete="off" spellCheck={false} className={input} />
                <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="API key · AIza…" autoComplete="off" spellCheck={false} className={input} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={connect} disabled={pending || !cid.trim() || !key.trim()}>
                  {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Сохранить
                </Button>
                {configured && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                    Отмена
                  </Button>
                )}
              </div>
              <p className="text-[11.5px] text-faint">
                Client ID и API-ключ публичные (Picker работает в браузере). Доступ к файлам ограничен твоим Google-аккаунтом и доменом приложения.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
