import { CreditCard } from "lucide-react";
import { getAccountsWithBalances, getTotalBalance } from "@/lib/queries";
import { getCurrencyRates } from "@/lib/finance-queries";
import { getBaseCurrency, getSettings, SETTING_KEYS } from "@/lib/settings";
import { formatMoneyShort } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { AccountCard } from "@/components/app/finance-items";
import { NewAccountButton } from "@/components/app/finance-buttons";
import { RatesCard, CurrencyConverter } from "@/components/app/finance2-items";
import { BaseCurrencyCard } from "@/components/app/currency-settings";

export const metadata = { title: "Счета" };
export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AccountsPage() {
  const base = await getBaseCurrency();
  const [accounts, total, rates, cfg] = await Promise.all([
    getAccountsWithBalances(),
    getTotalBalance(),
    getCurrencyRates(),
    getSettings([SETTING_KEYS.ratesUpdatedAt, SETTING_KEYS.ratesSource]),
  ]);
  const usedRates = rates.filter((r) => r.inUse);
  const converterRates = rates
    .filter((r) => r.rateToBase != null)
    .map((r) => ({ code: r.code, rateToBase: r.rateToBase as number }));

  const tsRaw = cfg.get(SETTING_KEYS.ratesUpdatedAt);
  const ts = tsRaw ? Number(tsRaw) : NaN;
  const updatedLabel = Number.isFinite(ts) ? DATE_FMT.format(new Date(ts)) : null;
  const source = cfg.get(SETTING_KEYS.ratesSource) ?? null;

  const currencyCard = (
    <BaseCurrencyCard base={base} updatedLabel={updatedLabel} source={source} />
  );

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

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {currencyCard}
            {usedRates.length > 0 && <RatesCard rates={usedRates} base={base} />}
          </div>
          {converterRates.length > 0 && (
            <div className="mt-3">
              <CurrencyConverter rates={converterRates} base={base} />
            </div>
          )}
        </>
      ) : (
        <>
          <EmptyState
            icon={<CreditCard size={22} />}
            title="Нет счетов"
            description="Добавь счёт — карту, наличные или накопления. Баланс будет считаться сам по операциям."
            action={<NewAccountButton />}
          />
          <div className="mt-4">{currencyCard}</div>
        </>
      )}
    </div>
  );
}
