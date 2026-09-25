/*
 * Google Drive как облачное хранилище файлов.
 *
 * Всё настраивается из интерфейса: пользователь один раз создаёт OAuth-клиент
 * в Google Cloud Console (Client ID + Secret — это требование Google, обойти
 * нельзя), вставляет их в настройки и жмёт «Подключить» — дальше идёт обычный
 * OAuth-редирект, мы получаем refresh_token и складываем его в БД. Никаких
 * переменных окружения и передеплоя.
 *
 * Область (scope) — drive.file: приложение видит и трогает ТОЛЬКО те файлы,
 * что само создало. Остального Google Диска мы не касаемся.
 *
 * Модуль серверный. Эндпоинты Google переопределяются переменными окружения —
 * это нужно только для автотестов (мок вместо настоящего Google).
 */

import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import {
  getSettings,
  setSetting,
  deleteSetting,
  SETTING_KEYS,
} from "@/lib/settings";

const AUTH_URL =
  process.env.GDRIVE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL =
  process.env.GDRIVE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const API_BASE = (
  process.env.GDRIVE_API_BASE || "https://www.googleapis.com"
).replace(/\/+$/, "");

/** Запрашиваем ровно столько, сколько нужно: почта (для показа) + свои файлы. */
export const GDRIVE_SCOPE =
  "openid email https://www.googleapis.com/auth/drive.file";

/** Имя папки в Google Диске, куда складываем всё приложение. */
export const APP_FOLDER_NAME = "ParvizOS";

/** Путь, на который Google возвращает пользователя после согласия. */
export const GDRIVE_REDIRECT_PATH = "/api/google/callback";

/**
 * Публичный origin приложения (учитывает reverse-proxy: за Caddy/nginx смотрим
 * на X-Forwarded-*). Нужен, чтобы построить redirect_uri, который совпадёт с
 * тем, что вписан в Google Console. Для localhost сами берём http.
 */
export function originFromHeaders(h: Headers): string {
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    h.get("host") ||
    "localhost";
  let proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (!proto) proto = /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https";
  return `${proto}://${host}`;
}

/** Полный redirect_uri для OAuth (то, что вставляют в Google Console). */
export function redirectUriFromHeaders(h: Headers): string {
  return originFromHeaders(h) + GDRIVE_REDIRECT_PATH;
}

export type DriveConfig = {
  clientId: string | null;
  clientSecret: string | null;
  refreshToken: string | null;
  folderId: string | null;
  email: string | null;
  uploadsOff: boolean;
};

export async function getDriveConfig(): Promise<DriveConfig> {
  const m = await getSettings([
    SETTING_KEYS.gdriveClientId,
    SETTING_KEYS.gdriveClientSecret,
    SETTING_KEYS.gdriveRefreshToken,
    SETTING_KEYS.gdriveFolderId,
    SETTING_KEYS.gdriveEmail,
    SETTING_KEYS.gdriveUploads,
  ]);
  return {
    clientId: m.get(SETTING_KEYS.gdriveClientId) ?? null,
    clientSecret: m.get(SETTING_KEYS.gdriveClientSecret) ?? null,
    refreshToken: m.get(SETTING_KEYS.gdriveRefreshToken) ?? null,
    folderId: m.get(SETTING_KEYS.gdriveFolderId) ?? null,
    email: m.get(SETTING_KEYS.gdriveEmail) ?? null,
    uploadsOff: m.get(SETTING_KEYS.gdriveUploads) === "off",
  };
}

/** Заданы ли Client ID и Secret (можно начинать OAuth). */
export function hasCredentials(cfg: DriveConfig): boolean {
  return !!cfg.clientId && !!cfg.clientSecret;
}

/** Есть ли refresh_token — т. е. Drive реально подключён. */
export function isConnected(cfg: DriveConfig): boolean {
  return !!cfg.refreshToken && hasCredentials(cfg);
}

