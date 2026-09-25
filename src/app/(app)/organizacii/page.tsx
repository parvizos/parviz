import Link from "next/link";
import { Building2, SearchX } from "lucide-react";
import {
  getOrganizationsWithCounts,
  getPeopleWithStats,
} from "@/lib/queries";
import { ORG_KIND_META, ORG_KINDS_ORDER } from "@/lib/person-format";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { OrgCard, type OrgMemberPreview } from "@/components/app/crm-items";
import { OrgSearchBox } from "@/components/app/OrgSearchBox";
import {
  CollapsibleChips,
  type FilterChip,
} from "@/components/app/CollapsibleChips";
import { NewOrganizationButton } from "@/components/app/crm-buttons";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Организации" };
export const dynamic = "force-dynamic";

function plOrgs(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "организация";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "организации";
  return "организаций";
}

const SORTS: { key: string; label: string }[] = [
  { key: "activity", label: "По активности" },
  { key: "people", label: "По людям" },
  { key: "name", label: "Имя" },
];

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const kind = ORG_KINDS_ORDER.some((k) => k === sp.kind) ? sp.kind! : undefined;
  const sort =
    sp.sort === "name"
      ? "name"
      : sp.sort === "activity"
        ? "activity"
        : "people";
  const today = todayISO();

  const [orgs, people] = await Promise.all([
    getOrganizationsWithCounts(),
    getPeopleWithStats(),
  ]);

  const membersByOrg = new Map<string, OrgMemberPreview[]>();
  for (const p of people) {
    if (!p.organizationId) continue;
    const arr = membersByOrg.get(p.organizationId) ?? [];
    arr.push({ id: p.id, name: p.name, avatar: p.avatar, icon: p.icon, color: p.color });
    membersByOrg.set(p.organizationId, arr);
  }

  const kindCounts = new Map<string, number>();
  for (const o of orgs) kindCounts.set(o.kind, (kindCounts.get(o.kind) ?? 0) + 1);

  const ql = q.toLowerCase();
  const filtered = orgs.filter((o) => {
    if (kind && o.kind !== kind) return false;
    if (ql && !`${o.name} ${o.note ?? ""}`.toLowerCase().includes(ql)) return false;
    return true;
  });
  function cmp(a: (typeof filtered)[number], b: (typeof filtered)[number]) {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "activity")
      return (
        (b.lastMeetingDate ?? "").localeCompare(a.lastMeetingDate ?? "") ||
        b.peopleCount - a.peopleCount ||
        a.name.localeCompare(b.name)
      );
    return b.peopleCount - a.peopleCount || a.name.localeCompare(b.name);
  }
  // Избранные всегда сверху, затем — выбранная сортировка.
  const sorted = [...filtered].sort(
    (a, b) => Number(b.favorite) - Number(a.favorite) || cmp(a, b),
  );

  function kindHref(nextKind?: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextKind) params.set("kind", nextKind);
    if (sort !== "people") params.set("sort", sort);
    const qs = params.toString();
    return `/organizacii${qs ? `?${qs}` : ""}`;
  }
  function sortHref(nextSort: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kind) params.set("kind", kind);
    if (nextSort !== "people") params.set("sort", nextSort);
    const qs = params.toString();
    return `/organizacii${qs ? `?${qs}` : ""}`;
  }

  const kindChips: FilterChip[] = [
    { key: "all", label: "Все", count: orgs.length, href: kindHref(), active: !kind },
    ...ORG_KINDS_ORDER.filter((k) => kindCounts.has(k)).map(
      (k): FilterChip => ({
        key: k,
        label: ORG_KIND_META[k].label,
        count: kindCounts.get(k),
        href: kindHref(kind === k ? undefined : k),
        active: kind === k,
      }),
    ),
  ];

  return (
    <div>
      <PageHeader
        title="Организации"
        subtitle="Вузы, компании и всё, к чему относятся твои люди."
        actions={<NewOrganizationButton />}
      />

      {orgs.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} />}
          title="Нет организаций"
          description="Добавь вуз, работу или любую структуру — и группируй людей по ним."
          action={<NewOrganizationButton />}
        />
      ) : (
        <>
          <div className="mb-4">
            <OrgSearchBox initialQ={q} kind={kind} />
          </div>

          {kindChips.length > 2 && (
            <div className="mb-4">
              <CollapsibleChips chips={kindChips} limit={10} />
            </div>
          )}

          {sorted.length === 0 ? (
            <EmptyState
              icon={<SearchX size={22} />}
              title="Ничего не нашлось"
              description="Попробуй другое название или сбрось фильтр."
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-[12.5px] text-faint">
                  {sorted.length} {plOrgs(sorted.length)}
                </p>
                <div className="flex flex-wrap gap-0.5">
                  {SORTS.map((s) => (
                    <Link
                      key={s.key}
                      href={sortHref(s.key)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors",
                        sort === s.key
                          ? "bg-accent text-accent-fg"
                          : "text-muted hover:bg-surface-2 hover:text-text",
                      )}
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sorted.map((o) => (
                  <OrgCard
                    key={o.id}
                    org={o}
                    members={membersByOrg.get(o.id) ?? []}
                    today={today}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
