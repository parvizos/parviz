import { Target } from "lucide-react";
import { getGoals, getRatesMap } from "@/lib/finance-queries";
import { baseCurrency, toBase } from "@/lib/currency";
import { formatMoneyShort } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { GoalCard, NewGoalButton } from "@/components/app/finance2-items";

export const metadata = { title: "Цели" };
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const base = baseCurrency();
  const [goals, rates] = await Promise.all([getGoals(), getRatesMap()]);

  if (goals.length === 0) {
    return (
      <div>
        <PageHeader
          title="Цели накопления"
          subtitle="Копи на цель — прогресс, остаток и сколько откладывать, чтобы успеть."
        />
        <EmptyState
          icon={<Target size={22} />}
          title="Целей пока нет"
          description="Ноутбук, поездка, подушка безопасности — заведи цель и откладывай по чуть-чуть. Прогресс будет виден сразу."
          action={<NewGoalButton>Новая цель</NewGoalButton>}
        />
      </div>
    );
  }

  const active = goals.filter((g) => !g.achieved);
  const done = goals.filter((g) => g.achieved);

  const savedBase = active.reduce(
    (s, g) => s + toBase(g.saved, g.currency, rates, base),
    0,
  );
  const targetBase = active.reduce(
    (s, g) => s + toBase(g.targetAmount, g.currency, rates, base),
    0,
  );

  return (
    <div>
      <PageHeader title="Цели накопления" actions={<NewGoalButton />} />

      {active.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-surface px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-muted">
              Отложено по активным целям
            </span>
            <span className="text-[17px] font-semibold tabular text-text">
              {formatMoneyShort(savedBase, base)}{" "}
              <span className="text-[13px] font-normal text-faint">
                из {formatMoneyShort(targetBase, base)}
              </span>
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent"
              style={{
                width: `${targetBase > 0 ? Math.min((savedBase / targetBase) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {active.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </div>

      {done.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Достигнутые
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {done.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
