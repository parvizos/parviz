import { Download, Database, Clock, ShieldCheck } from "lucide-react";
import { listBackups } from "@/lib/backup";
import { appTimeZone } from "@/lib/dates";
import { PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Настройки" };
export const dynamic = "force-dynamic";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}
function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function SettingsPage() {
  const backups = listBackups();
  const tz = appTimeZone();

  return (
    <div>
      <PageHeader title="Настройки" subtitle="Данные, бэкапы и окружение." />

      {/* Данные */}
      <section className="mb-8">
        <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Твои данные
        </h2>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-text">
              <Database size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-text">
                Вся система — один файл SQLite
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Задачи, конспекты (вместе с картинками), финансы, люди — всё
                в одной базе. Скачай полный консистентный снимок в любой момент
                и держи копию где хочешь.
              </p>
              <a
                href="/api/export"
                download
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover"
              >
                <Download size={16} />
                Скачать базу (.db)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Автобэкапы */}
      <section className="mb-8">
        <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Автобэкапы
        </h2>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-[13px] text-muted">
            <ShieldCheck size={16} className="text-success" />
            Каждый день сервер сам делает снимок в{" "}
            <span className="font-mono text-[12px]">data/backups</span>. Хранятся
            последние 7.
          </div>
          {backups.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border">
              {backups.map((b) => (
                <li
                  key={b.name}
                  className="flex items-center justify-between py-2.5 text-[13px]"
                >
                  <span className="font-mono text-text">{b.name}</span>
                  <span className="text-muted tabular">
                    {fmtDate(b.date)} · {fmtBytes(b.size)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-faint">
              Пока нет снимков — первый появится при следующем заходе в приложение.
            </p>
          )}
        </div>
      </section>

      {/* Окружение */}
      <section>
        <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Окружение
        </h2>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <Clock size={16} />
            Часовой пояс: <span className="font-medium text-text">{tz}</span>
            <span className="text-faint">
              — меняется переменной APP_TIMEZONE
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
