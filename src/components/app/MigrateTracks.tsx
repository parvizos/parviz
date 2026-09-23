"use client";

import { useState } from "react";
import { CheckCircle2, CloudUpload, Loader2 } from "lucide-react";
import { useToast } from "./toast";
import { Button } from "@/components/ui/Button";
import { migrateTrackToS3 } from "@/lib/music-actions";

type DiskTrack = { id: string; title: string };

/** Переносит старые треки с диска сервера в облако — по одному, с прогрессом. */
export function MigrateTracks({ tracks }: { tracks: DiskTrack[] }) {
  const { toast } = useToast();
  const [remaining, setRemaining] = useState<DiskTrack[]>(tracks);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const total = remaining.length;

  const run = async () => {
    if (running || total === 0) return;
    setRunning(true);
    setDone(0);
    const list = [...remaining];
    const stillDisk: DiskTrack[] = [];
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      try {
        const r = await migrateTrackToS3(list[i].id);
        if (r.ok) ok++;
        else stillDisk.push(list[i]);
      } catch {
        stillDisk.push(list[i]);
      }
      setDone(i + 1);
    }
    setRemaining(stillDisk);
    setRunning(false);
    toast({
      title: stillDisk.length
        ? `Перенесено ${ok}, не вышло ${stillDisk.length}`
        : `Перенесено ${ok} — всё в облаке`,
      body: stillDisk.length ? "Попробуй ещё раз чуть позже." : undefined,
    });
  };

  if (total === 0) {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-success">
        <CheckCircle2 size={15} /> Все треки в облаке
      </div>
    );
  }

  return (
    <div className="mt-3">
      <Button onClick={run} disabled={running} size="sm">
        {running ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <CloudUpload size={15} />
        )}
        {running ? `Переношу ${done}/${total}…` : `Перенести ${total} в облако`}
      </Button>
      {running && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.round((done / total) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
