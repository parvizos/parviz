import Link from "next/link";
import { Users, Cake, Handshake } from "lucide-react";
import { getPeopleWithStats, type PersonWithStats } from "@/lib/queries";
import { todayISO, ruMonthDayShort, diffDays } from "@/lib/dates";
import { daysUntilBirthday, pluralDays, agoLabel } from "@/lib/person-format";
import { parseSocials } from "@/lib/socials";
import { cn } from "@/lib/cn";
import { PersonCard } from "@/components/app/crm-items";
import { PeopleSearchBox } from "@/components/app/PeopleSearchBox";
import { CollapsibleChips, type FilterChip } from "@/components/app/CollapsibleChips";
import { NewPersonButton } from "@/components/app/crm-buttons";
import { Avatar } from "@/components/app/Avatar";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Люди" };
export const dynamic = "force-dynamic";

function plPeople(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "человек";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "человека";
  return "человек";
}

function MiniPerson({
  p,
  line,
  tone = "accent",
}: {
  p: PersonWithStats;
  line: string;
  tone?: "accent" | "warning";
}) {
  return (
    <Link
      href={`/lyudi/${p.id}`}
      className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <Avatar name={p.name} avatar={p.avatar} icon={p.icon} color={p.color} size={30} />
      <div>
        <div className="text-[13px] font-medium text-text">{p.name}</div>
        <div
          className={cn(
            "text-[12px]",
            tone === "warning" ? "text-warning" : "text-accent-soft-text",
          )}
        >
          {line}
        </div>
      </div>
    </Link>
  );
}

const SORTS: { key: string; label: string }[] = [
  { key: "name", label: "Имя" },
  { key: "recent", label: "Недавние" },
  { key: "birthday", label: "Дни рождения" },
  { key: "meetings", label: "Встречи" },
];

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; org?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const org = sp.org?.trim() || undefined;
  const sort = SORTS.some((s) => s.key === sp.sort) ? sp.sort! : "name";
  const today = todayISO();
  const all = await getPeopleWithStats();

  // Организации для чипов — из самих людей.
  const orgMap = new Map<string, { id: string; name: string; count: number }>();
  let noOrgCount = 0;
  for (const p of all) {
    if (p.organizationId && p.orgName) {
      const e = orgMap.get(p.organizationId);
      if (e) e.count += 1;
      else orgMap.set(p.organizationId, { id: p.organizationId, name: p.orgName, count: 1 });
    } else {
      noOrgCount += 1;
    }
  }
  const orgChips = [...orgMap.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );

  // Фильтрация.
  const ql = q.toLowerCase();
  const filtered = all.filter((p) => {
    if (org === "none" && p.organizationId) return false;
    if (org && org !== "none" && p.organizationId !== org) return false;
    if (ql) {
      const hay = `${p.name} ${p.role ?? ""} ${p.orgName ?? ""} ${parseSocials(
        p.socials,
      )
        .map((s) => s.value)
        .join(" ")}`.toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  });

  // Сортировка: избранные всегда наверху, затем по выбранному критерию.
  const sorted = [...filtered].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    if (sort === "recent") {
      return (b.lastMeetingDate ?? "").localeCompare(a.lastMeetingDate ?? "");
    }
    if (sort === "birthday") {
      const da = daysUntilBirthday(a.birthday, today) ?? 100000;
      const db = daysUntilBirthday(b.birthday, today) ?? 100000;
      return da - db || a.name.localeCompare(b.name);
    }
    if (sort === "meetings") {
      return b.meetingCount - a.meetingCount || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  const hasFilter = !!(q || org);

  // Виджеты-подсказки (только без фильтра).
  const birthdays = hasFilter
    ? []
    : all
        .map((p) => ({ p, d: daysUntilBirthday(p.birthday, today) }))
        .filter((x): x is { p: PersonWithStats; d: number } => x.d !== null && x.d <= 45)
        .sort((a, b) => a.d - b.d);

  const reconnect = hasFilter
    ? []
    : all
        .filter((p) => p.lastMeetingDate && diffDays(p.lastMeetingDate, today) > 30)
        .map((p) => ({ p, days: diffDays(p.lastMeetingDate!, today) }))
        .sort((a, b) => b.days - a.days)
        .slice(0, 6);

  function orgHref(nextOrg?: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextOrg) params.set("org", nextOrg);
    if (sort !== "name") params.set("sort", sort);
    const qs = params.toString();
    return `/lyudi${qs ? `?${qs}` : ""}`;
  }

  function sortHref(nextSort: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (org) params.set("org", org);
    if (nextSort !== "name") params.set("sort", nextSort);
    const qs = params.toString();
    return `/lyudi${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <PageHeader
        title="Люди"
        subtitle="Твои контакты: кто, где учится или работает, и что вы вместе делаете."
        actions={<NewPersonButton />}
      />

      {all.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Пока никого"
          description="Добавь людей — научрука, одногруппников, друзей. Их можно привязывать к задачам и тратам."
          action={<NewPersonButton />}
        />
      ) : (
        <>
          <div className="mb-4">
            <PeopleSearchBox initialQ={q} org={org} />
          </div>

          {birthdays.length > 0 && (
            <section className="mb-6">
              <div className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
                <Cake size={13} /> Скоро дни рождения
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {birthdays.map(({ p, d }) => (
                  <MiniPerson
                    key={p.id}
                    p={p}
                    line={
                      d === 0
                        ? "сегодня! 🎂"
                        : `${ruMonthDayShort(p.birthday!)} · через ${d} ${pluralDays(d)}`
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {reconnect.length > 0 && (
            <section className="mb-6">
              <div className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
                <Handshake size={13} /> Давно не виделись
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {reconnect.map(({ p, days }) => (
                  <MiniPerson
                    key={p.id}
                    p={p}
                    tone="warning"
                    line={`виделись ${agoLabel(days)}`}
                  />
                ))}
              </div>
            </section>
          )}

          {orgChips.length > 0 && (
            <div className="mb-4">
              <CollapsibleChips
                limit={10}
                chips={[
                  { key: "all", label: "Все", count: all.length, href: orgHref(), active: !org },
                  ...orgChips.map(
                    (o): FilterChip => ({
                      key: o.id,
                      label: o.name,
                      count: o.count,
                      href: orgHref(org === o.id ? undefined : o.id),
                      active: org === o.id,
                    }),
                  ),
                  ...(noOrgCount > 0
                    ? [
                        {
                          key: "none",
                          label: "Без организации",
                          count: noOrgCount,
                          href: orgHref(org === "none" ? undefined : "none"),
                          active: org === "none",
                        } as FilterChip,
                      ]
                    : []),
                ]}
              />
            </div>
          )}

          {sorted.length === 0 ? (
            <EmptyState
              icon={<Users size={22} />}
              title="Никого не нашлось"
              description="Попробуй другое имя или сбрось фильтр."
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-[12.5px] text-faint">
                  {sorted.length} {plPeople(sorted.length)}
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
                {sorted.map((p) => (
                  <PersonCard key={p.id} person={p} today={today} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
