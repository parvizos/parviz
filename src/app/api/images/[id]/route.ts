import { eq } from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { images } from "@/db/schema";
import { isAuthed } from "@/lib/session";

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

  const bytes = new Uint8Array(row.data as Uint8Array);
  return new Response(bytes, {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
