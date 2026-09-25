"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  Check,
  Loader2,
  ChevronDown,
  Power,
  Database,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useToast } from "./toast";
import {
  connectStorage,
  disconnectStorage,
  setCloudUploads,
  type StorageForm,
} from "@/lib/storage-actions";

const EMPTY: StorageForm = {
  endpoint: "",
  region: "auto",
  bucket: "",
  accessKey: "",
  secret: "",
  prefix: "",
};

export function StorageSettings({
  configured,
  uploadsOn,
  source,
  endpoint,
  bucket,
  region,
  prefix,
}: {
  configured: boolean;
  uploadsOn: boolean;
  source: "ui" | "env" | null;
  endpoint: string | null;
  bucket: string | null;
  region: string | null;
  prefix: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(!configured);
  const [showSteps, setShowSteps] = useState(!configured);
  const [form, setForm] = useState<StorageForm>({
    ...EMPTY,
    endpoint: endpoint ?? "",
    region: region ?? "auto",
    bucket: bucket ?? "",
    prefix: prefix ?? "",
  });

  const set = (k: keyof StorageForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function connect() {
    if (pending) return;
    start(async () => {
      const res = await connectStorage(form);
      if (res.ok) {
        setEditing(false);
        setForm((f) => ({ ...f, secret: "" }));
        router.refresh();
        toast({ title: "Хранилище подключено", body: "Новые файлы теперь летят в облако." });
      } else {
        toast({ title: "Не подключилось", body: res.error });
      }
    });
  }

  function disconnect() {
    if (pending) return;
    start(async () => {
      await disconnectStorage();
      setEditing(true);
      router.refresh();
      toast({ title: "Хранилище отключено", body: "Новые файлы снова сохраняются локально." });
    });
  }

  function toggleUploads(next: boolean) {
    if (pending) return;
    start(async () => {
      await setCloudUploads(next);
      router.refresh();
      toast({
        title: next ? "Заливка в облако включена" : "Заливка в облако на паузе",
        body: next ? "Новые файлы идут в облако." : "Новые файлы пока сохраняются локально.",
      });
    });
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
          <Cloud size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-medium text-text">
              Облачное хранилище <span className="text-faint">· Cloudflare R2 / S3</span>
            </p>
            {configured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11.5px] font-medium text-success">
                <Check size={12} /> Подключено
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Новые фото, файлы и музыка сохраняются в твоём бакете и оттуда же
            открываются в приложении. Старое остаётся на месте.
          </p>

          {/* ── Подключено ── */}
          {configured && !editing && (
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[12.5px]">
                <div className="flex gap-2">
                  <span className="w-16 shrink-0 text-faint">Бакет</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-text">{bucket}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 shrink-0 text-faint">Endpoint</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{endpoint}</span>
                </div>
                {source === "env" && (
                  <div className="pt-1 text-[11.5px] text-faint">
                    Настроено через переменные окружения (S3_*). «Отключить»
                    убирает только настройку из интерфейса.
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-[13px] text-text">
                  Складывать новые файлы в облако
                  <span className="block text-[12px] text-faint">
                    {uploadsOn ? "Включено — всё новое идёт в облако" : "На паузе — новое сохраняется локально"}
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
                Как получить ключи (Cloudflare R2)
              </button>

              {showSteps && (
                <ol className="space-y-1.5 rounded-xl border border-border bg-surface-2 p-3 text-[12.5px] leading-relaxed text-muted">
                  <li>
                    1. Открой{" "}
                    <a
                      href="https://dash.cloudflare.com/?to=/:account/r2"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-accent-soft-text hover:underline"
                    >
                      Cloudflare → R2 <ExternalLink size={11} />
                    </a>{" "}
                    и создай бакет (например <b>parviz-media</b>).
                  </li>
                  <li>2. «Manage R2 API Tokens» → <b>Create API Token</b> → права <b>Object Read &amp; Write</b>, выбери бакет → Create.</li>
                  <li>3. Скопируй <b>Access Key ID</b> и <b>Secret Access Key</b> (секрет показывают один раз!).</li>
                  <li>
                    4. Endpoint (S3 API) там же:{" "}
                    <code className="rounded bg-bg px-1 py-0.5 text-[11px]">https://&lt;account_id&gt;.r2.cloudflarestorage.com</code>.
                  </li>
                  <li>5. Впиши всё ниже. Регион для R2 — <b>auto</b> (уже стоит).</li>
                </ol>
              )}

              <div className="space-y-2">
                <input value={form.endpoint} onChange={set("endpoint")} placeholder="Endpoint · https://<account_id>.r2.cloudflarestorage.com" autoComplete="off" spellCheck={false} className={input} />
                <div className="flex gap-2">
                  <input value={form.bucket} onChange={set("bucket")} placeholder="Бакет · parviz-media" autoComplete="off" spellCheck={false} className={input} />
                  <input value={form.region} onChange={set("region")} placeholder="Регион · auto" autoComplete="off" spellCheck={false} className={cn(input, "w-28 shrink-0")} />
                </div>
                <input value={form.accessKey} onChange={set("accessKey")} placeholder="Access Key ID" autoComplete="off" spellCheck={false} className={input} />
                <input value={form.secret} onChange={set("secret")} placeholder={configured ? "Secret Access Key (оставь пустым — не менять)" : "Secret Access Key"} type="password" autoComplete="off" spellCheck={false} className={input} />
                <input value={form.prefix} onChange={set("prefix")} placeholder="Префикс (необязательно, напр. parviz/)" autoComplete="off" spellCheck={false} className={input} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={connect} disabled={pending || !form.endpoint.trim() || !form.bucket.trim() || !form.accessKey.trim()}>
                  {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Проверить и подключить
                </Button>
                {configured && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                    Отмена
                  </Button>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-[11.5px] text-faint">
                <Database size={12} />
                «Проверить» реально запишет и удалит тестовый объект в бакете. Ключи хранятся только в твоей базе на сервере.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
