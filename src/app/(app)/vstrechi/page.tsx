import Link from "next/link";
import { Handshake, SearchX, X } from "lucide-react";
import { getMeetingsFiltered, getPerson } from "@/lib/queries";
import { monthLabel } from "@/lib/dates";
import { MeetingCard, NewMeetingButton } from "@/components/app/meeting-items";
import { MeetingSearchBox } from "@/components/app/MeetingSearchBox";
import { Avatar } from "@/components/app/Avatar";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import type { MeetingWithPerson } from "@/lib/queries";

export const metadata = { title: "Встречи" };
export const dynamic = "force-dynamic";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function plMeetings(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "встреча";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "встречи";
  return "встреч";
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; person?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const person = sp.person?.trim() || undefined;

  const [meetings, personObj] = await Promise.all([
    getMeetingsFiltered({ q, personId: person }),
    person ? getPerson(person) : Promise.resolve(null),
  ]);

  // Группировка по месяцу (список уже отсортирован по дате убыв.).
  const groups: { month: string; items: MeetingWithPerson[] }[] = [];
  for (const m of meetings) {
    const key = m.date.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.month !== key) {
      g = { month: key, items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }

  return (
    <div>
      <PageHeader
        title="Встречи"
        subtitle="Большой конспект каждой встречи: с кем виделся, о чём говорили, что решили."
        actions={<NewMeetingButton personId={person} />}
      />

      {/* Фильтр по человеку */}
      {person && personObj && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface py-1 pl-1.5 pr-3 text-[13px] text-text">
            <Avatar
              name={personObj.name}
              avatar={personObj.avatar}
              icon={personObj.icon}
              color={personObj.color}
              size={22}
            />
            Встречи с {personObj.name}
          </span>
          <Link
            href="/vstrechi"
            className="inline-flex items-center gap-1 text-[12.5px] text-muted transition-colors hover:text-text"
          >
            <X size={13} /> сбросить
          </Link>
        </div>
      )}

      <div className="mb-4">
        <MeetingSearchBox initialQ={q} person={person} />
      </div>

      {meetings.length === 0 ? (
        q || person ? (
          <EmptyState
            icon={<SearchX size={22} />}
            title="Ничего не нашлось"
            description="Попробуй другое слово или сбрось фильтр."
          />
        ) : (
          <EmptyState
            icon={<Handshake size={22} />}
            title="Пока пусто"
            description="Сохраняй встречи как большие заметки: с кем виделся, о чём говорили, что решили и что дальше. Привяжешь человека — встреча появится и в его карточке."
            action={<NewMeetingButton />}
          />
        )
      ) : (
        <>
          <p className="mb-4 px-1 text-[12.5px] text-faint">
            {meetings.length} {plMeetings(meetings.length)}
          </p>
          <div className="flex flex-col gap-7">
            {groups.map((g) => (
              <section key={g.month}>
                <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
                  {cap(monthLabel(g.month))}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {g.items.map((m) => (
                    <MeetingCard key={m.id} meeting={m} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
