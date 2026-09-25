import { NextResponse } from "next/server";
import { db, schemaReady } from "@/db";
import { images } from "@/db/schema";
import { isAuthed } from "@/lib/session";
import { cloudUploadsEnabled, s3PutBytes, imageKey } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

const IMG_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

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
  const id = crypto.randomUUID();

  // Настроено облако → новая картинка летит в R2/S3, в БД остаётся только
  // ссылка (пустой blob, т.к. колонка NOT NULL). Не вышло залить — не теряем
  // файл: спокойно кладём его blob'ом в базу, как раньше.
  let storage: "db" | "s3" = "db";
  let storageKey: string | null = null;
  let data: Buffer = buf;
  if (await cloudUploadsEnabled().catch(() => false)) {
    try {
      const key = imageKey(id, IMG_EXT[file.type] || "bin");
      await s3PutBytes(key, buf, file.type);
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
    .insert(images)
    .values({ id, mime: file.type, data, size: buf.length, storage, storageKey })
    .returning({ id: images.id });

  return NextResponse.json({ id: row.id, url: `/api/images/${row.id}` });
}
