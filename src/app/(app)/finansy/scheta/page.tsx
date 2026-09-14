import { CreditCard } from "lucide-react";
import { getAccountsWithBalances, getTotalBalance } from "@/lib/queries";
import { formatMoneyShort } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { AccountCard } from "@/components/app/finance-items";
import { NewAccountButton } from "@/components/app/finance-buttons";

export const metadata = { title: "Счета" };
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [accounts, total] = await Promise.all([
    getAccountsWithBalances(),
    getTotalBalance(),
  ]);

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
            <span className="text-[13px] text-muted">Всего</span>
            <span className="text-[20px] font-semibold tabular text-text">
              {formatMoneyShort(total)}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <AccountCard key={a.id} account={a} />
            ))}
          </div>
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
