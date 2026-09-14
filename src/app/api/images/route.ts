import { NextResponse } from "next/server";
import { db, schemaReady } from "@/db";
import { images } from "@/db/schema";
import { isAuthed } from "@/lib/session";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

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
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not an image" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  await schemaReady();
  const buf = Buffer.from(await file.arrayBuffer());
  const [row] = await db
    .insert(images)
    .values({ mime: file.type, data: buf, size: buf.length })
    .returning({ id: images.id });

  return NextResponse.json({ id: row.id, url: `/api/images/${row.id}` });
}
