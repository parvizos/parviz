/*
 * Разбор внешних ссылок для карточек-закладок и встраивания превью.
 * Особый разбор для Google Диска/Документов/Таблиц/Презентаций/папок и YouTube —
 * из обычной «ссылки для просмотра» достаём встраиваемый URL (/preview, /embed).
 */

export type LinkKind =
  | "drive-file"
  | "google-doc"
  | "google-sheet"
  | "google-slide"
  | "drive-folder"
  | "youtube"
  | "web";

export type LinkInfo = {
  kind: LinkKind;
  url: string;
  /** URL для <iframe> живого превью; null — если встраивать нечего. */
  embedUrl: string | null;
  host: string;
  label: string;
};

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const DRIVE_FILE = /drive\.google\.com\/file\/d\/([-\w]{10,})/;
const DRIVE_OPEN = /drive\.google\.com\/open\?id=([-\w]{10,})/;
const DRIVE_UC = /drive\.google\.com\/uc\?[^#]*\bid=([-\w]{10,})/;
const DRIVE_FOLDER = /drive\.google\.com\/drive\/folders\/([-\w]{10,})/;
const G_DOC = /docs\.google\.com\/document\/d\/([-\w]{10,})/;
const G_SHEET = /docs\.google\.com\/spreadsheets\/d\/([-\w]{10,})/;
const G_SLIDE = /docs\.google\.com\/presentation\/d\/([-\w]{10,})/;
const YT_LONG = /(?:youtube\.com\/watch\?[^#]*\bv=|youtube\.com\/embed\/)([-\w]{6,})/;
const YT_SHORT = /youtu\.be\/([-\w]{6,})/;

export function parseLink(rawUrl: string): LinkInfo {
  const url = rawUrl.trim();
  const base = { url, host: host(url) };

  let m: RegExpMatchArray | null;

  if ((m = url.match(G_DOC)))
    return { ...base, kind: "google-doc", label: "Google Документ", embedUrl: `https://docs.google.com/document/d/${m[1]}/preview` };
  if ((m = url.match(G_SHEET)))
    return { ...base, kind: "google-sheet", label: "Google Таблица", embedUrl: `https://docs.google.com/spreadsheets/d/${m[1]}/preview` };
  if ((m = url.match(G_SLIDE)))
    return { ...base, kind: "google-slide", label: "Google Презентация", embedUrl: `https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false` };
  if ((m = url.match(DRIVE_FOLDER)))
    return { ...base, kind: "drive-folder", label: "Папка Google Диска", embedUrl: `https://drive.google.com/embeddedfolderview?id=${m[1]}#grid` };
  if ((m = url.match(DRIVE_FILE) || url.match(DRIVE_OPEN) || url.match(DRIVE_UC)))
    return { ...base, kind: "drive-file", label: "Google Диск", embedUrl: `https://drive.google.com/file/d/${m[1]}/preview` };
  if ((m = url.match(YT_LONG) || url.match(YT_SHORT)))
    return { ...base, kind: "youtube", label: "YouTube", embedUrl: `https://www.youtube.com/embed/${m[1]}` };

  return { ...base, kind: "web", label: base.host || url, embedUrl: null };
}

export function isGoogleDriveLink(url: string): boolean {
  const k = parseLink(url).kind;
  return (
    k === "drive-file" ||
    k === "google-doc" ||
    k === "google-sheet" ||
    k === "google-slide" ||
    k === "drive-folder"
  );
}

/** Нормализуем: добавим https://, если пользователь вставил без схемы. */
export function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
