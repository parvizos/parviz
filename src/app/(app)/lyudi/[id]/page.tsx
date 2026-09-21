import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  Mail,
  Cake,
  Building2,
  Handshake,
  ListTodo,
  Clock,
} from "lucide-react";
import {
  getPerson,
  getPersonTasks,
  getPersonTransactions,
  getPersonMeetings,
  getAccountOptions,
  getBacklinks,
} from "@/lib/queries";
import { getDebts } from "@/lib/finance-queries";
import { todayISO, ruMonthDay, diffDays } from "@/lib/dates";
import {
  currentAge,
  pluralYears,
  daysUntilBirthday,
  turningAge,
  agoLabel,
} from "@/lib/person-format";
import { SOCIAL_META, parseSocials } from "@/lib/socials";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/app/Avatar";
import { SocialIcon } from "@/components/app/SocialIcon";
import { TaskGroup } from "@/components/app/TaskGroup";
import { TransactionRow } from "@/components/app/finance-items";
import { DebtCard, NewDebtButton } from "@/components/app/finance2-items";
import { MeetingCard, NewMeetingButton } from "@/components/app/meeting-items";
import { EditPersonButton } from "@/components/app/crm-buttons";
import { NewTaskButton } from "@/components/app/buttons";
import { EntityNotes } from "@/components/app/EntityNotes";
import { Backlinks } from "@/components/app/Backlinks";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPerson(id);
  return { title: p?.name ?? "Человек" };
}

const chip =
  "inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-[13px] transition-colors hover:border-border-strong hover:bg-surface-2";

function pl3(n: number, one: string, few: string, many: string): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return few;
  return many;
}

