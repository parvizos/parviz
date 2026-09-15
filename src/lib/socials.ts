import type { SocialKind, Social } from "@/db/schema";
import { SOCIAL_KINDS } from "@/db/schema";

export type { Social, SocialKind } from "@/db/schema";
export { SOCIAL_KINDS } from "@/db/schema";

const isUrl = (v: string) => /^https?:\/\//i.test(v.trim());
const at = (v: string) => v.trim().replace(/^@+/, "");
const digits = (v: string) => v.replace(/[^\d]/g, "");

type Meta = {
  label: string;
  /** Бренд-цвет иконки (виден в обеих темах). */
  color: string;
  placeholder: string;
  /** Куда ведёт ссылка. */
  href: (v: string) => string;
  /** Как красиво подписать в карточке. */
  display: (v: string) => string;
};

// Ник-ориентированные сети: значение — ник или полная ссылка.
function handleMeta(
  label: string,
  color: string,
  base: string,
  opts: { prefix?: string; placeholder?: string } = {},
): Meta {
  const prefix = opts.prefix ?? "";
  return {
    label,
    color,
    placeholder: opts.placeholder ?? "username",
    href: (v) => (isUrl(v) ? v.trim() : base + at(v)),
    display: (v) => (isUrl(v) ? prettyPath(v) : prefix + at(v)),
  };
}

function prettyPath(url: string): string {
  try {
    const u = new URL(url);
    const path = (u.pathname + u.search).replace(/\/$/, "");
    return path && path !== "/" ? path.replace(/^\//, "") : u.hostname;
  } catch {
    return url;
  }
}

export const SOCIAL_META: Record<SocialKind, Meta> = {
  instagram: handleMeta("Instagram", "#E1306C", "https://instagram.com/", {
    prefix: "@",
  }),
  telegram: handleMeta("Telegram", "#229ED9", "https://t.me/", { prefix: "@" }),
  whatsapp: {
    label: "WhatsApp",
    color: "#25D366",
    placeholder: "+7…",
    href: (v) => (isUrl(v) ? v.trim() : `https://wa.me/${digits(v)}`),
    display: (v) => v.trim(),
  },
  facebook: handleMeta("Facebook", "#1877F2", "https://facebook.com/"),
  vk: handleMeta("VK", "#0077FF", "https://vk.com/"),
  twitter: handleMeta("X", "#1DA1F2", "https://x.com/", { prefix: "@" }),
  tiktok: handleMeta("TikTok", "#EE1D52", "https://tiktok.com/@", {
    prefix: "@",
  }),
  linkedin: handleMeta("LinkedIn", "#0A66C2", "https://linkedin.com/in/"),
  youtube: handleMeta("YouTube", "#FF0000", "https://youtube.com/@", {
    prefix: "@",
  }),
  github: handleMeta("GitHub", "#8b95a5", "https://github.com/", {
    prefix: "@",
  }),
  website: {
    label: "Сайт",
    color: "#8b95a5",
    placeholder: "example.com",
    href: (v) => (isUrl(v) ? v.trim() : `https://${v.trim()}`),
    display: (v) => v.trim().replace(/^https?:\/\//i, "").replace(/\/$/, ""),
  },
  other: {
    label: "Ссылка",
    color: "#8b95a5",
    placeholder: "ссылка или контакт",
    href: (v) => (isUrl(v) ? v.trim() : `https://${v.trim()}`),
    display: (v) => v.trim().replace(/^https?:\/\//i, "").replace(/\/$/, ""),
  },
};

export const SOCIAL_KINDS_ORDER = SOCIAL_KINDS;

/** Разобрать socials из базы во всегда-массив, отбросив пустые. */
export function parseSocials(raw: unknown): Social[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : safeJson(raw);
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (s): s is Social =>
      !!s &&
      typeof s === "object" &&
      typeof (s as Social).value === "string" &&
      (s as Social).value.trim().length > 0 &&
      (SOCIAL_KINDS as readonly string[]).includes((s as Social).kind),
  );
}

function safeJson(raw: unknown): unknown {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
