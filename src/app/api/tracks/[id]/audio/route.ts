import { eq } from "drizzle-orm";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { db, schemaReady } from "@/db";
import { tracks } from "@/db/schema";
import { isAuthed } from "@/lib/session";
import { trackFilePath } from "@/lib/media";
import { s3Get } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Node-стрим → веб-ReadableStream для тела Response. */
function webStream(stream: Readable): ReadableStream {
  return Readable.toWeb(stream) as unknown as ReadableStream;
}

/**
 * Отдаёт аудиофайл трека с диска с поддержкой HTTP Range — так работает
 * перемотка и корректно ведут себя мобильные плееры/lock-screen.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthed())) {
    return new Response("unauthorized", { status: 401 });
  }
  const { id } = await params;
  await schemaReady();

  const [row] = await db
    .select({
      ext: tracks.ext,
      mime: tracks.mime,
      storage: tracks.storage,
      storageKey: tracks.storageKey,
    })
    .from(tracks)
    .where(eq(tracks.id, id))
    .limit(1);
  if (!row) return new Response("not found", { status: 404 });

  // Облачное хранилище (R2/S3): проксируем с проброшенным Range (перемотка).
  if (row.storage === "s3" && row.storageKey) {
    const range = req.headers.get("range");
    const r = await s3Get(row.storageKey, range);
    if (r.status === 404) return new Response("not found", { status: 404 });
    if (r.status >= 400)
      return new Response("upstream error", { status: 502 });
    const headers: Record<string, string> = {
      "Content-Type": row.mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=31536000, immutable",
    };
    if (r.contentRange) headers["Content-Range"] = r.contentRange;
    if (r.contentLength) headers["Content-Length"] = r.contentLength;
    return new Response(r.body, { status: r.status, headers });
  }

  const path = trackFilePath(id, row.ext);
  let size: number;
  try {
    size = (await stat(path)).size;
  } catch {
    return new Response("not found", { status: 404 });
  }

  const base: Record<string, string> = {
    "Content-Type": row.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
  };

  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : size - 1;
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end) || end > size - 1) end = size - 1;
    if (start > end || start >= size) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    return new Response(webStream(createReadStream(path, { start, end })), {
      status: 206,
      headers: {
        ...base,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new Response(webStream(createReadStream(path)), {
    status: 200,
    headers: { ...base, "Content-Length": String(size) },
  });
}
