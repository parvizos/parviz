import Link from "next/link";
import { ChevronRight, Cake, Handshake } from "lucide-react";
import { cn } from "@/lib/cn";
import { areaColor } from "@/lib/task-format";
import { ORG_KIND_META, daysUntilBirthday, agoLabel } from "@/lib/person-format";
import { ruMonthDayShort, diffDays } from "@/lib/dates";
import type { PersonWithOrg, OrgWithCount } from "@/lib/queries";
import { Avatar } from "./Avatar";

function plMeetings(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "встреча";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "встречи";
  return "встреч";
}

export function PersonCard({
  person,
  today,
}: {
  person: PersonWithOrg & {
    meetingCount?: number;
    lastMeetingDate?: string | null;
  };
  today: string;
}) {
  const sub = [person.role, person.orgName].filter(Boolean).join(" · ");
  const days =
    person.birthday != null ? daysUntilBirthday(person.birthday, today) : null;
  const soon = days != null && days <= 14;

  const meetingCount = person.meetingCount ?? 0;
  const daysSince = person.lastMeetingDate
    ? diffDays(person.lastMeetingDate, today)
    : null;
  const stale = daysSince != null && daysSince > 45;

  return (
    <Link
      href={`/lyudi/${person.id}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <Avatar
        name={person.name}
        avatar={person.avatar}
        icon={person.icon}
        color={person.color}
        size={46}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-text">
          {person.name}
        </div>
        {sub && <div className="truncate text-[12.5px] text-muted">{sub}</div>}
        {meetingCount > 0 && (
          <div
            className={cn(
              "mt-0.5 flex items-center gap-1 text-[12px]",
              stale ? "text-warning" : "text-faint",
            )}
          >
            <Handshake size={12} className="shrink-0" />
            <span className="truncate">
              {meetingCount} {plMeetings(meetingCount)}
              {daysSince != null && ` · виделись ${agoLabel(daysSince)}`}
            </span>
          </div>
        )}
      </div>
      {soon && (
        <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-soft-text">
          <Cake size={12} />
          {days === 0 ? "сегодня" : ruMonthDayShort(person.birthday!)}
        </span>
      )}
      <ChevronRight
        size={18}
        className="shrink-0 self-center text-faint transition-transform group-hover:translate-x-0.5"
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
