"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { RichEditor as RichEditorImpl } from "./RichEditor";
import { cn } from "@/lib/cn";

type RichEditorProps = ComponentProps<typeof RichEditorImpl>;

// Пока грузится настоящий редактор — показываем аккуратный скелет вместо
// пустоты: без прыжка вёрстки и мигания. Разметка статична и одинакова на
// сервере и клиенте, так что гидрация не ругается.
function RichEditorSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="mb-3 flex flex-wrap items-center gap-0.5 border-b border-border pb-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="h-8 w-8 rounded-lg bg-surface-2" />
        ))}
      </div>
      <div className={cn("flex flex-col gap-3 pt-1", "min-h-[30vh]")}>
        <div className="h-4 w-2/3 rounded bg-surface-2" />
        <div className="h-4 w-full rounded bg-surface-2" />
        <div className="h-4 w-11/12 rounded bg-surface-2" />
        <div className="h-4 w-4/5 rounded bg-surface-2" />
      </div>
    </div>
  );
}

// Редактор на TipTap/ProseMirror — самый тяжёлый кусок клиентского бандла
// (~155 КБ gz) и не нужен для первой отрисовки: страница сущности показывает
// заголовок, поля и связи мгновенно, а «База знаний» догружается следом.
// Грузим его лениво и только на клиенте, чтобы этот вес не тянулся на все
// 11 экранов, где встречается редактор.
const LazyRichEditor = dynamic(
  () => import("./RichEditor").then((m) => m.RichEditor),
  { ssr: false, loading: () => <RichEditorSkeleton /> },
);

export function RichEditor(props: RichEditorProps) {
  return <LazyRichEditor {...props} />;
}

export { RichEditorSkeleton };
