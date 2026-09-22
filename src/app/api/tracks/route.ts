import type { NextRequest } from "next/server";
import { createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { revalidatePath } from "next/cache";
import { db, schemaReady } from "@/db";
import { tracks, images } from "@/db/schema";
import { isAuthed } from "@/lib/session";
import { ensureMediaDir, trackFilePath } from "@/lib/media";
import { parseAudioFile } from "@/lib/audio-meta";
import { nextTrackPosition } from "@/lib/music-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Максимум на один файл — с запасом даже под длинный lossless. */
const MAX_BYTES = 200 * 1024 * 1024;

/** Известные аудиоформаты: расширение → MIME для отдачи и <audio>. */
const EXT_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  m4b: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  weba: "audio/webm",
  webm: "audio/webm",
};

function extFromName(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/**
 * Загрузка одного трека. Файл идёт «сырым» телом запроса (стримом на диск,
 * без буферизации в памяти); имя и измеренная в браузере длительность — в
 * query. Теги и обложку достаём из файла уже на диске.
 */
export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  await schemaReady();

  const { searchParams } = new URL(req.url);
  const rawName = (searchParams.get("name") || "").slice(0, 300);
  const clientDuration = Number(searchParams.get("duration"));

  const ctype = (req.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  let ext = extFromName(rawName);
  if (!ext) {
    ext = Object.entries(EXT_MIME).find(([, m]) => m === ctype)?.[0] || "";
  }
  const isKnown = ext in EXT_MIME;
  if (!isKnown && !ctype.startsWith("audio/")) {
    return Response.json({ error: "Только аудиофайлы." }, { status: 415 });
  }
  const mime = EXT_MIME[ext] || ctype || "audio/mpeg";
  const diskExt = ext || "bin";

  const clen = Number(req.headers.get("content-length"));
  if (clen && clen > MAX_BYTES) {
    return Response.json(
      { error: "Файл слишком большой (макс. 200 МБ)." },
      { status: 413 },
    );
  }
  if (!req.body) {
    return Response.json({ error: "Пустой запрос." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  ensureMediaDir();
  const path = trackFilePath(id, diskExt);

  // Стримим тело на диск, попутно считая размер и обрывая слишком большие.
  let size = 0;
  const meter = new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      if (size > MAX_BYTES) {
        cb(new Error("too-large"));
        return;
      }
      cb(null, chunk);
    },
  });
  try {
    const input = Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]);
    await pipeline(input, meter, createWriteStream(path));
  } catch {
    await rm(path, { force: true }).catch(() => {});
    return Response.json(
      { error: "Не удалось сохранить файл." },
      { status: 400 },
    );
  }
  if (size === 0) {
    await rm(path, { force: true }).catch(() => {});
    return Response.json({ error: "Пустой файл." }, { status: 400 });
  }

  // Теги и обложка из файла на диске.
  const meta = await parseAudioFile(path);

  let coverImageId: string | null = null;
  if (meta.cover) {
    try {
      const [img] = await db
        .insert(images)
        .values({
          mime: meta.cover.mime,
          data: meta.cover.data,
          size: meta.cover.data.length,
        })
        .returning({ id: images.id });
      coverImageId = img?.id ?? null;
    } catch {
      coverImageId = null;
    }
  }

  const title =
    meta.title ||
    rawName.replace(/\.[a-z0-9]+$/i, "").trim() ||
    "Без названия";
  const duration =
    meta.duration ??
    (Number.isFinite(clientDuration) && clientDuration > 0
      ? clientDuration
      : null);
  const position = await nextTrackPosition();

  const [row] = await db
    .insert(tracks)
    .values({
      id,
      title,
      artist: meta.artist,
      album: meta.album,
      duration,
      mime,
      ext: diskExt,
      size,
      coverImageId,
      position,
    })
    .returning();

  revalidatePath("/", "layout");

  return Response.json({
    track: {
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      duration: row.duration,
      mime: row.mime,
      size: row.size,
      coverImageId: row.coverImageId,
      favorite: row.favorite,
      position: row.position,
      playCount: row.playCount,
    },
  });
}