/** Быстрая проверка «лить ли новые загрузки в Drive» (для роутов). */
export async function driveUploadsEnabled(): Promise<boolean> {
  const cfg = await getDriveConfig();
  return isConnected(cfg) && !cfg.uploadsOff;
}

/* ───────────────────────  OAuth  ─────────────────────── */

export function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", GDRIVE_SCOPE);
  // offline + consent — чтобы Google выдал именно refresh_token (долгоживущий).
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  return u.toString();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

/** Обмен кода авторизации на токены. Возвращает refresh_token + access_token. */
export async function exchangeCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<{ refreshToken: string; accessToken: string }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const j = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !j.access_token) {
    throw new Error(j.error_description || j.error || `token ${res.status}`);
  }
  if (!j.refresh_token) {
    // Google не вернул refresh_token (обычно если доступ уже выдавался и мы не
    // указали prompt=consent). Мы указываем — но подстрахуемся понятной ошибкой.
    throw new Error(
      "Google не выдал refresh_token. Отзови доступ приложению в аккаунте Google и подключи заново.",
    );
  }
  return { refreshToken: j.refresh_token, accessToken: j.access_token };
}

// Кэш access_token в памяти процесса, по refresh_token. Экономит лишние обмены.
const tokenCache = new Map<string, { token: string; exp: number }>();

async function refreshAccessToken(cfg: DriveConfig): Promise<string> {
  if (!cfg.refreshToken || !cfg.clientId || !cfg.clientSecret) {
    throw new Error("Google Drive не подключён");
  }
  const cached = tokenCache.get(cfg.refreshToken);
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const j = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !j.access_token) {
    throw new Error(j.error_description || j.error || `token ${res.status}`);
  }
  const exp = Date.now() + (j.expires_in ? j.expires_in * 1000 : 3_600_000);
  tokenCache.set(cfg.refreshToken, { token: j.access_token, exp });
  return j.access_token;
}

/** Почта подключённого аккаунта (для показа в настройках). */
export async function fetchEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/oauth2/v2/userinfo`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { email?: string };
    return j.email ?? null;
  } catch {
    return null;
  }
}

/* ───────────────────────  Папка приложения  ─────────────────────── */

/** Найти существующую папку ParvizOS (её создало наше приложение) или null. */
async function findAppFolder(accessToken: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const res = await fetch(
    `${API_BASE}/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const j = (await res.json()) as { files?: { id: string }[] };
  return j.files?.[0]?.id ?? null;
}

async function createAppFolder(accessToken: string): Promise<string> {
  const res = await fetch(`${API_BASE}/drive/v3/files?fields=id`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!res.ok) throw new Error(`folder create ${res.status}`);
  const j = (await res.json()) as { id: string };
  return j.id;
}

/** Гарантирует папку приложения, возвращает её id (создаёт при отсутствии). */
export async function ensureAppFolder(accessToken: string): Promise<string> {
  return (await findAppFolder(accessToken)) ?? (await createAppFolder(accessToken));
}

// Кэш folderId по refresh_token, чтобы не искать/не создавать папку каждый раз.
const folderCache = new Map<string, string>();

async function resolveFolderId(cfg: DriveConfig, accessToken: string): Promise<string> {
  if (cfg.folderId) return cfg.folderId;
  const key = cfg.refreshToken ?? "";
  const cached = folderCache.get(key);
  if (cached) return cached;
  const id = await ensureAppFolder(accessToken);
  folderCache.set(key, id);
  await setSetting(SETTING_KEYS.gdriveFolderId, id).catch(() => {});
  return id;
}

/* ───────────────────────  Загрузка / отдача / удаление  ─────────────────────── */

