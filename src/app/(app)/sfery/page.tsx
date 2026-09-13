import { Layers } from "lucide-react";
import { getAreasWithCounts } from "@/lib/queries";
import { AreaCard } from "@/components/app/cards";
import { NewAreaButton } from "@/components/app/buttons";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Сферы" };

export default async function AreasPage() {
  const areas = await getAreasWithCounts();

  return (
    <div>
      <PageHeader
        title="Сферы"
        subtitle="Зоны жизни и ответственности, в которые складываются проекты и задачи."
        actions={<NewAreaButton />}
      />

      {areas.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {areas.map((a) => (
            <AreaCard key={a.id} area={a} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Layers size={22} />}
          title="Пока нет сфер"
          description="Учёба, Работа, Здоровье, Финансы, Личное — раздели жизнь на сферы, чтобы всё было на своих местах."
          action={<NewAreaButton />}
        />
      )}
    </div>
  );
}
