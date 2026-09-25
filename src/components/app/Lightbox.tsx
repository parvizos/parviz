"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Просмотр фото на весь экран (лайтбокс). Работает и для одной картинки,
 * и для галереи: стрелки ←/→, Esc, клик по фону — закрыть.
 */
export function Lightbox({
  images,
  start = 0,
  captions,
  onClose,
}: {
  images: string[];
  start?: number;
  captions?: (string | null)[];
  onClose: () => void;
}) {
  const [i, setI] = useState(() => Math.min(Math.max(start, 0), Math.max(images.length - 1, 0)));

  const multi = images.length > 1;
  const prev = useCallback(
    () => setI((v) => (v - 1 + images.length) % images.length),
    [images.length],
  );
  const next = useCallback(
    () => setI((v) => (v + 1) % images.length),
    [images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [prev, next, onClose]);

  if (typeof document === "undefined" || images.length === 0) return null;
  const caption = captions?.[i] || null;

  const navBtn =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20";

  return createPortal(
    <div
      className="pv-lightbox fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
      >
        <X size={20} />
      </button>

      {multi && (
        <button
          type="button"
          aria-label="Предыдущее"
          className={navBtn + " left-3 sm:left-5"}
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <figure
        className="pv-lightbox-fig flex max-h-[92vh] max-w-[94vw] flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[i]}
          src={images[i]}
          alt={caption ?? ""}
          className="pv-lightbox-img max-h-[84vh] max-w-[94vw] rounded-xl object-contain shadow-2xl"
        />
        {caption && (
          <figcaption className="max-w-2xl px-4 text-center text-[13.5px] leading-relaxed text-white/80">
            {caption}
          </figcaption>
        )}
      </figure>

      {multi && (
        <button
          type="button"
          aria-label="Следующее"
          className={navBtn + " right-3 sm:right-5"}
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {multi && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-medium tabular-nums text-white backdrop-blur">
          {i + 1} / {images.length}
        </div>
      )}
    </div>,
    document.body,
  );
}
