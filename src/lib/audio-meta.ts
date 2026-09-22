/**
 * Разбор тегов аудиофайла (ID3/Vorbis/MP4) на сервере — исполняется только в
 * роуте загрузки. music-metadata вынесен в serverExternalPackages, поэтому
 * работает как обычный Node-модуль. Читаем прямо с диска (parseFile) — не
 * загружая весь файл в память, что важно для больших треков.
 */
import { parseFile } from "music-metadata";

export type ParsedAudio = {
  title: string | null;
  artist: string | null;
  album: string | null;
  /** Длительность в секундах. */
  duration: number | null;
  /** Встроенная обложка, если есть. */
  cover: { data: Buffer; mime: string } | null;
};

const EMPTY: ParsedAudio = {
  title: null,
  artist: null,
  album: null,
  duration: null,
  cover: null,
};

function clean(v: string | undefined | null): string | null {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

/** Теги и обложка из файла на диске; при любой ошибке — пустые поля. */
export async function parseAudioFile(path: string): Promise<ParsedAudio> {
  try {
    const meta = await parseFile(path, { duration: true });
    const c = meta.common;
    const pic = c.picture?.[0];
    return {
      title: clean(c.title),
      artist: clean(c.artist) ?? clean(c.albumartist),
      album: clean(c.album),
      duration:
        typeof meta.format.duration === "number" && meta.format.duration > 0
          ? meta.format.duration
          : null,
      cover:
        pic && pic.data?.length
          ? { data: Buffer.from(pic.data), mime: pic.format || "image/jpeg" }
          : null,
    };
  } catch {
    return EMPTY;
  }
}
