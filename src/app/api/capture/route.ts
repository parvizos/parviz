import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/session";
import { db, schemaReady } from "@/db";
import { tasks, pages } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Быстрый захват: создаёт задачу во «Входящих» или страницу в блокноте. */
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: { kind?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  }
  const kind = body.kind === "note" ? "note" : "task";
  await schemaReady();

  if (kind === "note") {
    const [row] = await db
      .insert(pages)
      .values({ title: text.slice(0, 500) })
      .returning({ id: pages.id });
    return NextResponse.json({ ok: true, id: row.id, kind });
  }
  const [row] = await db
    .insert(tasks)
    .values({ title: text.slice(0, 500), status: "open" })
    .returning({ id: tasks.id });
  return NextResponse.json({ ok: true, id: row.id, kind });
}
