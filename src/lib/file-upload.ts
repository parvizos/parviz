/*
 * Загрузка произвольных файлов и видео в /api/files (R2/облако или диск).
 * В отличие от image-upload, здесь ничего не сжимаем — кладём как есть.
 */

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  mime: string;
  /** URL для показа/скачивания. */
  href: string;
};

export async function uploadFile(file: File): Promise<UploadedFile | null> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/files", { method: "POST", body: form });
  if (!res.ok) return null;
  const j = (await res.json()) as { id: string; name?: string; size?: number };
  if (!j?.id) return null;
  return {
    id: j.id,
    name: j.name ?? file.name ?? "файл",
    size: j.size ?? file.size,
    mime: file.type || "application/octet-stream",
    href: `/api/files/${j.id}`,
  };
}

export function fmtFileSize(n: number): string {
  if (!n || n < 0) return "";
  if (n < 1024) return `${n} Б`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} КБ`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} МБ`;
  return `${(mb / 1024).toFixed(2)} ГБ`;
}
