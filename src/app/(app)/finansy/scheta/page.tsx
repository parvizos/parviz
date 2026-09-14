import { CreditCard } from "lucide-react";
import { getAccountsWithBalances, getTotalBalance } from "@/lib/queries";
import { getCurrencyRates } from "@/lib/finance-queries";
import { baseCurrency } from "@/lib/currency";
import { formatMoneyShort } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { AccountCard } from "@/components/app/finance-items";
import { NewAccountButton } from "@/components/app/finance-buttons";
import { RatesCard } from "@/components/app/finance2-items";

export const metadata = { title: "Счета" };
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const base = baseCurrency();
  const [accounts, total, rates] = await Promise.all([
    getAccountsWithBalances(),
    getTotalBalance(),
    getCurrencyRates(),
  ]);
  const usedRates = rates.filter((r) => r.inUse);

  return (
    <div>
      <PageHeader
        title="Счета"
        subtitle="Карты, наличные, накопления. Нажми на счёт, чтобы изменить."
        actions={<NewAccountButton />}
      />

      {accounts.length > 0 ? (
        <>
          <div className="mb-5 flex items-baseline justify-between rounded-2xl border border-border bg-surface px-5 py-4">
            <span className="text-[13px] text-muted">
              Всего{" "}
              {usedRates.length > 0 && (
                <span className="text-faint">· сведено в {base}</span>
              )}
            </span>
            <span className="text-[20px] font-semibold tabular text-text">
              {formatMoneyShort(total, base)}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <AccountCard key={a.id} account={a} />
            ))}
          </div>

          {usedRates.length > 0 && (
            <div className="mt-6">
              <RatesCard rates={usedRates} base={base} />
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<CreditCard size={22} />}
          title="Нет счетов"
          description="Добавь счёт — карту, наличные или накопления. Баланс будет считаться сам по операциям."
          action={<NewAccountButton />}
        />
      )}
    </div>
  );
}
