import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Users,
  Handshake,
  Cake,
  Clock,
  Mail,
  Phone,
  MapPin,
  Globe,
} from "lucide-react";
import { getOrganization, getPeopleWithStats, getOrganizationMeetings } from "@/lib/queries";
import { todayISO, ruMonthDay, diffDays } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import {
  ORG_KIND_META,
  daysUntilBirthday,
  pluralDays,
  agoLabel,
} from "@/lib/person-format";
import { PersonCard } from "@/components/app/crm-items";
import { Avatar } from "@/components/app/Avatar";
import { OrgLogo } from "@/components/app/OrgLogo";
import { EntityNotes } from "@/components/app/EntityNotes";
import {
  EditOrganizationButton,
  NewPersonButton,
  OrgFavoriteToggle,
} from "@/components/app/crm-buttons";
import { NewMeetingButton } from "@/components/app/meeting-items";

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
  tone,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  tone?: "warning";
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <div
        className={
          "mb-2 flex h-8 w-8 items-center justify-center rounded-lg " +
          (tone === "warning"
            ? "bg-warning/12 text-warning"
            : "bg-accent-soft text-accent-soft-text")
        }
      >
        {icon}
      </div>
      <div className="text-[16px] font-semibold leading-tight text-text">
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-muted">{label}</div>
    </div>
  );
}

const CURRENT_YEAR = String(new Date().getFullYear());
function meetingDate(iso: string): string {
  const base = ruMonthDay(iso);
  const year = iso.slice(0, 4);
  return year === CURRENT_YEAR ? base : `${base} ${year}`;
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
  const [allPeople, meetings] = await Promise.all([
    getPeopleWithStats(),
    getOrganizationMeetings(id, 6),
  ]);
  const people = allPeople.filter((p) => p.organizationId === id);
  const meta = ORG_KIND_META[org.kind];
  const tone = areaColor(org.color);

  const url = org.url
    ? org.url.startsWith("http")
      ? org.url
      : `https://${org.url}`
    : null;

  const totalMeetings = people.reduce((s, p) => s + p.meetingCount, 0);
  const lastContactDays = meetings[0]
    ? diffDays(meetings[0].date, today)
    : null;

  let soonest: { name: string; d: number } | null = null;
  for (const p of people) {
    const d = daysUntilBirthday(p.birthday, today);
    if (d != null && (soonest == null || d < soonest.d)) {
      soonest = { name: p.name, d };
    }
  }

  const contacts: { Icon: typeof Mail; label: string; href: string; text: string }[] = [];
  if (url)
    contacts.push({ Icon: Globe, label: "Сайт", href: url, text: org.url! });
  if (org.email)
    contacts.push({
      Icon: Mail,
      label: "Почта",
      href: `mailto:${org.email}`,
      text: org.email,
    });
  if (org.phone)
    contacts.push({
      Icon: Phone,
      label: "Телефон",
      href: `tel:${org.phone.replace(/[^\d+]/g, "")}`,
      text: org.phone,
    });
  if (org.location)
    contacts.push({
      Icon: MapPin,
      label: "Адрес",
      href: `https://maps.google.com/?q=${encodeURIComponent(org.location)}`,
      text: org.location,
    });

  return (
    <div>
      <Link
        href="/organizacii"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Организации
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <OrgLogo
            logo={org.logo}
            emoji={org.icon || meta.icon}
            color={org.color}
            size={56}
          />
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-tight text-text">
              {org.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span
                className="rounded-md px-1.5 py-px text-[12px] font-medium"
                style={{
                  background: `color-mix(in oklab, ${tone} 14%, transparent)`,
                  color: tone,
                }}
              >
                {meta.label}
              </span>
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
        <div className="flex shrink-0 items-center gap-2">
          <OrgFavoriteToggle id={org.id} initial={org.favorite} />
          <EditOrganizationButton
            organization={{
              id: org.id,
              name: org.name,
              kind: org.kind,
              note: org.note,
              url: org.url,
              color: org.color,
              icon: org.icon,
              logo: org.logo,
              email: org.email,
              phone: org.phone,
              location: org.location,
            }}
          />
        </div>
      </div>

      {(people.length > 0 || meetings.length > 0) && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile icon={<Users size={16} />} value={people.length} label="человек" />
          <Tile
            icon={<Handshake size={16} />}
            value={totalMeetings}
            label="встреч суммарно"
          />
          <Tile
            icon={<Clock size={16} />}
            value={lastContactDays != null ? agoLabel(lastContactDays) : "—"}
            label={lastContactDays != null ? "последний контакт" : "нет встреч"}
            tone={lastContactDays != null && lastContactDays > 60 ? "warning" : undefined}
          />
          {soonest ? (
            <Tile
              icon={<Cake size={16} />}
              value={
                soonest.d === 0
                  ? "сегодня!"
                  : `через ${soonest.d} ${pluralDays(soonest.d)}`
              }
              label={`ДР · ${soonest.name}`}
            />
          ) : (
            <Tile icon={<Cake size={16} />} value="—" label="дни рождения" />
          )}
        </div>
      )}

      {contacts.length > 0 && (
        <div className="mb-5 rounded-2xl border border-border bg-surface p-2">
          <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            {contacts.map((c) => {
              const external = c.href.startsWith("http");
              return (
                <a
                  key={c.label}
                  href={c.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted transition-colors group-hover:bg-surface group-hover:text-text">
                    <c.Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] uppercase tracking-wide text-faint">
                      {c.label}
                    </span>
                    <span className="block truncate text-[13.5px] text-text">
                      {c.text}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {org.note && (
        <p className="mb-6 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-[14px] leading-relaxed text-muted">
          {org.note}
        </p>
      )}

      {meetings.length > 0 && (
        <section className="mb-8">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
              Лента взаимодействий
            </h2>
            <NewMeetingButton variant="soft">Встреча</NewMeetingButton>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {meetings.map((m, i) => (
              <Link
                key={m.id}
                href={`/vstrechi/${m.id}`}
                className={
                  "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 " +
                  (i > 0 ? "border-t border-border" : "")
                }
              >
                {m.personName && (
                  <Avatar
                    name={m.personName}
                    avatar={m.personAvatar}
                    icon={m.personIcon}
                    color={m.personColor}
                    size={34}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-text">
                    {m.title || "Без названия"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[12px] text-faint">
                    {m.personName && (
                      <span className="truncate">{m.personName}</span>
                    )}
                    {m.location && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{m.location}</span>
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[12px] tabular text-muted">
                  {meetingDate(m.date)}
                </span>
              </Link>
            ))}
          </div>
        </section>
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
