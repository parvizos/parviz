"use client";

import { useState, type ReactNode } from "react";
import { Menu, Plus, Search } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { Sidebar } from "./Sidebar";
import { useUi } from "./ui-context";

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
  children,
}: {
  counts: { inbox: number; today: number };
  areas: AreaLink[];
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const { openNewTask, openCommand } = useUi();

  return (
    <div className="min-h-full">
      {/* Меню на десктопе */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border lg:block">
        <Sidebar counts={counts} areas={areas} />
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
              onNavigate={() => setDrawer(false)}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        {/* Верхняя панель — только на телефоне */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-border bg-surface/85 px-2 backdrop-blur lg:hidden">
          <IconButton label="Меню" onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </IconButton>
          <div className="flex-1 px-1 font-semibold text-text">ParvizOS</div>
          <IconButton label="Поиск" onClick={openCommand}>
            <Search size={19} />
          </IconButton>
          <IconButton label="Новая задача" onClick={() => openNewTask()}>
            <Plus size={21} />
          </IconButton>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
