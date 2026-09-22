"use client";

import {
  ChevronUp,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "./player-context";
import { useUi } from "./ui-context";
import { TrackCover } from "./TrackCover";
import { SeekBar } from "./SeekBar";
import { formatTime } from "@/lib/music-format";
import { cn } from "@/lib/cn";

export function MiniPlayer() {
  const p = usePlayer();
  const { focusMode } = useUi();
  if (!p.current) return null;

  const total = p.duration || p.current.duration || 0;
  const VolIcon = p.muted || p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-30 left-0",
        focusMode ? "" : "lg:left-[264px]",
      )}
    >
      <div className="border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        {/* Полоса прогресса во всю ширину */}
        <SeekBar
          thin
          value={p.currentTime}
          max={total}
          onSeek={p.seek}
          ariaLabel="Перемотка"
          className="px-0"
        />

        <div className="flex h-16 items-center gap-3 px-3 sm:px-4">
          {/* Обложка + название → раскрыть */}
          <button
            onClick={() => p.setExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label="Открыть плеер"
          >
            <TrackCover
              coverImageId={p.current.coverImageId}
              size={44}
              className="shadow-[var(--shadow-sm)]"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium text-text">
                {p.current.title || "Без названия"}
              </div>
              <div className="truncate text-[12.5px] text-muted">
                {p.current.artist || "Неизвестный исполнитель"}
              </div>
            </div>
          </button>

          {/* Управление */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={p.prev}
              aria-label="Предыдущий"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text sm:flex"
            >
              <SkipBack size={19} className="fill-current" />
            </button>
            <button
              onClick={p.toggle}
              aria-label={p.isPlaying ? "Пауза" : "Играть"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[var(--shadow-sm)] transition-transform hover:bg-accent-hover active:scale-95"
            >
              {p.loading ? (
                <Loader2 size={19} className="animate-spin" />
              ) : p.isPlaying ? (
                <Pause size={19} className="fill-current" />
              ) : (
                <Play size={19} className="translate-x-[1px] fill-current" />
              )}
            </button>
            <button
              onClick={p.next}
              aria-label="Следующий"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <SkipForward size={19} className="fill-current" />
            </button>
          </div>

          {/* Время + громкость (десктоп) */}
          <div className="ml-1 hidden items-center gap-3 lg:flex">
            <span className="text-[12px] tabular text-faint">
              {formatTime(p.currentTime)} / {formatTime(total)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={p.toggleMute}
                aria-label="Звук"
                className="text-muted transition-colors hover:text-text"
              >
                <VolIcon size={18} />
              </button>
              <SeekBar
                value={p.muted ? 0 : p.volume}
                max={1}
                onSeek={p.setVolume}
                onScrub={p.setVolume}
                ariaLabel="Громкость"
                className="w-20"
              />
            </div>
          </div>

          <button
            onClick={() => p.setExpanded(true)}
            aria-label="На весь экран"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ChevronUp size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
