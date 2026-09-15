import { isAuthed } from "@/lib/session";
import { getServerHealth } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) {
    return new Response("unauthorized", { status: 401 });
  }
  const health = await getServerHealth();
  return Response.json(health, {
    headers: { "Cache-Control": "no-store" },
  });
}
