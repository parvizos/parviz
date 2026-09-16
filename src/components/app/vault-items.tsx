"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Star,
  ExternalLink,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { revealCredential, toggleCredentialFavorite } from "@/lib/vault-actions";
import { useToast } from "./toast";
import { useUi } from "./ui-context";
import type { CredentialMeta } from "@/lib/vault-queries";

export function NewCredentialButton({
  children = "Новая запись",
}: {
  children?: ReactNode;
}) {
  const { openNewCredential } = useUi();
  return (
    <Button size="sm" onClick={() => openNewCredential()}>
      <Plus size={16} /> {children}
    </Button>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CredentialCard({ credential: c }: { credential: CredentialMeta }) {
  const { openEditCredential } = useUi();
  const { toast } = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [fav, setFav] = useState(c.favorite);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function reveal() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setBusy(true);
    try {
      setRevealed(await revealCredential(c.id));
    } catch {
    } finally {
      setBusy(false);
    }
  }
  async function copyPw() {
    try {
      const pw = revealed ?? (await revealCredential(c.id));
      await navigator.clipboard.writeText(pw);
      toast({ title: "Пароль скопирован", duration: 3000 });
    } catch {}
  }
  async function copyUser() {
    if (!c.username) return;
    try {
      await navigator.clipboard.writeText(c.username);
      toast({ title: "Логин скопирован", duration: 2500 });
    } catch {}
  }
  function toggleFav() {
    const next = !fav;
    setFav(next);
    startTransition(async () => {
      try {
        await toggleCredentialFavorite(c.id, next);
      } catch {
        setFav(!next);
      }
    });
  }

  const host = c.url
    ? c.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    : null;
  const href = c.url ? (c.url.startsWith("http") ? c.url : `https://${c.url}`) : null;

  return (
    <div className="group rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-text">
          <KeyRound size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-medium text-text">
              {c.title || "Без названия"}
            </h3>
            {c.category && (
              <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                {c.category}
              </span>
            )}
          </div>
          {c.username && (
            <button
              onClick={copyUser}
              title="Скопировать логин"
              className="mt-0.5 block max-w-full truncate text-left text-[13px] text-muted transition-colors hover:text-text"
            >
              {c.username}
            </button>
          )}
          {host && href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] text-muted transition-colors hover:text-accent"
            >
              <ExternalLink size={12} /> {host}
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          <IconBtn
            label={fav ? "Убрать из избранного" : "В избранное"}
            onClick={toggleFav}
            className={fav ? "text-warning hover:text-warning" : ""}
          >
            <Star size={16} className={fav ? "fill-current" : ""} />
          </IconBtn>
          <IconBtn
            label="Изменить"
            onClick={() =>
              openEditCredential({
                id: c.id,
                title: c.title,
                username: c.username,
                url: c.url,
                category: c.category,
                note: c.note,
                favorite: c.favorite,
              })
            }
          >
            <Pencil size={15} />
          </IconBtn>
        </div>
      </div>

      {c.hasPassword && (
        <div className="mt-3 flex items-center gap-1 rounded-xl border border-border bg-surface-2/50 px-2 py-1.5">
          <span className="flex-1 truncate font-mono text-[13.5px] text-text">
            {revealed !== null ? revealed || "—" : "••••••••••••"}
          </span>
          <IconBtn
            label={revealed !== null ? "Скрыть" : "Показать"}
            onClick={reveal}
            disabled={busy}
          >
            {revealed !== null ? <EyeOff size={15} /> : <Eye size={15} />}
          </IconBtn>
          <IconBtn label="Скопировать пароль" onClick={copyPw}>
            <Copy size={15} />
          </IconBtn>
        </div>
      )}

      {c.note && (
        <p className="mt-2 line-clamp-2 px-1 text-[12.5px] text-faint">{c.note}</p>
      )}
    </div>
  );
}

export function VaultList({ credentials }: { credentials: CredentialMeta[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query
    ? credentials.filter((c) =>
        [c.title, c.username, c.url, c.category, c.note].some((f) =>
          f?.toLowerCase().includes(query),
        ),
      )
    : credentials;

  const favs = filtered.filter((c) => c.favorite);
  const rest = filtered.filter((c) => !c.favorite);
  const groups = new Map<string, CredentialMeta[]>();
  for (const c of rest) {
    const k = c.category?.trim() || "Без категории";
    const arr = groups.get(k);
    if (arr) arr.push(c);
    else groups.set(k, [c]);
  }

  return (
    <div>
      <div className="relative mb-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по паролям…"
          className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[14px] text-text outline-none placeholder:text-faint focus:border-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-1 py-8 text-center text-[13.5px] text-faint">
          Ничего не найдено
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {favs.length > 0 && <Section title="Избранное" items={favs} />}
          {[...groups.entries()].map(([cat, items]) => (
            <Section key={cat} title={cat} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: CredentialMeta[] }) {
  return (
    <section>
      <div className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((c) => (
          <CredentialCard key={c.id} credential={c} />
        ))}
      </div>
    </section>
  );
}
