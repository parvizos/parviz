"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, Eye, EyeOff, Copy, Dices, Star } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { generatePassword, passwordStrength } from "@/lib/password-gen";
import {
  createCredential,
  updateCredential,
  deleteCredential,
  revealCredential,
} from "@/lib/vault-actions";
import { useToast } from "./toast";

export type CredentialForEdit = {
  id: string;
  title: string;
  username: string | null;
  url: string | null;
  category: string | null;
  note: string | null;
  favorite: boolean;
};

export function CredentialDialog({
  onClose,
  credential,
}: {
  onClose: () => void;
  credential?: CredentialForEdit | null;
}) {
  const editing = !!credential;
  const { toast } = useToast();
  const [title, setTitle] = useState(credential?.title ?? "");
  const [username, setUsername] = useState(credential?.username ?? "");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState(credential?.url ?? "");
  const [category, setCategory] = useState(credential?.category ?? "");
  const [note, setNote] = useState(credential?.note ?? "");
  const [favorite, setFavorite] = useState(credential?.favorite ?? false);
  const [show, setShow] = useState(!editing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // При редактировании подгружаем текущий пароль (по требованию, расшифровка на сервере).
  useEffect(() => {
    if (!credential) return;
    let alive = true;
    revealCredential(credential.id)
      .then((pw) => {
        if (alive) setPassword(pw);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [credential]);

  function gen() {
    setPassword(generatePassword(20));
    setShow(true);
  }
  async function copyPw() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast({ title: "Пароль скопирован", duration: 3000 });
    } catch {}
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
          username: username.trim() || null,
          url: url.trim() || null,
          category: category.trim() || null,
          note: note.trim() || null,
          password,
          favorite,
        };
        if (editing && credential) await updateCredential(credential.id, payload);
        else await createCredential(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!credential) return;
    if (!confirm("Удалить запись? Пароль будет потерян безвозвратно.")) return;
    startTransition(async () => {
      await deleteCredential(credential.id);
      onClose();
    });
  }

  const strength = passwordStrength(password);

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Запись" : "Новая запись"}
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
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Название" error={error ?? undefined}>
              <Input
                autoFocus
                placeholder="Например, Gmail"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 text-[15px]"
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => setFavorite((f) => !f)}
            aria-label={favorite ? "Убрать из избранного" : "В избранное"}
            title={favorite ? "Убрать из избранного" : "В избранное"}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
              favorite
                ? "border-transparent bg-warning/15 text-warning"
                : "border-border text-faint hover:bg-surface-2 hover:text-text",
            )}
          >
            <Star size={18} className={favorite ? "fill-current" : ""} />
          </button>
        </div>

        <Field label="Логин / почта">
          <Input
            placeholder="user@example.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />
        </Field>

        <Field label="Пароль">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-1 focus-within:border-accent">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="off"
                spellCheck={false}
                className="h-10 flex-1 bg-transparent px-2 font-mono text-[14px] text-text outline-none placeholder:font-sans placeholder:text-faint"
              />
              <IconBtn label={show ? "Скрыть" : "Показать"} onClick={() => setShow((s) => !s)}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </IconBtn>
              <IconBtn label="Скопировать" onClick={copyPw}>
                <Copy size={16} />
              </IconBtn>
              <IconBtn label="Сгенерировать" onClick={gen}>
                <Dices size={16} />
              </IconBtn>
            </div>
            {password && (
              <div className="flex items-center gap-2 px-1">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(strength.score / 3) * 100}%`,
                      background: strength.color,
                    }}
                  />
                </div>
                <span className="text-[11.5px]" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Сайт">
            <Input
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Категория">
            <Input
              placeholder="Соцсети, Банки…"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              autoComplete="off"
            />
          </Field>
        </div>

        <Field label="Заметка" hint="Подсказка, не для секретов">
          <Textarea
            placeholder="Например: рабочая почта, привязан телефон…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-text"
    >
      {children}
    </button>
  );
}
