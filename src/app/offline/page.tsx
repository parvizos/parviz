import { WifiOff } from "lucide-react";

export const metadata = { title: "Офлайн" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <WifiOff size={28} />
      </div>
      <h1 className="text-[20px] font-semibold text-text">Нет сети</h1>
      <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-muted">
        Эта страница ещё не открывалась офлайн. Экраны, которые ты уже смотрел,
        работают без сети — а новые задачи и заметки сохранятся и
        синхронизируются, когда сеть вернётся.
      </p>
      <a
        href="/segodnya"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover"
      >
        На «Сегодня»
      </a>
    </div>
  );
}
