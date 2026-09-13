/*
 * Аутентификация для личного сервиса: один пользователь, один пароль.
 * Никаких таблиц пользователей и OAuth — только пароль из окружения и
 * подписанная кука сессии. Подпись на Web Crypto, чтобы одинаково
 * работать и в Node (server actions), и в Edge (middleware).
 */

export const SESSION_COOKIE = "parviz_session";
export const SESSION_DAYS = 60;

const enc = new TextEncoder();

function secret(): string {
  return process.env.AUTH_SECRET || "parviz-dev-secret-please-change";
}

function password(): string {
  return process.env.APP_PASSWORD || "parviz";
}

export function usingDefaultSecrets(): boolean {
  return !process.env.AUTH_SECRET || !process.env.APP_PASSWORD;
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let r = 0;
  for (let i = 0; i < ab.length; i++) r |= ab[i] ^ bb[i];
  return r === 0;
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64url(new Uint8Array(sig));
}

export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `v1.${exp}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [v, expStr, sig] = parts;
  if (v !== "v1") return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await sign(`v1.${expStr}`);
  return timingSafeEqual(sig, expected);
}

export function verifyPassword(input: string): boolean {
  return timingSafeEqual(input, password());
}
