"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { rm } from "node:fs/promises";
import { db, schemaReady } from "@/db";
import { tracks, images } from "@/db/schema";
import { trackFilePath } from "@/lib/media";
import { s3Delete } from "@/lib/storage";
import { isAuthed } from "@/lib/session";

function revalidateMusic() {
  // Плеер и сайдбар живут в общем layout — обновляем его целиком.
  revalidatePath("/", "layout");
}

const editSchema = z.object({
  title: z.string().trim().max(300).optional(),
  artist: z.string().trim().max(300).nullable().optional(),
  album: z.string().trim().max(300).nullable().optional(),
});
export type TrackEdit = z.input<typeof editSchema>;

/** Переименовать/поправить теги трека вручную. */
export async function renameTrack(id: string, input: TrackEdit) {
  await schemaReady();
  const d = editSchema.parse(input);
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (d.title !== undefined) patch.title = d.title;
  if (d.artist !== undefined) patch.artist = d.artist?.trim() || null;
  if (d.album !== undefined) patch.album = d.album?.trim() || null;
  await db.update(tracks).set(patch).where(eq(tracks.id, id));
  revalidateMusic();
}

export async function toggleTrackFavorite(id: string, favorite: boolean) {
  await schemaReady();
  await db
    .update(tracks)
    .set({ favorite, updatedAt: new Date() })
    .where(eq(tracks.id, id));
  revalidateMusic();
}

/** Удаляет трек: строку, файл с диска и обложку из базы. */
export async function deleteTrack(id: string) {
  if (!(await isAuthed())) throw new Error("unauthorized");
  await schemaReady();
  const [row] = await db
    .select({
      ext: tracks.ext,
      storage: tracks.storage,
      storageKey: tracks.storageKey,
      coverImageId: tracks.coverImageId,
    })
    .from(tracks)
    .where(eq(tracks.id, id))
    .limit(1);
  if (!row) return;

  await db.delete(tracks).where(eq(tracks.id, id));
  if (row.coverImageId) {
    await db.delete(images).where(eq(images.id, row.coverImageId));
  }
  // Сам файл — best-effort, отсутствие не считаем ошибкой.
  if (row.storage === "s3" && row.storageKey) {
    await s3Delete(row.storageKey).catch(() => {});
  } else {
    await rm(trackFilePath(id, row.ext), { force: true }).catch(() => {});
  }
  revalidateMusic();
}

/** Применяет новый порядок треков (перетаскивание в библиотеке). */
export async function reorderTracks(orderedIds: string[]) {
  await schemaReady();
  const ids = z.array(z.string()).max(5000).parse(orderedIds);
  let pos = 0;
  for (const id of ids) {
    await db.update(tracks).set({ position: pos }).where(eq(tracks.id, id));
    pos++;
  }
  revalidateMusic();
}

/** +1 к счётчику прослушиваний (без revalidate — фоновый сигнал). */
export async function bumpPlayCount(id: string) {
  await schemaReady();
  await db
    .update(tracks)
    .set({ playCount: sql`${tracks.playCount} + 1` })
    .where(eq(tracks.id, id));
}
