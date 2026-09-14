import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getOrganization, getOrganizationPeople } from "@/lib/queries";
import { todayISO } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import { ORG_KIND_META } from "@/lib/person-format";
import { PersonCard } from "@/components/app/crm-items";
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

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await getOrganization(id);
  if (!org) notFound();

  const people = await getOrganizationPeople(id);
  const today = todayISO();
  const meta = ORG_KIND_META[org.kind];
  const url = org.url
    ? org.url.startsWith("http")
      ? org.url
      : `https://${org.url}`
    : null;

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

      {org.note && (
        <p className="mb-6 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-[14px] leading-relaxed text-muted">
          {org.note}
        </p>
      )}

      <section>
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Люди
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