/** Возобновляемая (resumable) загрузка: 1) сессия, 2) заливка тела. */
async function driveUpload(
  accessToken: string,
  folderId: string,
  name: string,
  mime: string,
  body: Uint8Array | ReadableStream,
  size: number,
): Promise<string> {
  const initRes = await fetch(
    `${API_BASE}/upload/drive/v3/files?uploadType=resumable&fields=id`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": mime,
        "x-upload-content-length": String(size),
      },
      body: JSON.stringify({ name, parents: [folderId] }),
    },
  );
  if (!initRes.ok) throw new Error(`drive upload init ${initRes.status}`);
  const session = initRes.headers.get("location");
  if (!session) throw new Error("drive upload: нет session URI");

  const putInit: RequestInit & { duplex?: "half" } = {
    method: "PUT",
    headers: { "content-type": mime, "content-length": String(size) },
    body: body as BodyInit,
  };
  if (!(body instanceof Uint8Array)) putInit.duplex = "half";
  const putRes = await fetch(session, putInit);
  if (!putRes.ok) throw new Error(`drive upload ${putRes.status}`);
  const j = (await putRes.json()) as { id?: string };
  if (!j.id) throw new Error("drive upload: нет id файла");
  return j.id;
}

/** Залить буфер (картинки, вложения). Возвращает id файла в Drive. */
export async function drivePutBytes(
  name: string,
  mime: string,
  bytes: Uint8Array,
): Promise<string> {
  const cfg = await getDriveConfig();
  const token = await refreshAccessToken(cfg);
  const folderId = await resolveFolderId(cfg, token);
  return driveUpload(token, folderId, name, mime, bytes, bytes.byteLength);
}

/** Залить файл с диска стримом (аудио — может быть большим). */
export async function drivePutFile(
  name: string,
  mime: string,
  filePath: string,
  size: number,
): Promise<string> {
  const cfg = await getDriveConfig();
  const token = await refreshAccessToken(cfg);
  const folderId = await resolveFolderId(cfg, token);
  const stream = Readable.toWeb(
    createReadStream(filePath),
  ) as unknown as ReadableStream;
  return driveUpload(token, folderId, name, mime, stream, size);
}

export type DriveGetResult = {
  status: number;
  contentType: string | null;
  contentLength: string | null;
  contentRange: string | null;
  body: ReadableStream | null;
};

/** Скачать файл из Drive (с опциональным Range) — для проксирования в интерфейс. */
export async function driveGetById(
  fileId: string,
  range?: string | null,
): Promise<DriveGetResult> {
  const cfg = await getDriveConfig();
  const token = await refreshAccessToken(cfg);
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  if (range) headers["range"] = range;
  const res = await fetch(
    `${API_BASE}/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers },
  );
  return {
    status: res.status,
    contentType: res.headers.get("content-type"),
    contentLength: res.headers.get("content-length"),
    contentRange: res.headers.get("content-range"),
    body: res.body,
  };
}

/** Удалить файл в Drive (404 — не ошибка). */
export async function driveDeleteById(fileId: string): Promise<void> {
  const cfg = await getDriveConfig();
  if (!isConnected(cfg)) return;
  const token = await refreshAccessToken(cfg);
  const res = await fetch(
    `${API_BASE}/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok && res.status !== 404) throw new Error(`drive delete ${res.status}`);
}

/* ───────────────────────  Подключение / отключение  ─────────────────────── */

/** Сохранить токены после успешного OAuth. */
export async function saveConnection(
  refreshToken: string,
  email: string | null,
  folderId: string | null,
): Promise<void> {
  await setSetting(SETTING_KEYS.gdriveRefreshToken, refreshToken);
  if (email) await setSetting(SETTING_KEYS.gdriveEmail, email);
  if (folderId) await setSetting(SETTING_KEYS.gdriveFolderId, folderId);
}

/** Отключить Drive: стираем токены (ключи Client ID/Secret оставляем). */
export async function clearConnection(): Promise<void> {
  const cfg = await getDriveConfig();
  if (cfg.refreshToken) tokenCache.delete(cfg.refreshToken);
  await deleteSetting(SETTING_KEYS.gdriveRefreshToken);
  await deleteSetting(SETTING_KEYS.gdriveEmail);
  await deleteSetting(SETTING_KEYS.gdriveFolderId);
  await deleteSetting(SETTING_KEYS.gdriveUploads);
}
