import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Users, Handshake, Cake } from "lucide-react";
import { getOrganization, getPeopleWithStats } from "@/lib/queries";
import { todayISO } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import { ORG_KIND_META, daysUntilBirthday, pluralDays } from "@/lib/person-format";
import { PersonCard } from "@/components/app/crm-items";
import { EntityNotes } from "@/components/app/EntityNotes";
import {
  EditOrganizationButton,
  NewPersonButton,
} from "@/components/app/crm-buttons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const o = await getOrganization(id);
  return { title: o?.name ?? "Организация" };
}

function Tile({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-text">
        {icon}
      </div>
      <div className="text-[16px] font-semibold leading-tight text-text">
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-muted">{label}</div>
    </div>
  );
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await getOrganization(id);
  if (!org) notFound();

  const today = todayISO();
  const allPeople = await getPeopleWithStats();
  const people = allPeople.filter((p) => p.organizationId === id);
  const meta = ORG_KIND_META[org.kind];
  const url = org.url
    ? org.url.startsWith("http")
      ? org.url
      : `https://${org.url}`
    : null;

  const totalMeetings = people.reduce((s, p) => s + p.meetingCount, 0);
  let soonest: { name: string; d: number } | null = null;
  for (const p of people) {
    const d = daysUntilBirthday(p.birthday, today);
    if (d != null && (soonest == null || d < soonest.d)) {
      soonest = { name: p.name, d };
    }
  }

  return (
    <div>
      <Link
        href="/organizacii"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Организации
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[22px]"
            style={{
              background: `color-mix(in oklab, ${areaColor(org.color)} 16%, transparent)`,
              color: areaColor(org.color),
            }}
          >
            {org.icon || meta.icon}
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-text">
              {org.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span>{meta.label}</span>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent-soft-text transition-opacity hover:opacity-80"
                >
                  <ExternalLink size={13} />
                  {org.url}
                </a>
              )}
            </div>
          </div>
        </div>
        <EditOrganizationButton
          organization={{
            id: org.id,
            name: org.name,
            kind: org.kind,
            note: org.note,
            url: org.url,
            color: org.color,
            icon: org.icon,
          }}
        />
      </div>

      {people.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile icon={<Users size={16} />} value={people.length} label="человек" />
          <Tile
            icon={<Handshake size={16} />}
            value={totalMeetings}
            label="встреч суммарно"
          />
          {soonest && (
            <Tile
              icon={<Cake size={16} />}
              value={
                soonest.d === 0
                  ? "сегодня!"
                  : `через ${soonest.d} ${pluralDays(soonest.d)}`
              }
              label={`ДР · ${soonest.name}`}
            />
          )}
        </div>
      )}

      {org.note && (
        <p className="mb-6 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-[14px] leading-relaxed text-muted">
          {org.note}
        </p>
      )}

      {/* Об организации — свободное описание с фото */}
      <div className="mb-8">
        <EntityNotes
          kind="organization"
          id={id}
          initialHTML={org.body ?? ""}
          title="Об организации"
          placeholder="Описание, контакты, важные детали, фото… Жми «/» или перетащи фото."
        />
      </div>

      <section>
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Люди
            {people.length > 0 && (
              <span className="ml-2 text-faint tabular">{people.length}</span>
            )}
          </h2>
          <NewPersonButton defaultOrganizationId={id}>Человек</NewPersonButton>
        </div>
        {people.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {people.map((p) => (
              <PersonCard key={p.id} person={p} today={today} />
            ))}
          </div>
        ) : (
          <p className="px-1 text-[13.5px] text-faint">
            Пока никто не привязан к этой организации.
          </p>
        )}
      </section>
    </div>
  );
}
