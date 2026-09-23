"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CloudDownload,
  CloudOff,
  Loader2,
} from "lucide-react";
import { useToast } from "./toast";
import { cn } from "@/lib/cn";
import type { TrackMeta } from "@/lib/music-queries";
import {
  downloadTrack,
  removeDownload,
  subscribeDownloads,
  downloadedIdsSync,
  ensureDownloadedIds,
} from "@/lib/track-store";

/** Множество id скачанных треков — реактивно обновляется на изменения. */
export function useDownloadedIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => downloadedIdsSync());
  useEffect(() => {
    let mounted = true;
    ensureDownloadedIds().then((s) => {
      if (mounted) setIds(new Set(s));
    });
    const unsub = subscribeDownloads(() =>
      setIds(new Set(downloadedIdsSync())),
    );
    return () => {
      mounted = false;
      unsub();
    };
  }, []);
  return ids;
}

/** Онлайн ли устройство сейчас. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/**
 * Кнопка «скачать для оффлайна». Состояния: качается, скачано (клик — удалить),
 * не скачано (клик — скачать), офлайн и не скачано (нельзя).
 */
export function TrackDownloadButton({
  track,
  online,
  size = 17,
  alwaysVisible = false,
  className,
}: {
  track: TrackMeta;
  online: boolean;
  size?: number;
  alwaysVisible?: boolean;
  className?: string;
}) {
  const ids = useDownloadedIds();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const downloaded = ids.has(track.id);

  const base =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors";
  const reveal =
    alwaysVisible || downloaded || busy
      ? ""
      : "opacity-0 group-hover:opacity-100";

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    if (downloaded) {
      await removeDownload(track.id);
      return;
    }
    if (!online) {
      toast({ title: "Нет сети", body: "Скачать трек можно онлайн." });
      return;
    }
    setBusy(true);
    try {
      await downloadTrack(track);
      toast({ title: "Скачано для оффлайна", body: track.title });
    } catch {
      toast({ title: "Не удалось скачать", body: track.title });
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <span className={cn(base, "text-accent", className)} aria-label="Скачивается">
        <Loader2 size={size} className="animate-spin" />
      </span>
    );
  }
  if (downloaded) {
    return (
      <button
        onClick={onClick}
        aria-label="Удалить загрузку"
        title="Скачано · нажми, чтобы удалить"
        className={cn(base, "text-success hover:text-danger", reveal, className)}
      >
        <CheckCircle2 size={size} />
      </button>
    );
  }
  if (!online) {
    return (
      <span
        className={cn(base, "text-faint", reveal, className)}
        aria-label="Недоступно офлайн"
        title="Нет сети"
      >
        <CloudOff size={size} />
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      aria-label="Скачать для офлайна"
      title="Скачать для офлайна"
      className={cn(base, "text-muted hover:text-accent", reveal, className)}
    >
      <CloudDownload size={size} />
    </button>
  );
}
