import { TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getSpendingByCategory } from "@/lib/queries";
import {
  getNetWorth,
  getCapitalSeries,
  getIncomeExpenseSeries,
} from "@/lib/finance-queries";
import { baseCurrency } from "@/lib/currency";
import { currentMonth, monthLabel } from "@/lib/dates";
import { formatMoneyShort } from "@/lib/money";
import { financeColor } from "@/lib/finance-format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import {
  CapitalChart,
  IncomeExpenseChart,
} from "@/components/app/finance-charts";

export const metadata = { title: "Аналитика" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const base = baseCurrency();
  const month = currentMonth();
  const [net, capital, series, spending] = await Promise.all([
    getNetWorth(),
    getCapitalSeries(12),
    getIncomeExpenseSeries(12),
    getSpendingByCategory(month),
  ]);

  const maxSpent = spending[0]?.spent ?? 0;
  const hasFlows = series.some((p) => p.income > 0 || p.expense > 0);

  return (
    <div>
      <PageHeader
        title="Аналитика"
        subtitle="Капитал, динамика и куда уходят деньги — всё сведено в базовую валюту."
      />

      {net.missingRates.length > 0 && (
        <Link
          href="/finansy/scheta"
          className="mb-5 flex items-center gap-2.5 rounded-xl bg-warning-soft px-4 py-3 text-[13px] text-warning transition-colors hover:brightness-95"
        >
          <AlertTriangle size={16} className="shrink-0" />
          Не задан курс для {net.missingRates.join(", ")} — суммы в этих валютах
          считаются как есть. Задать курс →
        </Link>
      )}

      {/* Капитал */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <div className="text-[13px] text-muted">Чистый капитал</div>
        <div
          className={cn(
            "mt-1 text-[30px] font-semibold tracking-tight tabular",
            net.net < 0 ? "text-danger" : "text-text",
          )}
        >
          {formatMoneyShort(net.net, base)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
          <span className="text-muted">
            На счетах{" "}
            <span className="font-medium text-text tabular">
              {formatMoneyShort(net.onAccounts, base)}
            </span>
          </span>
          {net.receivable > 0 && (
            <span className="text-muted">
              Мне должны{" "}
              <span className="font-medium text-success tabular">
                +{formatMoneyShort(net.receivable, base)}
              </span>
            </span>
          )}
          {net.payable > 0 && (
            <span className="text-muted">
              Я должен{" "}
              <span className="font-medium text-danger tabular">
                −{formatMoneyShort(net.payable, base)}
              </span>
            </span>
          )}
        </div>

        {net.byCurrency.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {net.byCurrency.map((c) => (
              <span
                key={c.currency}
                className="rounded-lg bg-surface-2 px-2.5 py-1 text-[12.5px] text-muted tabular"
              >
                {formatMoneyShort(c.balance, c.currency)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Капитал по месяцам */}
      <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-1 text-[14px] font-semibold text-text">
          Капитал по месяцам
        </h2>
        <p className="mb-3 text-[12.5px] text-faint">
          Сколько всего было на счетах на конец каждого месяца
        </p>
        <CapitalChart points={capital} base={base} />
      </section>

      {/* Доход/расход */}
      <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-text">
            Доход и расход
          </h2>
          <div className="flex items-center gap-3 text-[12px]">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2.5 w-2.5 rounded-sm bg-success" /> доход
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2.5 w-2.5 rounded-sm bg-danger" /> расход
            </span>
          </div>
        </div>
        {hasFlows ? (
          <IncomeExpenseChart points={series} base={base} />
        ) : (
          <p className="py-8 text-center text-[13px] text-faint">
            Пока нет операций для графика
          </p>
        )}
      </section>

      {/* Топ категорий */}
      {spending.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-muted" />
            <h2 className="text-[14px] font-semibold text-text">
              Куда ушли деньги
            </h2>
          </div>
          <p className="mb-4 text-[12.5px] text-faint">{monthLabel(month)}</p>
          <div className="flex flex-col gap-3">
            {spending.slice(0, 8).map((c) => (
              <div
                key={c.categoryId ?? "none"}
                className="flex items-center gap-3"
              >
                <div className="w-32 shrink-0 truncate text-[13px] text-text">
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxSpent > 0 ? Math.max((c.spent / maxSpent) * 100, 3) : 0}%`,
                      background: financeColor(c.color),
                    }}
                  />
                </div>
                <div className="w-24 shrink-0 text-right text-[12.5px] text-muted tabular">
                  {formatMoneyShort(c.spent, base)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
