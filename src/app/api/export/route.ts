import { readFile } from "node:fs/promises";
import { isAuthed } from "@/lib/session";
import { schemaReady } from "@/db";
import { makeExportSnapshot } from "@/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthed())) {
    return new Response("unauthorized", { status: 401 });
  }
  await schemaReady();

  const snap = await makeExportSnapshot();
  if (!snap) {
    return new Response(
      "Экспорт файлом доступен только для локальной базы.",
      { status: 400 },
    );
  }
  try {
    const buf = await readFile(snap.path);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="parviz-${date}.db"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } finally {
    snap.cleanup();
  }
}
