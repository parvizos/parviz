import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { tasks } from "@/db/schema";
import { isAuthed } from "@/lib/session";
import { todayISO } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Открытые задачи на сегодня, у которых задано время — для напоминаний. */
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await schemaReady();
  const t = todayISO();
  const rows = await db
    .select({ id: tasks.id, title: tasks.title, time: tasks.scheduledTime })
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "open"),
        eq(tasks.scheduledDate, t),
        isNotNull(tasks.scheduledTime),
      ),
    );
  return NextResponse.json({ today: t, tasks: rows });
}
