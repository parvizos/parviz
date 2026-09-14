import Link from "next/link";
import { ChevronRight, Cake } from "lucide-react";
import { areaColor } from "@/lib/task-format";
import { ORG_KIND_META, daysUntilBirthday } from "@/lib/person-format";
import { ruMonthDayShort } from "@/lib/dates";
import type { PersonWithOrg, OrgWithCount } from "@/lib/queries";

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function PersonCard({
  person,
  today,
}: {
  person: PersonWithOrg;
  today: string;
}) {
  const sub = [person.role, person.orgName].filter(Boolean).join(" · ");
  const days =
    person.birthday != null ? daysUntilBirthday(person.birthday, today) : null;
  const soon = days != null && days <= 14;

  return (
    <Link
      href={`/lyudi/${person.id}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-medium"
        style={{
          background: `color-mix(in oklab, ${areaColor(person.color)} 18%, transparent)`,
          color: areaColor(person.color),
        }}
      >
        {person.icon || initials(person.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-text">
          {person.name}
        </div>
        {sub && <div className="truncate text-[12.5px] text-muted">{sub}</div>}
      </div>
      {soon && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-soft-text">
          <Cake size={12} />
          {days === 0 ? "сегодня" : ruMonthDayShort(person.birthday!)}
        </span>
      )}
      <ChevronRight
        size={18}
        className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

export function OrgCard({ org }: { org: OrgWithCount }) {
  const meta = ORG_KIND_META[org.kind];
  return (
    <Link
      href={`/organizacii/${org.id}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[18px]"
        style={{
          background: `color-mix(in oklab, ${areaColor(org.color)} 16%, transparent)`,
          color: areaColor(org.color),
        }}
      >
        {org.icon || meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-text">
          {org.name}
        </div>
        <div className="text-[12.5px] text-muted">
          {meta.label} · {org.peopleCount} чел.
        </div>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
