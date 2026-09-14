import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";
import {
  getTotalBalance,
  getAccountsWithBalances,
  getMonthSummary,
  getSpendingByCategory,
  getTransactions,
} from "@/lib/queries";
import { currentMonth, isValidMonth } from "@/lib/dates";
import { formatMoneyShort } from "@/lib/money";
import { financeColor } from "@/lib/finance-format";
import { cn } from "@/lib/cn";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { MonthNav } from "@/components/app/MonthNav";
import { AccountCard, TransactionRow } from "@/components/app/finance-items";
import {
  NewTransactionButton,
  NewAccountButton,
} from "@/components/app/finance-buttons";

export const metadata = { title: "Финансы" };
export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = isValidMonth(m) ? m : currentMonth();

  const [total, accounts, summary, spending, recent] = await Promise.all([
    getTotalBalance(),
    getAccountsWithBalances(),
    getMonthSummary(month),
    getSpendingByCategory(month),
    getTransactions({ limit: 8 }),
  ]);

  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader
          title="Финансы"
          subtitle="Счета, доходы и расходы, бюджеты по категориям."
        />
        <EmptyState
          icon={<Wallet size={22} />}
          title="Добавь первый счёт"
          description="Карта, наличные, накопления — с этого начинается учёт. Потом добавишь операции и увидишь, куда уходят деньги."
          action={<NewAccountButton />}
        />
      </div>
    );
  }

  const maxSpent = spending[0]?.spent ?? 0;

  return (
    <div>
      <PageHeader title="Финансы" actions={<NewTransactionButton />} />

      {/* Баланс + месяц */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] text-muted">Всего на счетах</div>
            <div
              className={cn(
                "mt-1 text-[30px] font-semibold tracking-tight tabular",
                total < 0 ? "text-danger" : "text-text",
              )}
            >
              {formatMoneyShort(total)}
            </div>
          </div>
          <MonthNav month={month} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-success-soft px-3.5 py-3">
            <div className="text-[12px] text-success">Доход за месяц</div>
            <div className="mt-0.5 text-[17px] font-semibold tabular text-success">
              +{formatMoneyShort(summary.income)}
            </div>
          </div>
          <div className="rounded-xl bg-danger-soft px-3.5 py-3">
            <div className="text-[12px] text-danger">Расход за месяц</div>
            <div className="mt-0.5 text-[17px] font-semibold tabular text-danger">
              −{formatMoneyShort(summary.expense)}
            </div>
          </div>
        </div>
      </div>

      {/* Счета */}
      <section className="mb-8">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Счета
          </h2>
          <NewAccountButton>Счёт</NewAccountButton>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} />
          ))}
        </div>
      </section>

      {/* Расходы по категориям */}
      {spending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Расходы по категориям
          </h2>
          <div className="flex flex-col gap-2.5">
            {spending.map((c) => {
              const over = c.budget != null && c.spent > c.budget;
              const pct =
                maxSpent > 0 ? Math.max((c.spent / maxSpent) * 100, 3) : 0;
              return (
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
                        width: `${pct}%`,
                        background: financeColor(c.color),
                      }}
                    />
                  </div>
                  <div className="w-28 shrink-0 text-right text-[12.5px] tabular">
                    <span className={over ? "text-danger" : "text-muted"}>
                      {formatMoneyShort(c.spent)}
                    </span>
                    {c.budget != null && (
                      <span className="block text-[11px] text-faint">
                        из {formatMoneyShort(c.budget)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Последние операции */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Последние операции
          </h2>
          <Link
            href="/finansy/operacii"
            className="inline-flex items-center gap-1 text-[13px] text-accent-soft-text transition-opacity hover:opacity-80"
          >
            Все <ArrowRight size={14} />
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="flex flex-col">
            {recent.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </div>
        ) : (
          <p className="px-1 text-[13.5px] text-faint">
            Пока нет операций.{" "}
            <span className="text-muted">Добавь первую — кнопкой сверху.</span>
          </p>
        )}
      </section>
    </div>
  );
}
