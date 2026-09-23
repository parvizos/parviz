"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CURRENCIES, currencyMeta } from "@/lib/currency";
import { useToast } from "./toast";
import { setBaseCurrency, refreshRates } from "@/lib/currency-actions";

/**
 * Карта «Основная валюта и курсы»: сменить основную валюту и обновить
 * курсы из интернета. Курсы также подтягиваются автоматически раз в сутки.
 */
export function BaseCurrencyCard({
  base,
  updatedLabel,
  source,
}: {
  base: string;
  updatedLabel: string | null;
  source: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const meta = currencyMeta(base);
  const busy = pending || refreshing;

  function change(code: string) {
    if (code === base || busy) return;
    startTransition(async () => {
      try {
        const res = await setBaseCurrency(code);
        router.refresh();
        const m = currencyMeta(code);
        if (res.ok) {
          toast({
            title: `Основная валюта — ${m.name} (${code})`,
            body: res.count
              ? `Курсы пересчитаны · ${res.source ?? ""}`.trim()
              : "Курсы обнови вручную, если нужно.",
          });
        } else {
          toast({
            title: `Валюта изменена на ${code}`,
            body: "Не удалось подтянуть курсы — нажми «Обновить».",
          });
        }
      } catch {
        toast({ title: "Не удалось сменить валюту" });
      }
    });
  }

  function refresh() {
    if (busy) return;
    startRefresh(async () => {
      const res = await refreshRates();
      router.refresh();
      if (res.ok) {
        toast({
          title: "Курсы обновлены",
          body: `${res.count} валют · ${res.source ?? ""}`.trim(),
        });
      } else {
        toast({
          title: "Не удалось обновить курсы",
          body: res.error ?? "Проверь связь и попробуй ещё раз.",
        });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <Wallet size={15} className="text-muted" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Основная валюта
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[18px] font-semibold text-accent-soft-text">
          {meta.symbol}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-text">{meta.name}</div>
          <div className="text-[12.5px] text-faint">
            Капитал и аналитика сводятся в {base}
          </div>
        </div>
      </div>

      {/* Выбор валюты */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {CURRENCIES.map((c) => {
          const active = c.code === base;
          return (
            <button
              key={c.code}
              type="button"
              disabled={busy}
              onClick={() => change(c.code)}
              title={c.name}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors disabled:opacity-50",
                active
                  ? "border-accent bg-accent-soft font-medium text-accent-soft-text"
                  : "border-border text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              {c.symbol !== c.code && (
                <span className="w-4 text-center">{c.symbol}</span>
              )}
              {c.code}
            </button>
          );
        })}
      </div>

      {/* Автокурсы */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0 text-[12.5px] text-muted">
          {updatedLabel ? (
            <>
              Курсы обновлены {updatedLabel}
              {source ? <span className="text-faint"> · {source}</span> : null}
            </>
          ) : (
            <span className="text-faint">Курсы ещё не подтягивались</span>
          )}
          <div className="text-faint">Автоматически раз в сутки</div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          disabled={busy}
          className="shrink-0"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Обновить
        </Button>
      </div>
    </div>
  );
}
