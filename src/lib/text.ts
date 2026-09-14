/** Убрать HTML-теги — для превью конспектов и записей дневника. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(html: string | null | undefined, n = 220): string {
  const t = stripHtml(html);
  return t.length > n ? t.slice(0, n).trimEnd() + "…" : t;
}
