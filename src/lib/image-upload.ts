/*
 * Клиентское сжатие фото перед загрузкой и сама загрузка в базу.
 *
 * Картинки хранятся прямо в SQLite, поэтому фото с телефона (5–12 МБ) быстро
 * раздули бы базу и бэкапы. Здесь мы ужимаем размер и перекодируем в WebP
 * (или JPEG, если браузер старый) с высоким качеством — визуально «без потерь»,
 * но в разы легче. Работает только в браузере (canvas).
 *
 * Рисунки от руки (SketchPad) грузим как есть ({ compress: false }): их
 * перекодировать в JPEG/WebP нельзя — размажет тонкие линии.
 */

export type CompressOpts = {
  /** Ограничение по длинной стороне, px. По умолчанию 2400. */
  maxDim?: number;
  /** Качество кодирования 0..1. По умолчанию 0.85 (визуально без потерь). */
  quality?: number;
};

let webpSupport: boolean | null = null;
function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

type Decoded = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  done: () => void;
};

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // imageOrientation учитывает EXIF-поворот фото с телефона.
      const bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        width: bmp.width,
        height: bmp.height,
        draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h),
        done: () => bmp.close(),
      };
    } catch {
      // упадём в запасной путь ниже
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("decode failed"));
    img.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    done: () => URL.revokeObjectURL(url),
  };
}

/** Ужать фото. Если сжать нельзя или невыгодно — вернёт исходный файл. */
export async function compressImage(
  file: File,
  opts: CompressOpts = {},
): Promise<File> {
  // GIF (анимация) и SVG (вектор) не трогаем.
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }
  const maxDim = opts.maxDim ?? 2400;
  const quality = opts.quality ?? 0.85;

  let src: Decoded;
  try {
    src = await decode(file);
  } catch {
    return file; // не смогли декодировать (напр. HEIC) — грузим оригинал
  }

  try {
    const { width, height } = src;
    if (!width || !height) return file;

    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    const type = supportsWebp() ? "image/webp" : "image/jpeg";
    if (type === "image/jpeg") {
      // У JPEG нет альфа-канала — подложим белый фон.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    src.draw(ctx, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, quality),
    );
    if (!blob) return file;

    // Не уменьшили размер и перекодировка не дала выгоды — оставляем оригинал.
    if (scale === 1 && blob.size >= file.size) return file;

    const ext = type === "image/webp" ? "webp" : "jpg";
    const base = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.${ext}`, {
      type,
      lastModified: Date.now(),
    });
  } finally {
    src.done();
  }
}

/**
 * Загрузить картинку в базу (POST /api/images), вернуть её URL.
 * По умолчанию сначала сжимает; для рисунков передавай { compress: false }.
 */
export async function uploadImage(
  file: File,
  opts: { compress?: boolean | CompressOpts } = {},
): Promise<string | null> {
  const c = opts.compress ?? true;
  const toSend =
    c === false ? file : await compressImage(file, c === true ? {} : c);

  const fd = new FormData();
  fd.append("file", toSend);
  try {
    const res = await fetch("/api/images", { method: "POST", body: fd });
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string };
    return json.url ?? null;
  } catch {
    return null;
  }
}
