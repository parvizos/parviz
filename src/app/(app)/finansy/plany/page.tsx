import type { ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { getPlanned, getMonthlyCommitment } from "@/lib/finance-queries";
import { baseCurrency } from "@/lib/currency";
import { formatMoneyShort } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { PlannedRow, NewPlannedButton } from "@/components/app/finance2-items";

export const metadata = { title: "Планы и подписки" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const base = baseCurrency();
  const [plans, commit] = await Promise.all([
    getPlanned(),
    getMonthlyCommitment(),
  ]);

  if (plans.length === 0) {
    return (
      <div>
        <PageHeader
          title="Планы и подписки"
          subtitle="Регулярные платежи и разовые будущие операции — на автомате или по кнопке."
        />
        <EmptyState
          icon={<CalendarClock size={22} />}
          title="Пока пусто"
          description="Заведи подписку (Spotify, аренда, интернет) или разовый план (получу стипендию 25-го). Наступит дата — проведётся сам или подождёт кнопки «Провести»."
          action={<NewPlannedButton>Добавить план</NewPlannedButton>}
        />
      </div>
    );
  }

  const due = plans.filter((p) => p.due);
  const subs = plans.filter(
    (p) => p.active && !p.due && p.recurrence !== "once",
  );
  const oneOff = plans.filter(
    (p) => p.active && !p.due && p.recurrence === "once",
  );
  const paused = plans.filter((p) => !p.active);

  return (
    <div>
      <PageHeader title="Планы и подписки" actions={<NewPlannedButton />} />

      {/* Фиксированная нагрузка в месяц */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-danger-soft px-4 py-3.5">
          <div className="text-[12px] text-danger">Подписки в месяц</div>
          <div className="mt-0.5 text-[18px] font-semibold tabular text-danger">
            −{formatMoneyShort(commit.expense, base)}
          </div>
        </div>
        <div className="rounded-2xl bg-success-soft px-4 py-3.5">
          <div className="text-[12px] text-success">Регулярный доход</div>
          <div className="mt-0.5 text-[18px] font-semibold tabular text-success">
            +{formatMoneyShort(commit.income, base)}
          </div>
        </div>
      </div>

      {due.length > 0 && (
        <Section
          title="Ожидают проведения"
          hint="Наступила дата — проведи или включи автопроведение"
        >
          {due.map((p) => (
            <PlannedRow key={p.id} plan={p} />
          ))}
        </Section>
      )}

      {subs.length > 0 && (
        <Section title="Подписки">
          {subs.map((p) => (
            <PlannedRow key={p.id} plan={p} />
          ))}
        </Section>
      )}

      {oneOff.length > 0 && (
        <Section title="Разовые планы">
          {oneOff.map((p) => (
            <PlannedRow key={p.id} plan={p} />
          ))}
        </Section>
      )}

      {paused.length > 0 && (
        <Section title="На паузе">
          {paused.map((p) => (
            <PlannedRow key={p.id} plan={p} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2.5 px-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-[12px] text-faint">{hint}</p>}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
