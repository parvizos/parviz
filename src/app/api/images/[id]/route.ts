import { eq } from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { images } from "@/db/schema";
import { isAuthed } from "@/lib/session";
import { s3Get } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthed())) {
    return new Response("unauthorized", { status: 401 });
  }
  const { id } = await params;
  await schemaReady();
  const [row] = await db
    .select()
    .from(images)
    .where(eq(images.id, id))
    .limit(1);
  if (!row) return new Response("not found", { status: 404 });

  // Картинка в облаке (R2/S3) — проксируем её байты через сервер.
  if (row.storage === "s3" && row.storageKey) {
    const r = await s3Get(row.storageKey);
    if (r.status === 404) return new Response("not found", { status: 404 });
    if (r.status >= 400) return new Response("upstream error", { status: 502 });
    const headers: Record<string, string> = {
      "Content-Type": row.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    };
    if (r.contentLength) headers["Content-Length"] = r.contentLength;
    return new Response(r.body, { status: 200, headers });
  }

  const bytes = new Uint8Array(row.data as Uint8Array);
  return new Response(bytes, {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
