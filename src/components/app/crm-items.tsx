"use client";

import Link from "next/link";
import { useState, useTransition, type MouseEvent } from "react";
import { ChevronRight, Cake, Handshake, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { areaColor } from "@/lib/task-format";
import { ORG_KIND_META, daysUntilBirthday, agoLabel } from "@/lib/person-format";
import { ruMonthDayShort, diffDays } from "@/lib/dates";
import { togglePersonFavorite } from "@/lib/actions";
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
  const [fav, setFav] = useState(person.favorite);
  const [, startTransition] = useTransition();

  const sub = [person.role, person.orgName].filter(Boolean).join(" · ");
  const days =
    person.birthday != null ? daysUntilBirthday(person.birthday, today) : null;
  const soon = days != null && days <= 14;
  const meetingCount = person.meetingCount ?? 0;
  const daysSince = person.lastMeetingDate
    ? diffDays(person.lastMeetingDate, today)
    : null;
  const stale = daysSince != null && daysSince > 45;

  function toggleFav(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !fav;
    setFav(next);
    startTransition(async () => {
      try {
        await togglePersonFavorite(person.id, next);
      } catch {
        setFav(!next);
      }
    });
  }

  return (
    <div className="group relative rounded-2xl border border-border bg-surface transition-colors hover:border-border-strong hover:bg-surface-2">
      <Link
        href={`/lyudi/${person.id}`}
        className="flex items-center gap-3.5 p-4 pr-11"
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
          {(soon || meetingCount > 0) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px]">
              {soon && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-soft-text">
                  <Cake size={11} />
                  {days === 0 ? "сегодня" : ruMonthDayShort(person.birthday!)}
                </span>
              )}
              {meetingCount > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 truncate",
                    stale ? "text-warning" : "text-faint",
                  )}
                >
                  <Handshake size={12} className="shrink-0" />
                  {meetingCount} {plMeetings(meetingCount)}
                  {daysSince != null && ` · ${agoLabel(daysSince)}`}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      <button
        onClick={toggleFav}
        aria-label={fav ? "Убрать из избранного" : "В избранное"}
        title={fav ? "Убрать из избранного" : "В избранное"}
        className={cn(
          "absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          fav
            ? "text-warning"
            : "text-faint opacity-0 hover:bg-surface-2 group-hover:opacity-100",
        )}
      >
        <Star size={15} className={fav ? "fill-current" : ""} />
      </button>
    </div>
  );
}

export type OrgMemberPreview = {
  id: string;
  name: string;
  avatar: string | null;
  icon: string | null;
  color: string | null;
};

export function OrgCard({
  org,
  members = [],
}: {
  org: OrgWithCount;
  members?: OrgMemberPreview[];
}) {
  const meta = ORG_KIND_META[org.kind];
  return (
    <Link
      href={`/organizacii/${org.id}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[20px]"
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
        {members.length > 0 && (
          <div className="mt-2 flex items-center -space-x-1.5">
            {members.slice(0, 5).map((m) => (
              <span
                key={m.id}
                className="rounded-full ring-2 ring-surface transition-[ring-color] group-hover:ring-surface-2"
              >
                <Avatar
                  name={m.name}
                  avatar={m.avatar}
                  icon={m.icon}
                  color={m.color}
                  size={22}
                />
              </span>
            ))}
            {org.peopleCount > 5 && (
              <span className="pl-3 text-[11px] text-faint">
                +{org.peopleCount - 5}
              </span>
            )}
          </div>
        )}
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 self-center text-faint transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
