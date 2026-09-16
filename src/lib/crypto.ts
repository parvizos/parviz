/*
 * Шифрование секретов (паролей) для менеджера паролей.
 *
 * Модель: «под паролем входа». Пароли шифруются ключом сервера (AES-256-GCM),
 * поэтому в базе и бэкапах лежит только шифртекст — утёкший файл базы бесполезен
 * без ключа. Расшифровка происходит на сервере за логином.
 *
 * Это НЕ zero-knowledge: сервер технически может расшифровать. Для максимума
 * приватности нужен отдельный мастер-пароль (клиентское шифрование) — это другой
 * режим.
 *
 * Ключ выводится из PASSWORD_SECRET (или AUTH_SECRET) через HKDF. ВАЖНО: не меняй
 * этот секрет после того, как сохранил пароли — иначе их будет не расшифровать.
 *
 * Только для сервера (node:crypto).
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const SALT = "parviz.vault.v1";
const INFO = "credential-encryption";

let cachedKey: Buffer | null = null;
function vaultKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.PASSWORD_SECRET ||
    process.env.AUTH_SECRET ||
    "insecure-dev-secret-change-me";
  const derived = hkdfSync(
    "sha256",
    Buffer.from(secret, "utf8"),
    Buffer.from(SALT, "utf8"),
    Buffer.from(INFO, "utf8"),
    32,
  );
  cachedKey = Buffer.from(derived);
  return cachedKey;
}

/** Зашифровать секрет. Возвращает base64 вида iv(12) | tag(16) | ciphertext. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Расшифровать. Пустой/битый вход → "". */
export function decryptSecret(blob: string | null | undefined): string {
  if (!blob) return "";
  try {
    const raw = Buffer.from(blob, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", vaultKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return "";
  }
}
