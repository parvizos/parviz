import { Building2 } from "lucide-react";
import { getOrganizationsWithCounts } from "@/lib/queries";
import { OrgCard } from "@/components/app/crm-items";
import { NewOrganizationButton } from "@/components/app/crm-buttons";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Организации" };
export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const orgs = await getOrganizationsWithCounts();

  return (
    <div>
      <PageHeader
        title="Организации"
        subtitle="Вузы, компании и всё, к чему относятся твои люди."
        actions={<NewOrganizationButton />}
      />

      {orgs.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {orgs.map((o) => (
            <OrgCard key={o.id} org={o} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 size={22} />}
          title="Нет организаций"
          description="Добавь вуз, работу или любую структуру — и группируй людей по ним."
          action={<NewOrganizationButton />}
        />
      )}
    </div>
  );
}
