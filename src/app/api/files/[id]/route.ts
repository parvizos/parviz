import { eq } from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { files } from "@/db/schema";
import { isAuthed } from "@/lib/session";
import { driveGetById } from "@/lib/gdrive";

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
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!row) return new Response("not found", { status: 404 });

  // filename* — RFC 5987, чтобы кириллица в имени не ломалась.
  const encoded = encodeURIComponent(row.name);

  // Файл в Google Drive — проксируем его байты через сервер (ключи не светим).
  if (row.storage === "gdrive" && row.storageKey) {
    const r = await driveGetById(row.storageKey);
    if (r.status === 404) return new Response("not found", { status: 404 });
    if (r.status >= 400) return new Response("upstream error", { status: 502 });
    const headers: Record<string, string> = {
      "Content-Type": row.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encoded}`,
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
      "Content-Disposition": `inline; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
