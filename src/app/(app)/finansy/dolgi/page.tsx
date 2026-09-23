import type { ReactNode } from "react";
import { HandCoins } from "lucide-react";
import { getAccountOptions } from "@/lib/queries";
import { getDebts, getDebtsSummary } from "@/lib/finance-queries";
import { getBaseCurrency } from "@/lib/settings";
import { formatMoneyShort } from "@/lib/money";
import { cn } from "@/lib/cn";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { DebtCard, NewDebtButton } from "@/components/app/finance2-items";

export const metadata = { title: "Долги" };
export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const base = await getBaseCurrency();
  const [debts, summary, accountOptions] = await Promise.all([
    getDebts(),
    getDebtsSummary(),
    getAccountOptions(),
  ]);

  if (debts.length === 0) {
    return (
      <div>
        <PageHeader
          title="Долги"
          subtitle="Кто должен тебе и кому должен ты — с историей возвратов."
        />
        <EmptyState
          icon={<HandCoins size={22} />}
          title="Долгов нет"
          description="Одолжил другу или взял в долг — заведи здесь. Возвраты записываются частями, а остаток всегда на виду."
          action={
            <div className="flex gap-2">
              <NewDebtButton direction="owed_to_me">Мне должны</NewDebtButton>
              <NewDebtButton direction="i_owe">Я должен</NewDebtButton>
            </div>
          }
        />
      </div>
    );
  }

  const openIn = debts.filter((d) => !d.settled && d.direction === "owed_to_me");
  const openOut = debts.filter((d) => !d.settled && d.direction === "i_owe");
  const closed = debts.filter((d) => d.settled);

  return (
    <div>
      <PageHeader
        title="Долги"
        actions={
          <div className="flex gap-2">
            <NewDebtButton direction="owed_to_me">Мне должны</NewDebtButton>
            <NewDebtButton direction="i_owe">Я должен</NewDebtButton>
          </div>
        }
      />

      {/* Сводка */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-success-soft px-4 py-3.5">
          <div className="text-[12px] text-success">Мне должны</div>
          <div className="mt-0.5 text-[18px] font-semibold tabular text-success">
            {formatMoneyShort(summary.receivable, base)}
          </div>
          <div className="text-[11px] text-success/70">
            {summary.openReceivable} шт.
          </div>
        </div>
        <div className="rounded-2xl bg-danger-soft px-4 py-3.5">
          <div className="text-[12px] text-danger">Я должен</div>
          <div className="mt-0.5 text-[18px] font-semibold tabular text-danger">
            {formatMoneyShort(summary.payable, base)}
          </div>
          <div className="text-[11px] text-danger/70">
            {summary.openPayable} шт.
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
          <div className="text-[12px] text-muted">Итог</div>
          <div
            className={cn(
              "mt-0.5 text-[18px] font-semibold tabular",
              summary.net < 0 ? "text-danger" : "text-text",
            )}
          >
            {summary.net >= 0 ? "+" : "−"}
            {formatMoneyShort(Math.abs(summary.net), base)}
          </div>
          <div className="text-[11px] text-faint">баланс долгов</div>
        </div>
      </div>

      {openIn.length > 0 && (
        <Section title="Мне должны" tone="success">
          {openIn.map((d) => (
            <DebtCard key={d.id} debt={d} accountOptions={accountOptions} />
          ))}
        </Section>
      )}

      {openOut.length > 0 && (
        <Section title="Я должен" tone="danger">
          {openOut.map((d) => (
            <DebtCard key={d.id} debt={d} accountOptions={accountOptions} />
          ))}
        </Section>
      )}

      {closed.length > 0 && (
        <Section title="Закрытые" tone="muted">
          {closed.map((d) => (
            <DebtCard key={d.id} debt={d} accountOptions={accountOptions} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "success" | "danger" | "muted";
  children: ReactNode;
}) {
  const dot =
    tone === "success"
      ? "var(--success)"
      : tone === "danger"
        ? "var(--danger)"
        : "var(--faint)";
  return (
    <section className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}
