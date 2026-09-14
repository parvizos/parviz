import { NextResponse } from "next/server";
import { db, schemaReady } from "@/db";
import { files } from "@/db/schema";
import { isAuthed } from "@/lib/session";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  await schemaReady();
  const buf = Buffer.from(await file.arrayBuffer());
  const [row] = await db
    .insert(files)
    .values({
      name: file.name || "файл",
      mime: file.type || "application/octet-stream",
      data: buf,
      size: buf.length,
    })
    .returning({ id: files.id });

  return NextResponse.json({ id: row.id, name: file.name, size: buf.length });
}
