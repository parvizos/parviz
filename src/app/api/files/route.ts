import { NextResponse } from "next/server";
import { db, schemaReady } from "@/db";
import { files } from "@/db/schema";
import { isAuthed } from "@/lib/session";
import { cloudUploadsEnabled, s3PutBytes, fileKey } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 200 * 1024 * 1024; // до 200 МБ — под видео

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
  const id = crypto.randomUUID();
  const name = file.name || "файл";
  const mime = file.type || "application/octet-stream";

  // Настроено облако → файл летит в R2/S3, в БД лишь ссылка; иначе blob в базе.
  // Ошибка облака не роняет загрузку — файл всё равно сохраним в БД.
  let storage: "db" | "s3" = "db";
  let storageKey: string | null = null;
  let data: Buffer = buf;
  if (await cloudUploadsEnabled().catch(() => false)) {
    try {
      const key = fileKey(id);
      await s3PutBytes(key, buf, mime);
      storage = "s3";
      storageKey = key;
      data = Buffer.alloc(0);
    } catch {
      storage = "db";
      storageKey = null;
      data = buf;
    }
  }

  const [row] = await db
    .insert(files)
    .values({ id, name, mime, data, size: buf.length, storage, storageKey })
    .returning({ id: files.id });

  return NextResponse.json({ id: row.id, name: file.name, size: buf.length });
}
