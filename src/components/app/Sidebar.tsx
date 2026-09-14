"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Inbox,
  CalendarClock,
  FolderKanban,
  Layers,
  CalendarRange,
  BookText,
  Receipt,
  CreditCard,
  Tags,
  Plus,
  Wallet,
  Users,
  Building2,
  GraduationCap,
  NotebookPen,
  Sun,
  Moon,
  LogOut,
  Command,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { logout } from "@/lib/auth-actions";
import { areaColor } from "@/lib/task-format";
import { useUi } from "./ui-context";

type Counts = { inbox: number; today: number };
type AreaLink = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  openTaskCount: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "today" | "inbox";
};

const MAIN: NavItem[] = [
  { href: "/segodnya", label: "Сегодня", icon: CalendarDays, badge: "today" },
  { href: "/vhodyaschie", label: "Входящие", icon: Inbox, badge: "inbox" },
  { href: "/predstoyaschee", label: "Предстоящее", icon: CalendarClock },
  { href: "/dnevnik", label: "Ежедневник", icon: NotebookPen },
  { href: "/proekty", label: "Проекты", icon: FolderKanban },
  { href: "/sfery", label: "Сферы", icon: Layers },
];

const STUDY: NavItem[] = [
  { href: "/raspisanie", label: "Расписание", icon: CalendarRange },
  { href: "/predmety", label: "Предметы", icon: GraduationCap },
  { href: "/konspekty", label: "Конспекты", icon: BookText },
];

const FINANCE: NavItem[] = [
  { href: "/finansy", label: "Обзор", icon: Wallet },
  { href: "/finansy/operacii", label: "Операции", icon: Receipt },
  { href: "/finansy/scheta", label: "Счета", icon: CreditCard },
  { href: "/finansy/kategorii", label: "Категории", icon: Tags },
];

const PEOPLE: NavItem[] = [
  { href: "/lyudi", label: "Люди", icon: Users },
  { href: "/organizacii", label: "Организации", icon: Building2 },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  counts,
  areas,
  onNavigate,
}: {
  counts: Counts;
  areas: AreaLink[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { openNewTask, openNewArea, openCommand, toggleTheme, theme } = useUi();

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Бренд */}
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent text-[15px] font-bold text-accent-fg">
          P
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-semibold leading-none text-text">
            ParvizOS
          </div>
          <div className="mt-0.5 text-[11px] text-faint">личная система</div>
        </div>
      </div>

      <div className="px-3 pt-4">
        <button
          onClick={() => {
            openNewTask();
            onNavigate?.();
          }}
          className="flex h-10 w-full items-center gap-2 rounded-xl bg-accent px-3.5 text-sm font-medium text-accent-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover"
        >
          <Plus size={17} />
          Новая задача
        </button>
        <button
          onClick={openCommand}
          className="mt-2 flex h-9 w-full items-center gap-2 rounded-xl border border-border px-3 text-[13px] text-muted transition-colors hover:bg-surface-2"
        >
          <Command size={15} />
          Быстрый поиск
          <span className="ml-auto flex items-center gap-0.5 text-faint">
            <kbd className="rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">
              ⌘K
            </kbd>
          </span>
        </button>
      </div>

      {/* Навигация */}
      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-0.5">
          {MAIN.map((item) => {
            const active = isActive(pathname, item.href);
            const badge =
              item.badge === "today"
                ? counts.today
                : item.badge === "inbox"
                  ? counts.inbox
                  : 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors",
                    active
                      ? "bg-accent-soft font-medium text-accent-soft-text"
                      : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <item.icon size={17} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span
                      className={cn(
                        "min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular",
                        active
                          ? "bg-accent text-accent-fg"
                          : "bg-surface-3 text-muted",
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Сферы */}
        <div className="mt-6 flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Сферы
          </span>
          <button
            onClick={openNewArea}
            aria-label="Новая сфера"
            className="text-faint transition-colors hover:text-text"
          >
            <Plus size={15} />
          </button>
        </div>
        <ul className="mt-1 flex flex-col gap-0.5">
          {areas.length === 0 && (
            <li className="px-3 py-1.5 text-[13px] text-faint">
              Пока нет сфер
            </li>
          )}
          {areas.map((a) => {
            const href = `/sfery/${a.id}`;
            const active = isActive(pathname, href);
            return (
              <li key={a.id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors",
                    active
                      ? "bg-surface-2 font-medium text-text"
                      : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  {a.icon ? (
                    <span className="text-[15px] leading-none">{a.icon}</span>
                  ) : (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: areaColor(a.color) }}
                    />
                  )}
                  <span className="flex-1 truncate">{a.name}</span>
                  {a.openTaskCount > 0 && (
                    <span className="text-[11px] text-faint tabular">
                      {a.openTaskCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Учёба */}
        <div className="mt-6 px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Учёба
          </span>
        </div>
        <ul className="mt-1 flex flex-col gap-0.5">
          {STUDY.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors",
                    active
                      ? "bg-accent-soft font-medium text-accent-soft-text"
                      : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <item.icon size={17} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Финансы */}
        <div className="mt-6 px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Финансы
          </span>
        </div>
        <ul className="mt-1 flex flex-col gap-0.5">
          {FINANCE.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/finansy" && isActive(pathname, item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors",
                    active
                      ? "bg-accent-soft font-medium text-accent-soft-text"
                      : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <item.icon size={17} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Люди */}
        <div className="mt-6 px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Люди
          </span>
        </div>
        <ul className="mt-1 flex flex-col gap-0.5">
          {PEOPLE.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors",
                    active
                      ? "bg-accent-soft font-medium text-accent-soft-text"
                      : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <item.icon size={17} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Низ */}
      <div className="flex items-center gap-1 border-t border-border px-3 py-2.5">
        <button
          onClick={toggleTheme}
          className="flex h-9 flex-1 items-center gap-2 rounded-xl px-3 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        </button>
        <Link
          href="/nastroiki"
          onClick={onNavigate}
          aria-label="Настройки"
          title="Настройки"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
            isActive(pathname, "/nastroiki")
              ? "bg-accent-soft text-accent-soft-text"
              : "text-muted hover:bg-surface-2 hover:text-text",
          )}
        >
          <Settings size={16} />
        </Link>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Выйти"
            title="Выйти"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
