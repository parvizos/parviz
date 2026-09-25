import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAuthed } from "@/lib/session";
import {
  getDriveConfig,
  hasCredentials,
  exchangeCode,
  fetchEmail,
  ensureAppFolder,
  saveConnection,
  originFromHeaders,
  GDRIVE_REDIRECT_PATH,
} from "@/lib/gdrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Возврат от Google: проверяем state, меняем код на токены, узнаём почту и
 * заводим папку приложения, сохраняем refresh_token. Итог показываем в
 * настройках через ?gdrive=... — карточка покажет понятный статус.
 */
export async function GET(req: Request) {
  const origin = originFromHeaders(req.headers);
  const back = (q: string) => {
    const r = NextResponse.redirect(new URL(`/nastroiki?gdrive=${q}`, origin));
    r.cookies.delete("gd_state");
    return r;
  };

  if (!(await isAuthed())) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const jar = await cookies();
  const saved = jar.get("gd_state")?.value;

  if (error) return back("denied");
  if (!code || !state || !saved || state !== saved) return back("badstate");

  const cfg = await getDriveConfig();
  if (!hasCredentials(cfg)) return back("nocreds");

  try {
    const redirectUri = origin + GDRIVE_REDIRECT_PATH;
    const { refreshToken, accessToken } = await exchangeCode(
      cfg.clientId!,
      cfg.clientSecret!,
      code,
      redirectUri,
    );
    const [email, folderId] = await Promise.all([
      fetchEmail(accessToken),
      ensureAppFolder(accessToken).catch(() => null),
    ]);
    await saveConnection(refreshToken, email, folderId);
    return back("connected");
  } catch {
    return back("error");
  }
}
