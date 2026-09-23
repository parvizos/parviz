import { Tags } from "lucide-react";
import { getCategoriesWithMonth } from "@/lib/queries";
import { getBaseCurrency } from "@/lib/settings";
import { currentMonth, isValidMonth } from "@/lib/dates";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { MonthNav } from "@/components/app/MonthNav";
import { CategoryCard } from "@/components/app/finance-items";
import { NewCategoryButton } from "@/components/app/finance-buttons";

export const metadata = { title: "Категории" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = isValidMonth(m) ? m : currentMonth();
  const base = await getBaseCurrency();
  const categories = await getCategoriesWithMonth(month);
  const expense = categories.filter((c) => c.kind === "expense");
  const income = categories.filter((c) => c.kind === "income");

  return (
    <div>
      <PageHeader
        title="Категории"
        actions={
          <div className="flex items-center gap-2">
            <MonthNav month={month} />
            <NewCategoryButton />
          </div>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={<Tags size={22} />}
          title="Нет категорий"
          description="Категории помогают понять, куда уходят деньги. Задай расходам месячный бюджет — и следи, чтобы не выйти за него."
          action={<NewCategoryButton />}
        />
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                Расходы
              </h2>
              <NewCategoryButton defaultKind="expense">Расход</NewCategoryButton>
            </div>
            {expense.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {expense.map((c) => (
                  <CategoryCard key={c.id} category={c} base={base} />
                ))}
              </div>
            ) : (
              <p className="px-1 text-[13.5px] text-faint">
                Нет категорий расходов.
              </p>
            )}
          </section>

          <section>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                Доходы
              </h2>
              <NewCategoryButton defaultKind="income">Доход</NewCategoryButton>
            </div>
            {income.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {income.map((c) => (
                  <CategoryCard key={c.id} category={c} base={base} />
                ))}
              </div>
            ) : (
              <p className="px-1 text-[13.5px] text-faint">
                Нет категорий доходов.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
