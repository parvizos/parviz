import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Cake, Building2 } from "lucide-react";
import {
  getPerson,
  getPersonTasks,
  getPersonTransactions,
} from "@/lib/queries";
import { todayISO, ruMonthDay } from "@/lib/dates";
import { areaColor } from "@/lib/task-format";
import { turningAge } from "@/lib/person-format";
import { TaskGroup } from "@/components/app/TaskGroup";
import { TransactionRow } from "@/components/app/finance-items";
import { EditPersonButton } from "@/components/app/crm-buttons";
import { NewTaskButton } from "@/components/app/buttons";

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

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();

  const [tasks, txs] = await Promise.all([
    getPersonTasks(id),
    getPersonTransactions(id),
  ]);
  const today = todayISO();
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status !== "open");
  const age = turningAge(person.birthday, today);

  const contacts = [
    person.phone && { icon: <Phone size={14} />, text: person.phone },
    person.email && { icon: <Mail size={14} />, text: person.email },
    person.birthday && {
      icon: <Cake size={14} />,
      text: `${ruMonthDay(person.birthday)}${age ? ` · ${age}` : ""}`,
    },
  ].filter(Boolean) as { icon: ReactNode; text: string }[];

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
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[20px] font-medium"
            style={{
              background: `color-mix(in oklab, ${areaColor(person.color)} 18%, transparent)`,
              color: areaColor(person.color),
            }}
          >
            {person.icon || initials(person.name)}
          </div>
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
          }}
        />
      </div>

      {contacts.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {contacts.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-[13px] text-muted"
            >
              {c.icon}
              {c.text}
            </span>
          ))}
        </div>
      )}

      {person.note && (
        <p className="mb-6 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-[14px] leading-relaxed text-muted">
          {person.note}
        </p>
      )}

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
        {open.length > 0 && (
          <TaskGroup tasks={open} today={today} />
        )}
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

      {/* Операции */}
      <section>
        <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Операции
        </h2>
        {txs.length > 0 ? (
          <div className="flex flex-col">
            {txs.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </div>
        ) : (
          <p className="px-1 text-[13.5px] text-faint">
            Нет операций с этим человеком.
          </p>
        )}
      </section>
    </div>
  );
}
