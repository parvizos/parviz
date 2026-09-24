"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, Bell } from "lucide-react";

export type ToastAction = { label: string; onClick: () => void };
export type ToastInput = {
  title: string;
  body?: string;
  icon?: ReactNode;
  actions?: ToastAction[];
  /** ms до автозакрытия; 0 — не закрывать самому. По умолчанию 8000. */
  duration?: number;
  onClick?: () => void;
};
type Toast = ToastInput & { id: number };

type ToastCtx = { toast: (t: ToastInput) => number; dismiss: (id: number) => void };
const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast использован вне ToastProvider");
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts, { ...input, id }]);
      const dur = input.duration ?? 8000;
      if (dur > 0) timers.current.set(id, setTimeout(() => dismiss(id), dur));
      return id;
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </Ctx.Provider>
  );
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  // Портал монтируем только после гидрации: на сервере вьюпорта нет, поэтому и
  // на первом клиентском рендере его быть не должно — иначе React ловит
  // расхождение (портал в document.body накладывался на оверлей заставки) и
  // перерисовывает всё дерево страницы заново. Через mounted первый рендер
  // совпадает с сервером (null), а тосты появляются следующим кадром.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- одноразовый флаг «после гидрации» для безопасного портала
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-3 sm:items-end sm:p-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-full max-w-sm animate-panel-in overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-lg)]"
        >
          <div className="flex gap-3 p-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-text">
              {t.icon ?? <Bell size={16} />}
            </span>
            <button
              onClick={() => {
                t.onClick?.();
                dismiss(t.id);
              }}
              className={cnToast(!!t.onClick)}
            >
              <div className="text-[14px] font-medium text-text">{t.title}</div>
              {t.body && (
                <div className="mt-0.5 text-[13px] text-muted">{t.body}</div>
              )}
            </button>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Закрыть"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-text"
            >
              <X size={14} />
            </button>
          </div>
          {t.actions && t.actions.length > 0 && (
            <div className="flex flex-wrap gap-1 border-t border-border px-2 py-1.5">
              {t.actions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    a.onClick();
                    dismiss(t.id);
                  }}
                  className="rounded-lg px-2.5 py-1 text-[12.5px] font-medium text-accent-soft-text transition-colors hover:bg-surface-2"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}

function cnToast(clickable: boolean): string {
  return `min-w-0 flex-1 text-left ${clickable ? "cursor-pointer" : "cursor-default"}`;
}
