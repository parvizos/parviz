"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  MoreHorizontal,
  Music2,
  Pause,
  Pencil,
  Play,
  Search,
  Shuffle,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { usePlayer } from "./player-context";
import { TrackCover } from "./TrackCover";
import { useToast } from "./toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/music-format";
import type { TrackMeta } from "@/lib/music-queries";
import {
  renameTrack,
  toggleTrackFavorite,
  deleteTrack,
} from "@/lib/music-actions";
import {
  AUDIO_ACCEPT,
  isAudioFile,
  measureDuration,
  uploadTrack,
} from "@/lib/music-upload";

type UploadJob = { id: string; name: string; progress: number; error?: string };

export function MusicLibrary({ initialTracks }: { initialTracks: TrackMeta[] }) {
  const player = usePlayer();
  const { toast } = useToast();

  const [tracks, setTracks] = useState(initialTracks);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [query, setQuery] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [editing, setEditing] = useState<TrackMeta | null>(null);
  const [deleting, setDeleting] = useState<TrackMeta | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter((t) => {
      if (favOnly && !t.favorite) return false;
      if (!q) return true;
      return `${t.title} ${t.artist ?? ""} ${t.album ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [tracks, query, favOnly]);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const all = Array.from(fileList);
      const files = all.filter(isAudioFile);
      const skipped = all.length - files.length;
      if (skipped > 0)
        toast({
          title: `Пропущено: ${skipped}`,
          body: "Можно загружать только аудиофайлы.",
        });
      for (const file of files) {
        const jobId = crypto.randomUUID();
        setJobs((j) => [...j, { id: jobId, name: file.name, progress: 0 }]);
        try {
          const dur = await measureDuration(file);
          const track = await uploadTrack(file, dur, (frac) =>
            setJobs((j) =>
              j.map((x) => (x.id === jobId ? { ...x, progress: frac } : x)),
            ),
          );
          setTracks((t) => [track, ...t.filter((o) => o.id !== track.id)]);
          setJobs((j) => j.filter((x) => x.id !== jobId));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Ошибка";
          setJobs((j) =>
            j.map((x) => (x.id === jobId ? { ...x, error: msg } : x)),
          );
          toast({ title: "Не удалось загрузить", body: `${file.name}: ${msg}` });
        }
      }
    },
    [toast],
  );

  const onPick = () => inputRef.current?.click();

  const onRowPlay = (index: number, t: TrackMeta) => {
    if (player.isCurrent(t.id)) player.toggle();
    else player.playTracks(filtered, index);
  };

  const onToggleFav = async (t: TrackMeta) => {
    const nextFav = !t.favorite;
    setTracks((list) =>
      list.map((x) => (x.id === t.id ? { ...x, favorite: nextFav } : x)),
    );
    try {
      await toggleTrackFavorite(t.id, nextFav);
    } catch {
      setTracks((list) =>
        list.map((x) => (x.id === t.id ? { ...x, favorite: !nextFav } : x)),
      );
      toast({ title: "Не удалось обновить избранное" });
    }
  };

  const onConfirmDelete = async () => {
    if (!deleting) return;
    const t = deleting;
    setDeleting(null);
    setTracks((list) => list.filter((x) => x.id !== t.id));
    player.removeTrack(t.id);
    try {
      await deleteTrack(t.id);
      toast({ title: "Трек удалён", body: t.title });
    } catch {
      setTracks((list) => [t, ...list]);
      toast({ title: "Не удалось удалить трек" });
    }
  };

  // Перетаскивание файлов на страницу.
  const hasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types || []).includes("Files");

  const empty = tracks.length === 0 && jobs.length === 0;

  return (
    <div
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current++;
        setDragOver(true);
      }}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragOver(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className="relative"
    >
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <PageHeader
        title="Музыка"
        subtitle="Своя фонотека — грузи треки и слушай без стриминга."
        actions={
          <Button onClick={onPick} size="sm">
            <Upload size={16} /> Загрузить
          </Button>
        }
      />

      {empty ? (
        <button
          onClick={onPick}
          className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-16 text-center transition-colors hover:border-accent hover:bg-accent-soft/30"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-text">
            <Music2 size={26} />
          </span>
          <span className="text-[15px] font-medium text-text">
            Перетащи аудио сюда или нажми, чтобы выбрать
          </span>
          <span className="max-w-sm text-[13px] text-muted">
            MP3, FLAC, M4A, WAV и другие. Обложка и теги подтянутся сами.
          </span>
        </button>
      ) : (
        <>
          {/* Панель управления */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => player.playTracks(filtered, 0)}
              disabled={filtered.length === 0}
              size="sm"
            >
              <Play size={15} className="fill-current" /> Играть всё
            </Button>
            <Button
              onClick={() => player.playShuffled(filtered)}
              disabled={filtered.length === 0}
              variant="secondary"
              size="sm"
            >
              <Shuffle size={15} /> Перемешать
            </Button>
            <button
              onClick={() => setFavOnly((v) => !v)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium transition-colors",
                favOnly
                  ? "bg-accent-soft text-accent-soft-text"
                  : "border border-border text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Star size={14} className={favOnly ? "fill-current" : ""} />
              Избранное
            </button>

            <div className="relative ml-auto min-w-0">
              <Search
                size={15}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск…"
                className="h-8 w-40 rounded-[10px] border border-border bg-surface pl-8 pr-3 text-[13px] text-text outline-none transition-colors placeholder:text-faint focus:border-accent focus:w-52"
              />
            </div>
          </div>

          {/* Загрузки в процессе */}
          {jobs.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              {jobs.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  {j.error ? (
                    <X size={16} className="shrink-0 text-danger" />
                  ) : (
                    <Loader2 size={16} className="shrink-0 animate-spin text-accent" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-text">{j.name}</div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          j.error ? "bg-danger" : "bg-accent",
                        )}
                        style={{ width: `${j.error ? 100 : Math.round(j.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-[12px] text-faint">
                    {j.error ? "Ошибка" : `${Math.round(j.progress * 100)}%`}
                  </span>
                  {j.error && (
                    <button
                      onClick={() => setJobs((s) => s.filter((x) => x.id !== j.id))}
                      className="text-faint hover:text-text"
                      aria-label="Убрать"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Список треков */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Search size={20} />}
              title="Ничего не найдено"
              description={
                favOnly
                  ? "В избранном пока пусто — отметь любимые треки звёздочкой."
                  : "Попробуй изменить запрос."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {filtered.map((t, i) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  index={i}
                  active={player.isCurrent(t.id)}
                  playing={player.isCurrent(t.id) && player.isPlaying}
                  onPlay={() => onRowPlay(i, t)}
                  onToggleFav={() => onToggleFav(t)}
                  onEdit={() => setEditing(t)}
                  onDelete={() => setDeleting(t)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Оверлей при перетаскивании */}
      {dragOver && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-accent-soft/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-accent bg-surface/90 px-12 py-10 shadow-[var(--shadow-lg)]">
            <Upload size={34} className="text-accent" />
            <span className="text-[15px] font-medium text-text">
              Отпусти, чтобы загрузить
            </span>
          </div>
        </div>
      )}

      {/* Редактирование */}
      {editing && (
        <EditTrackModal
          track={editing}
          onClose={() => setEditing(null)}
          onSaved={(patch) => {
            const id = editing.id;
            setTracks((list) =>
              list.map((x) => (x.id === id ? { ...x, ...patch } : x)),
            );
            setEditing(null);
          }}
        />
      )}

      {/* Подтверждение удаления */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Удалить трек?"
        description={deleting?.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleting(null)}>
              Отмена
            </Button>
            <Button variant="danger" size="sm" onClick={onConfirmDelete}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          Файл и обложка будут удалены безвозвратно.
        </p>
      </Modal>
    </div>
  );
}

/* ── Строка трека ── */

function TrackRow({
  track,
  index,
  active,
  playing,
  onPlay,
  onToggleFav,
  onEdit,
  onDelete,
}: {
  track: TrackMeta;
  index: number;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
  onToggleFav: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onPlay}
      className={cn(
        "group flex cursor-pointer items-center gap-3 border-b border-border px-2.5 py-2 last:border-b-0 sm:px-3",
        active ? "bg-accent-soft/50" : "hover:bg-surface-2",
      )}
    >
      {/* Номер / обложка с кнопкой */}
      <div className="relative shrink-0">
        <TrackCover coverImageId={track.coverImageId} size={44} />
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 text-white transition-opacity",
            playing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {playing ? (
            <Pause size={18} className="fill-current" />
          ) : (
            <Play size={18} className="translate-x-[1px] fill-current" />
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[14px] font-medium",
            active ? "text-accent-soft-text" : "text-text",
          )}
        >
          {track.title || "Без названия"}
        </div>
        <div className="truncate text-[12.5px] text-muted">
          {track.artist || "Неизвестный исполнитель"}
          {track.album ? (
            <span className="hidden text-faint sm:inline"> · {track.album}</span>
          ) : null}
        </div>
      </div>

      <span className="hidden shrink-0 text-[12px] tabular text-faint sm:block">
        {formatTime(track.duration)}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav();
        }}
        aria-label={track.favorite ? "Убрать из избранного" : "В избранное"}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
          track.favorite
            ? "text-warning"
            : "text-faint opacity-0 hover:text-text group-hover:opacity-100",
        )}
      >
        <Star size={16} className={track.favorite ? "fill-current" : ""} />
      </button>

      <RowMenu onEdit={onEdit} onDelete={onDelete} />

      <span className="w-4 shrink-0 text-right text-[12px] tabular text-faint sm:hidden">
        {index + 1}
      </span>
    </div>
  );
}

/* ── Меню строки (изменить / удалить) ── */

function RowMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Действия"
        className="flex h-8 w-8 items-center justify-center rounded-full text-faint transition-colors hover:bg-surface-3 hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-20 w-40 animate-panel-in overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-[var(--shadow-lg)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-text transition-colors hover:bg-surface-2"
          >
            <Pencil size={15} className="text-muted" /> Изменить
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-danger transition-colors hover:bg-danger-soft"
          >
            <Trash2 size={15} /> Удалить
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Модалка редактирования тегов ── */

function EditTrackModal({
  track,
  onClose,
  onSaved,
}: {
  track: TrackMeta;
  onClose: () => void;
  onSaved: (patch: {
    title: string;
    artist: string | null;
    album: string | null;
  }) => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist ?? "");
  const [album, setAlbum] = useState(track.album ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const patch = {
      title: title.trim() || "Без названия",
      artist: artist.trim() || null,
      album: album.trim() || null,
    };
    setSaving(true);
    try {
      await renameTrack(track.id, patch);
      onSaved(patch);
    } catch {
      toast({ title: "Не удалось сохранить" });
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Изменить трек"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            Сохранить
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Название">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Исполнитель">
          <Input value={artist} onChange={(e) => setArtist(e.target.value)} />
        </Field>
        <Field label="Альбом">
          <Input value={album} onChange={(e) => setAlbum(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
