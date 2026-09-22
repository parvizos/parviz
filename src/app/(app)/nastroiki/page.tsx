import { Download, Database, Clock, Table2, FileJson } from "lucide-react";
import { listBackups } from "@/lib/backup";
import { getServerHealth } from "@/lib/health";
import { appTimeZone } from "@/lib/dates";
import { currentWorkspace, demoAvailable } from "@/db";
import { ServerHealth } from "@/components/app/ServerHealth";
import { DemoSettings } from "@/components/app/DemoSettings";
import { DataRestore } from "@/components/app/DataRestore";
import { PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Настройки" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const backups = listBackups();
  const tz = appTimeZone();
  const health = await getServerHealth();

  return (
    <div>
      <PageHeader title="Настройки" subtitle="Здоровье сервера, данные, бэкапы." />

      {/* Здоровье сервера */}
      <section className="mb-8">
        <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Здоровье сервера
        </h2>
        <ServerHealth initial={health} />
      </section>

      {/* Демо-режим */}
      <section className="mb-8">
        <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Демо-режим
        </h2>
        <DemoSettings
          workspace={currentWorkspace()}
          available={demoAvailable}
        />
      </section>

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
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="/api/export"
                  download
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover"
                >
                  <Download size={16} />
                  Скачать базу (.db)
                </a>
                <a
                  href="/api/export/json"
                  download
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-text transition-colors hover:bg-surface-2 hover:border-border-strong"
                >
                  <FileJson size={16} />
                  Скачать всё (JSON)
                </a>
                <a
                  href="/api/export/finance"
                  download
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-text transition-colors hover:bg-surface-2 hover:border-border-strong"
                >
                  <Table2 size={16} />
                  Операции в CSV
                </a>
              </div>
              <p className="mt-2 text-[12px] text-faint">
                CSV открывается в Excel и Google Таблицах — все операции с валютой
                и привязками.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Автобэкапы и восстановление */}
      <section className="mb-8">
        <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Автобэкапы и восстановление
        </h2>
        <DataRestore backups={backups} />
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