function FactTile({
  icon,
  value,
  label,
  tone = "accent",
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  tone?: "accent" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <div
        className={cn(
          "mb-2 flex h-8 w-8 items-center justify-center rounded-lg",
          tone === "warning"
            ? "bg-warning-soft text-warning"
            : "bg-accent-soft text-accent-soft-text",
        )}
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

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();

  const [tasks, txs, debts, meetings, accountOptions, backlinks] =
    await Promise.all([
      getPersonTasks(id),
      getPersonTransactions(id),
      getDebts({ personId: id }),
      getPersonMeetings(id),
      getAccountOptions(),
      getBacklinks(id),
    ]);
  const today = todayISO();
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status !== "open");
  const age = currentAge(person.birthday, today);
  const socials = parseSocials(person.socials);

  // Быстрые факты о человеке.
  const lastMeeting = meetings[0] ?? null;
  const daysSince = lastMeeting ? diffDays(lastMeeting.date, today) : null;
  const longNoContact = daysSince == null || daysSince > 30;
  const bdays = daysUntilBirthday(person.birthday, today);
  const turning = turningAge(person.birthday, today);

  const tiles: {
    icon: ReactNode;
    value: ReactNode;
    label: string;
    tone?: "accent" | "warning";
  }[] = [
    {
      icon: <Clock size={16} />,
      value: daysSince == null ? "—" : agoLabel(daysSince),
      label: daysSince == null ? "не виделись" : longNoContact ? "давно не виделись" : "виделись",
      tone: longNoContact ? "warning" : "accent",
    },
    {
      icon: <Handshake size={16} />,
      value: meetings.length,
      label: pl3(meetings.length, "встреча", "встречи", "встреч"),
    },
    {
      icon: <ListTodo size={16} />,
      value: open.length,
      label: pl3(open.length, "открытая задача", "открытые задачи", "открытых задач"),
    },
  ];
  if (bdays != null) {
    tiles.push({
      icon: <Cake size={16} />,
      value: bdays === 0 ? "сегодня!" : `через ${bdays} ${pl3(bdays, "день", "дня", "дней")}`,
      label: turning != null ? `исполнится ${turning}` : "день рождения",
      tone: bdays <= 14 ? "warning" : "accent",
    });
  }

  const contacts = [
    person.phone && {
      icon: <Phone size={14} />,
      text: person.phone,
      href: `tel:${person.phone}`,
    },
    person.email && {
      icon: <Mail size={14} />,
      text: person.email,
      href: `mailto:${person.email}`,
    },
    person.birthday && {
      icon: <Cake size={14} />,
      text: `${ruMonthDay(person.birthday)}${age != null ? ` · ${age} ${pluralYears(age)}` : ""}`,
    },
  ].filter(Boolean) as { icon: ReactNode; text: string; href?: string }[];

  return (
    <div>
      <Link
        href="/lyudi"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Люди
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <Avatar
            name={person.name}
            avatar={person.avatar}
            icon={person.icon}
            color={person.color}
            size={60}
          />
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-text">
              {person.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              {person.role && <span>{person.role}</span>}
              {person.organizationId && person.orgName && (
                <Link
                  href={`/organizacii/${person.organizationId}`}
                  className="inline-flex items-center gap-1 transition-colors hover:text-text"
                >
                  <Building2 size={13} />
                  {person.orgName}
                </Link>
              )}
              {age != null && (
                <span>
                  {age} {pluralYears(age)}
                </span>
              )}
            </div>
          </div>
        </div>
        <EditPersonButton
          person={{
            id: person.id,
            name: person.name,
            role: person.role,
            organizationId: person.organizationId,
            phone: person.phone,
            email: person.email,
            birthday: person.birthday,
            note: person.note,
            color: person.color,
            icon: person.icon,
            avatar: person.avatar,
            socials,
          }}
        />
      </div>

      {/* Быстрые факты */}
      <div
        className={cn(
          "mb-5 grid grid-cols-2 gap-3",
          tiles.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        {tiles.map((t, i) => (
          <FactTile key={i} {...t} />
        ))}
      </div>

      {(contacts.length > 0 || socials.length > 0) && (
        <div className="mb-5 flex flex-wrap gap-2">
          {contacts.map((c, i) =>
            c.href ? (
              <a key={i} href={c.href} className={`${chip} text-muted`}>
                {c.icon}
                {c.text}
              </a>
            ) : (
              <span key={i} className={`${chip} text-muted`}>
                {c.icon}
                {c.text}
              </span>
            ),
          )}
          {socials.map((s, i) => {
            const meta = SOCIAL_META[s.kind];
            return (
              <a
                key={`s-${i}`}
                href={meta.href(s.value)}
                target="_blank"
                rel="noreferrer"
                title={meta.label}
                className={`${chip} text-text`}
              >
                <span style={{ color: meta.color }}>
                  <SocialIcon kind={s.kind} size={15} />
                </span>
                {meta.display(s.value)}
              </a>
            );
          })}
        </div>
      )}

      {person.note && (
        <p className="mb-6 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-[14px] leading-relaxed text-muted">
          {person.note}
        </p>
      )}

      {/* Досье — свободное описание с фото */}
      <div className="mb-8">
        <EntityNotes
          kind="person"
          id={id}
          initialHTML={person.body ?? ""}
          title="Досье"
          placeholder="Всё об этом человеке: как познакомились, что важно помнить, фото… Перетащи фото или жми «/»."
        />
      </div>

      {/* Где упоминается */}
      <Backlinks items={backlinks} title="Упоминается" />

      {/* Встречи */}
      <section className="mb-8">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Встречи
            {meetings.length > 0 && (
              <span className="ml-2 text-faint tabular">{meetings.length}</span>
            )}
          </h2>
          <NewMeetingButton personId={id} variant="soft">
            Встреча
          </NewMeetingButton>
        </div>
        {meetings.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {meetings.slice(0, 4).map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </div>
            {meetings.length > 4 && (
              <Link
                href={`/vstrechi?person=${id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
              >
                Все встречи ({meetings.length})
                <ArrowRight size={15} />
              </Link>
            )}
          </>
        ) : (
          <p className="px-1 text-[13.5px] text-faint">
            Пока нет встреч с этим человеком.
          </p>
        )}
      </section>

      {/* Задачи */}
      <section className="mb-8">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Задачи
          </h2>
          <NewTaskButton prefill={{ personId: id }} variant="soft">
            Задача
          </NewTaskButton>
        </div>
        {open.length > 0 && <TaskGroup tasks={open} today={today} />}
        {done.length > 0 && (
          <TaskGroup
            title="Выполнено"
            count={done.length}
            tasks={done}
            today={today}
          />
        )}
        {tasks.length === 0 && (
          <p className="px-1 text-[13.5px] text-faint">
            Нет задач, связанных с этим человеком.
          </p>
        )}
      </section>

      {/* Долги */}
      {debts.length > 0 && (
        <section className="mb-8">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
              Долги
            </h2>
            <NewDebtButton personId={id} variant="soft">
              Долг
            </NewDebtButton>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {debts.map((d) => (
              <DebtCard key={d.id} debt={d} accountOptions={accountOptions} />
            ))}
          </div>
        </section>
      )}

      {/* Операции */}
      {txs.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            Операции
          </h2>
          <div className="flex flex-col">
            {txs.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
