import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/session";
import {
  getDriveConfig,
  hasCredentials,
  buildAuthUrl,
  originFromHeaders,
  GDRIVE_REDIRECT_PATH,
} from "@/lib/gdrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Старт OAuth: кладём одноразовый state в cookie и отправляем пользователя на
 * страницу согласия Google. Redirect_uri строим из публичного origin — тот же,
 * что вписан в Google Console.
 */
export async function GET(req: Request) {
  const origin = originFromHeaders(req.headers);
  if (!(await isAuthed())) {
    return NextResponse.redirect(new URL("/login", origin));
  }
  const cfg = await getDriveConfig();
  if (!hasCredentials(cfg)) {
    return NextResponse.redirect(new URL("/nastroiki?gdrive=nocreds", origin));
  }

  const state = crypto.randomUUID();
  const redirectUri = origin + GDRIVE_REDIRECT_PATH;
  const authUrl = buildAuthUrl(cfg.clientId!, redirectUri, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("gd_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
