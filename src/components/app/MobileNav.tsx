"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  GraduationCap,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string[];
  badge?: number;
};

/**
 * Нижняя навигация для телефона — быстрый доступ к ключевым разделам,
 * чтобы не лазить каждый раз в меню. «Ещё» открывает полный дровер.
 */
export function MobileNav({
  todayCount,
  onMore,
}: {
  todayCount: number;
  onMore: () => void;
}) {
  const pathname = usePathname();

  const items: Item[] = [
    { href: "/obzor", label: "Обзор", icon: LayoutDashboard },
    { href: "/segodnya", label: "Сегодня", icon: CalendarDays, badge: todayCount },
    { href: "/finansy", label: "Финансы", icon: Wallet, match: ["/finansy"] },
    {
      href: "/raspisanie",
      label: "Учёба",
      icon: GraduationCap,
      match: [
        "/raspisanie",
        "/predmety",
        "/otsenki",
        "/sessiya",
        "/uchyoba",
        "/konspekty",
        "/semestry",
        "/focus",
        "/urok",
      ],
    },
  ];

  const isActive = (it: Item) => {
    const ms = it.match ?? [it.href];
    return ms.some((m) => pathname === m || pathname.startsWith(m + "/"));
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-14 max-w-md items-stretch">
        {items.map((it) => {
          const active = isActive(it);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="group flex flex-1 flex-col items-center justify-center gap-1 transition-transform active:scale-90"
            >
              <span
                className={cn(
                  "flex h-8 items-center justify-center rounded-full px-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  active ? "bg-accent-soft" : "bg-transparent",
                )}
              >
                <span className="relative">
                  <Icon
                    size={21}
                    className={cn(
                      "transition-colors",
                      active ? "text-accent" : "text-muted",
                    )}
                  />
                  {it.badge && it.badge > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-accent-fg">
                      {it.badge > 99 ? "99+" : it.badge}
                    </span>
                  ) : null}
                </span>
              </span>
              <span
                className={cn(
                  "text-[10.5px] font-medium transition-colors",
                  active ? "text-accent" : "text-faint",
                )}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-label="Ещё"
          className="group flex flex-1 flex-col items-center justify-center gap-1 transition-transform active:scale-90"
        >
          <span className="flex h-8 items-center justify-center rounded-full px-5">
            <Menu size={21} className="text-muted" />
          </span>
          <span className="text-[10.5px] font-medium text-faint">Ещё</span>
        </button>
      </div>
    </nav>
  );
}
