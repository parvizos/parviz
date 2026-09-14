import { Receipt } from "lucide-react";
import { getTransactions } from "@/lib/queries";
import {
  currentMonth,
  isValidMonth,
  todayISO,
  relativeLabel,
  ruWeekday,
} from "@/lib/dates";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { MonthNav } from "@/components/app/MonthNav";
import { TransactionRow } from "@/components/app/finance-items";
import { NewTransactionButton } from "@/components/app/finance-buttons";
import type { TransactionWithContext } from "@/lib/queries";

export const metadata = { title: "Операции" };
export const dynamic = "force-dynamic";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = isValidMonth(m) ? m : currentMonth();
  const today = todayISO();
  const txs = await getTransactions({ month });

  const groups = new Map<string, TransactionWithContext[]>();
  for (const t of txs) {
    const arr = groups.get(t.date) ?? [];
    arr.push(t);
    groups.set(t.date, arr);
  }

  return (
    <div>
      <PageHeader
        title="Операции"
        actions={
          <div className="flex items-center gap-2">
            <MonthNav month={month} />
            <NewTransactionButton />
          </div>
        }
      />

      {txs.length > 0 ? (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([date, list]) => (
            <section key={date}>
              <div className="mb-1 flex items-baseline gap-2 px-2">
                <h2 className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">
                  {cap(relativeLabel(date, today))}
                </h2>
                <span className="text-[12px] text-faint">
                  {ruWeekday(date)}
                </span>
              </div>
              <div className="flex flex-col">
                {list.map((t) => (
                  <TransactionRow key={t.id} tx={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Receipt size={22} />}
          title="В этом месяце операций нет"
          description="Добавь доход, расход или перевод — они появятся здесь, разложенные по дням."
          action={<NewTransactionButton />}
        />
      )}
    </div>
  );
}
