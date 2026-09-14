import Link from "next/link";
import { Users, Cake } from "lucide-react";
import { getPeopleWithOrg } from "@/lib/queries";
import { todayISO, ruMonthDayShort } from "@/lib/dates";
import { daysUntilBirthday } from "@/lib/person-format";
import { PersonCard } from "@/components/app/crm-items";
import { NewPersonButton } from "@/components/app/crm-buttons";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Люди" };
export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const today = todayISO();
  const people = await getPeopleWithOrg();

  const birthdays = people
    .map((p) => ({ p, d: daysUntilBirthday(p.birthday, today) }))
    .filter((x): x is { p: (typeof people)[number]; d: number } => x.d !== null && x.d <= 30)
    .sort((a, b) => a.d - b.d);

  return (
    <div>
      <PageHeader
        title="Люди"
        subtitle="Твои контакты: кто, где учится или работает, и что вы вместе делаете."
        actions={<NewPersonButton />}
      />

      {birthdays.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
            <Cake size={13} /> Скоро дни рождения
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {birthdays.map(({ p, d }) => (
              <Link
                key={p.id}
                href={`/lyudi/${p.id}`}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 transition-colors hover:border-border-strong hover:bg-surface-2"
              >
                <span className="text-[15px]">{p.icon || "🎂"}</span>
                <div>
                  <div className="text-[13px] font-medium text-text">
                    {p.name}
                  </div>
                  <div className="text-[12px] text-muted">
                    {d === 0
                      ? "сегодня"
                      : `${ruMonthDayShort(p.birthday!)} · через ${d} дн.`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {people.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} today={today} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users size={22} />}
          title="Пока никого"
          description="Добавь людей — научрука, одногруппников, друзей. Их можно привязывать к задачам и тратам."
          action={<NewPersonButton />}
        />
      )}
    </div>
  );
}
