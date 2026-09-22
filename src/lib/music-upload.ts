import type { TrackMeta } from "@/lib/music-queries";

/** Атрибут accept для выбора аудио. */
export const AUDIO_ACCEPT =
  "audio/*,.mp3,.m4a,.m4b,.flac,.wav,.ogg,.oga,.opus,.aac,.weba,.webm";

/** Похож ли файл на аудио (по типу или расширению). */
export function isAudioFile(f: File): boolean {
  if (f.type.startsWith("audio/")) return true;
  return /\.(mp3|m4a|m4b|flac|wav|ogg|oga|opus|aac|weba|webm)$/i.test(f.name);
}

/** Измеряет длительность в браузере — запасной вариант, если в тегах её нет. */
export function measureDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";
      const done = (v: number | null) => {
        URL.revokeObjectURL(url);
        resolve(v);
      };
      audio.onloadedmetadata = () =>
        done(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
      audio.onerror = () => done(null);
      audio.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Заливает один трек «сырым» телом (через XHR ради прогресса). Имя и
 * измеренная длительность идут в query — сервер разберёт теги сам.
 */
export function uploadTrack(
  file: File,
  duration: number | null,
  onProgress?: (frac: number) => void,
): Promise<TrackMeta> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const q = new URLSearchParams({ name: file.name });
    if (duration && duration > 0) q.set("duration", String(Math.round(duration)));
    xhr.open("POST", `/api/tracks?${q.toString()}`);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText).track as TrackMeta);
        } catch {
          reject(new Error("Некорректный ответ сервера"));
        }
      } else {
        let msg = "Не удалось загрузить";
        try {
          msg = JSON.parse(xhr.responseText).error || msg;
        } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Ошибка сети"));
    xhr.send(file);
  });
}
