"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useUi } from "./ui-context";
import { usePlayer } from "./player-context";
import { MiniPlayer } from "./MiniPlayer";
import { NowPlaying } from "./NowPlaying";
import { DemoBanner } from "./DemoBanner";
import type { PageTreeNode } from "@/lib/queries";

type AreaLink = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  openTaskCount: number;
};

export function AppShell({
  counts,
  areas,
  pages,
  demo = false,
  children,
}: {
  counts: { inbox: number; today: number };
  areas: AreaLink[];
  pages: PageTreeNode[];
  demo?: boolean;
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const { openNewTask, openCommand, focusMode } = useUi();
  const { current: playing } = usePlayer();
  const pathname = usePathname();

  return (
    <div
      className="min-h-full"
      style={focusMode ? ({ "--nav-h": "0px" } as CSSProperties) : undefined}
    >
      {/* Меню на десктопе */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border lg:block",
          focusMode && "lg:hidden",
        )}
      >
        <Sidebar counts={counts} areas={areas} pages={pages} />
      </aside>

      {/* Выезжающее меню на телефоне */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 animate-overlay-in bg-black/40"
            onClick={() => setDrawer(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[82vw] animate-panel-in border-r border-border shadow-[var(--shadow-lg)]">
            <Sidebar
              counts={counts}
              areas={areas}
              pages={pages}
              onNavigate={() => setDrawer(false)}
            />
          </aside>
        </div>
      )}

      <div className={cn(focusMode ? "" : "lg:pl-[264px]")}>
        {demo && <DemoBanner />}
        {/* Верхняя панель — только на телефоне */}
        <header
          className={cn(
            "sticky top-0 z-20 border-b border-border bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden",
            focusMode && "hidden",
          )}
        >
          <div className="flex h-14 items-center gap-1 px-3">
            <div className="flex-1 font-semibold text-text">ParvizOS</div>
            <IconButton label="Поиск" onClick={openCommand}>
              <Search size={19} />
            </IconButton>
            <IconButton label="Новая задача" onClick={() => openNewTask()}>
              <Plus size={21} />
            </IconButton>
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-9",
            playing
              ? "pb-[calc(var(--nav-h)+7rem)]"
              : "pb-[calc(var(--nav-h)+2rem)]",
          )}
        >
          <div key={pathname} className="animate-page-in">
            {children}
          </div>
        </main>
      </div>

      {/* Нижняя навигация на телефоне */}
      {!focusMode && (
        <MobileNav todayCount={counts.today} onMore={() => setDrawer(true)} />
      )}

      {/* Плеер: мини-панель снизу и полноэкранный режим — живут над всем */}
      <MiniPlayer />
      <NowPlaying />
    </div>
  );
}
