import { eq } from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { files } from "@/db/schema";
import { isAuthed } from "@/lib/session";
import { s3Get } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthed())) {
    return new Response("unauthorized", { status: 401 });
  }
  const { id } = await params;
  await schemaReady();
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!row) return new Response("not found", { status: 404 });

  // filename* — RFC 5987, чтобы кириллица в имени не ломалась.
  const encoded = encodeURIComponent(row.name);
  const range = req.headers.get("range");

  // Файл в облаке (R2/S3) — проксируем его байты (с поддержкой Range для видео).
  if (row.storage === "s3" && row.storageKey) {
    const r = await s3Get(row.storageKey, range);
    if (r.status === 404) return new Response("not found", { status: 404 });
    if (r.status >= 400 && r.status !== 416)
      return new Response("upstream error", { status: 502 });
    const headers: Record<string, string> = {
      "Content-Type": row.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    };
    if (r.contentLength) headers["Content-Length"] = r.contentLength;
    if (r.contentRange) headers["Content-Range"] = r.contentRange;
    // 206, если апстрим отдал частичный ответ на Range.
    const status = range && r.status === 206 ? 206 : 200;
    return new Response(r.body, { status, headers });
  }

  const bytes = new Uint8Array(row.data as Uint8Array);
  const total = bytes.byteLength;

  // Range для видео из БД: отдаём срез с 206.
  const m = range?.match(/bytes=(\d*)-(\d*)/);
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    if (start > end || start >= total) {
      return new Response("range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${total}`, "Accept-Ranges": "bytes" },
      });
    }
    const chunk = bytes.subarray(start, end + 1);
    return new Response(chunk, {
      status: 206,
      headers: {
        "Content-Type": row.mime,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Content-Disposition": `inline; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  }

  return new Response(bytes, {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(total),
      "Content-Disposition": `inline; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    },
  });
}
