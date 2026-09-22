import { isAuthed } from "@/lib/session";
import { exportJson } from "@/lib/data-transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) {
    return new Response("unauthorized", { status: 401 });
  }
  const data = await exportJson();
  const body = JSON.stringify(data);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="parviz-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
