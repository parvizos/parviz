import { asc, desc, eq, sql } from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { tracks } from "@/db/schema";

/** Трек для интерфейса (без пути к файлу — аудио отдаётся через роут). */
export type TrackMeta = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;
  mime: string;
  size: number;
  coverImageId: string | null;
  favorite: boolean;
  position: number;
  playCount: number;
};

function toMeta(r: typeof tracks.$inferSelect): TrackMeta {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    album: r.album,
    duration: r.duration,
    mime: r.mime,
    size: r.size,
    coverImageId: r.coverImageId,
    favorite: r.favorite,
    position: r.position,
    playCount: r.playCount,
  };
}

/** Вся фонотека, недавно добавленные — сверху. */
export async function getTracks(): Promise<TrackMeta[]> {
  await schemaReady();
  const rows = await db
    .select()
    .from(tracks)
    .orderBy(desc(tracks.createdAt), asc(tracks.position));
  return rows.map(toMeta);
}

export async function getTrackCount(): Promise<number> {
  await schemaReady();
  const [row] = await db
    .select({ c: sql<number>`count(*)` })
    .from(tracks);
  return Number(row?.c ?? 0);
}

/** Следующая позиция в конце списка (для добавления новых треков). */
export async function nextTrackPosition(): Promise<number> {
  await schemaReady();
  const [row] = await db
    .select({ m: sql<number>`coalesce(max(${tracks.position}), -1)` })
    .from(tracks);
  return Number(row?.m ?? -1) + 1;
}

/** Треки, чьё аудио ещё лежит на диске сервера (для переноса в облако). */
export async function getDiskStoredTracks(): Promise<
  { id: string; title: string }[]
> {
  await schemaReady();
  return db
    .select({ id: tracks.id, title: tracks.title })
    .from(tracks)
    .where(eq(tracks.storage, "disk"))
    .orderBy(asc(tracks.createdAt));
}
