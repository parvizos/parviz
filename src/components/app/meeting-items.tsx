"use client";

import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ruMonthDay } from "@/lib/dates";
import { excerpt } from "@/lib/text";
import { Avatar } from "./Avatar";
import { useUi } from "./ui-context";
import type { MeetingWithPerson } from "@/lib/queries";
import type { ReactNode } from "react";

const CURRENT_YEAR = String(new Date().getFullYear());

/** «15 сентября», а для прошлых лет — «15 сентября 2024». */
function meetingDate(iso: string): string {
  const base = ruMonthDay(iso);
  const year = iso.slice(0, 4);
  return year === CURRENT_YEAR ? base : `${base} ${year}`;
}

export function MeetingCard({ meeting }: { meeting: MeetingWithPerson }) {
  const snippet = excerpt(meeting.body, 200);

  return (
    <Link
      href={`/vstrechi/${meeting.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <div className="flex items-center gap-2 text-[12.5px] text-faint">
        <span className="tabular">{meetingDate(meeting.date)}</span>
        {meeting.location && (
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{meeting.location}</span>
          </span>
        )}
      </div>
      <h3 className="mt-1.5 truncate text-[15px] font-medium text-text">
        {meeting.title || "Без названия"}
      </h3>
      {snippet && (
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted">
          {snippet}
        </p>
      )}
      {meeting.personId && meeting.personName && (
        <div className="mt-3 inline-flex items-center gap-2 text-[12.5px] text-muted">
          <Avatar
            name={meeting.personName}
            avatar={meeting.personAvatar}
            icon={meeting.personIcon}
            color={meeting.personColor}
            size={20}
          />
          {meeting.personName}
        </div>
      )}
    </Link>
  );
}

export function NewMeetingButton({
  personId,
  variant = "primary",
  children = "Новая встреча",
}: {
  personId?: string | null;
  variant?: "primary" | "secondary" | "soft";
  children?: ReactNode;
}) {
  const { openNewMeeting } = useUi();
  return (
    <Button size="sm" variant={variant} onClick={() => openNewMeeting({ personId })}>
      <Plus size={16} />
      {children}
    </Button>
  );
}
