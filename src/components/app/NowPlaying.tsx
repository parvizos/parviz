"use client";

import { useEffect } from "react";
import {
  ChevronDown,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "./player-context";
import { TrackCover } from "./TrackCover";
import { SeekBar } from "./SeekBar";
import { TrackDownloadButton, useOnline } from "./TrackDownloadButton";
import { formatTime } from "@/lib/music-format";
import { cn } from "@/lib/cn";

export function NowPlaying() {
  const p = usePlayer();
  const online = useOnline();

  // Закрытие по Esc.
  useEffect(() => {
    if (!p.expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") p.setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.expanded, p]);

  if (!p.expanded || !p.current) return null;

  const track = p.current;
  const total = p.duration || track.duration || 0;
  const VolIcon =
    p.muted || p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up overflow-hidden">
      {/* Фон из обложки — размытый, для «живого» цвета */}
      {track.coverImageId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/images/${track.coverImageId}`}
          alt=""
          className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/40 to-bg" />
      )}
      <div className="absolute inset-0 bg-bg/85 backdrop-blur-2xl" />

      {/* Содержимое */}
      <div className="relative mx-auto flex h-full w-full max-w-lg flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4 sm:px-8">
        {/* Шапка */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => p.setExpanded(false)}
            aria-label="Свернуть"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ChevronDown size={24} />
          </button>
          <span className="text-[12px] font-semibold uppercase tracking-wider text-faint">
            Сейчас играет
          </span>
          <TrackDownloadButton
            track={track}
            online={online}
            size={20}
            alwaysVisible
            className="h-10 w-10"
          />
        </div>

        {/* Обложка */}
        <div className="flex flex-1 items-center justify-center py-6">
          <TrackCover
            coverImageId={track.coverImageId}
            size={320}
            rounded="rounded-3xl"
            className="aspect-square h-auto w-full max-w-[min(72vw,320px)] shadow-[var(--shadow-lg)]"
          />
        </div>

        {/* Мета */}
        <div className="min-w-0">
          <h2 className="truncate text-[22px] font-semibold text-text">
            {track.title || "Без названия"}
          </h2>
          <p className="mt-0.5 truncate text-[15px] text-muted">
            {track.artist || "Неизвестный исполнитель"}
            {track.album ? ` · ${track.album}` : ""}
          </p>
        </div>

        {/* Перемотка */}
        <div className="mt-5">
          <SeekBar value={p.currentTime} max={total} onSeek={p.seek} ariaLabel="Перемотка" />
          <div className="mt-1.5 flex justify-between text-[12px] tabular text-faint">
            <span>{formatTime(p.currentTime)}</span>
            <span>-{formatTime(Math.max(0, total - p.currentTime))}</span>
          </div>
        </div>

        {/* Управление */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={p.toggleShuffle}
            aria-label="Перемешать"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
              p.shuffle
                ? "text-accent"
                : "text-muted hover:text-text",
            )}
          >
            <Shuffle size={20} />
          </button>
          <button
            onClick={p.prev}
            aria-label="Предыдущий"
            className="flex h-12 w-12 items-center justify-center rounded-full text-text transition-transform active:scale-90"
          >
            <SkipBack size={28} className="fill-current" />
          </button>
          <button
            onClick={p.toggle}
            aria-label={p.isPlaying ? "Пауза" : "Играть"}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[var(--shadow-md)] transition-transform hover:bg-accent-hover active:scale-95"
          >
            {p.loading ? (
              <Loader2 size={28} className="animate-spin" />
            ) : p.isPlaying ? (
              <Pause size={28} className="fill-current" />
            ) : (
              <Play size={28} className="translate-x-[2px] fill-current" />
            )}
          </button>
          <button
            onClick={p.next}
            aria-label="Следующий"
            className="flex h-12 w-12 items-center justify-center rounded-full text-text transition-transform active:scale-90"
          >
            <SkipForward size={28} className="fill-current" />
          </button>
          <button
            onClick={p.cycleRepeat}
            aria-label="Повтор"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
              p.repeat !== "off" ? "text-accent" : "text-muted hover:text-text",
            )}
          >
            {p.repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>

        {/* Громкость */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={p.toggleMute}
            aria-label="Звук"
            className="text-muted transition-colors hover:text-text"
          >
            <VolIcon size={19} />
          </button>
          <SeekBar
            value={p.muted ? 0 : p.volume}
            max={1}
            onSeek={p.setVolume}
            onScrub={p.setVolume}
            ariaLabel="Громкость"
            className="flex-1"
          />
        </div>

        {/* Очередь */}
        {p.queue.length > 1 && (
          <details className="group mt-4 rounded-2xl border border-border bg-surface/70">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-medium text-muted [&::-webkit-details-marker]:hidden">
              <ListMusic size={16} />
              Очередь · {p.queue.length}
            </summary>
            <div className="max-h-[34vh] overflow-y-auto px-2 pb-2">
              {p.queue.map((t, i) => {
                const active = p.isCurrent(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => p.jumpTo(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                      active ? "bg-accent-soft" : "hover:bg-surface-2",
                    )}
                  >
                    <TrackCover coverImageId={t.coverImageId} size={38} />
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-[13.5px]",
                          active
                            ? "font-medium text-accent-soft-text"
                            : "text-text",
                        )}
                      >
                        {t.title || "Без названия"}
                      </div>
                      <div className="truncate text-[12px] text-faint">
                        {t.artist || "Неизвестный исполнитель"}
                      </div>
                    </div>
                    {active && p.isPlaying && <EqBars />}
                  </button>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/** Мини-эквалайзер — три «пляшущих» столбика у активного трека. */
function EqBars() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      <span className="h-full w-0.5 origin-bottom animate-[eq_0.9s_ease-in-out_infinite] rounded-full bg-accent" />
      <span className="h-full w-0.5 origin-bottom animate-[eq_0.9s_ease-in-out_infinite_0.15s] rounded-full bg-accent" />
      <span className="h-full w-0.5 origin-bottom animate-[eq_0.9s_ease-in-out_infinite_0.3s] rounded-full bg-accent" />
    </span>
  );
}
