"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, RotateCw, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { loadImageSource, type ImageSource } from "@/lib/image-upload";

type Rect = { x: number; y: number; w: number; h: number };
type Corner = "nw" | "ne" | "sw" | "se";
type DragMode = "move" | Corner;

const MIN = 40; // минимальный размер рамки, px
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function containSize(w: number, h: number, maxW: number, maxH: number) {
  const s = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

/**
 * Обрезка/подгонка фото перед загрузкой. Рамку можно двигать и тянуть за углы,
 * фото — поворачивать. aspect фиксирует пропорции (1 — квадрат для аватара),
 * round рисует круглую подсказку. На выходе — PNG-файл выбранной области
 * (сжатие сделает уже uploadImage).
 */
export function ImageCropper({
  file,
  aspect = null,
  round = false,
  title = "Обрезать фото",
  confirmLabel = "Готово",
  onCancel,
  onCrop,
}: {
  file: File;
  aspect?: number | null;
  round?: boolean;
  title?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onCrop: (file: File) => void;
}) {
  const srcRef = useRef<ImageSource | null>(null);
  const workingRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: Rect;
    ax: number;
    ay: number;
  } | null>(null);

  const [ready, setReady] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [disp, setDisp] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [busy, setBusy] = useState(false);

  // Декодируем файл один раз (с учётом EXIF-поворота).
  useEffect(() => {
    let cancelled = false;
    loadImageSource(file)
      .then((src) => {
        if (cancelled) {
          src.done();
          return;
        }
        srcRef.current = src;
        setReady(true);
      })
      .catch(() => onCancel());
    return () => {
      cancelled = true;
      srcRef.current?.done();
      srcRef.current = null;
    };
  }, [file, onCancel]);

  const resetCrop = useCallback(
    (w: number, h: number) => {
      if (aspect) {
        const cw = Math.min(w, h * aspect);
        const ch = cw / aspect;
        setCrop({ x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch });
      } else {
        setCrop({ x: 0, y: 0, w, h });
      }
    },
    [aspect],
  );

  // Строим рабочий холст (полное разрешение, с поворотом) и показываем его.
  useEffect(() => {
    const src = srcRef.current;
    if (!ready || !src) return;

    const turned = rotation === 90 || rotation === 270;
    const sw = turned ? src.height : src.width;
    const sh = turned ? src.width : src.height;

    const wc = document.createElement("canvas");
    wc.width = sw;
    wc.height = sh;
    const wctx = wc.getContext("2d");
    if (!wctx) return;
    wctx.save();
    wctx.translate(sw / 2, sh / 2);
    wctx.rotate((rotation * Math.PI) / 180);
    src.draw(wctx, -src.width / 2, -src.height / 2, src.width, src.height);
    wctx.restore();
    workingRef.current = wc;

    const maxW = Math.min(560, window.innerWidth - 48);
    const maxH = Math.min(window.innerHeight - 240, 560);
    const d = containSize(sw, sh, maxW, maxH);
    setDisp(d);

    const c = canvasRef.current;
    if (c) {
      c.width = d.w;
      c.height = d.h;
      c.getContext("2d")?.drawImage(wc, 0, 0, d.w, d.h);
    }
    resetCrop(d.w, d.h);
  }, [ready, rotation, resetCrop]);

  function onPointerDown(e: React.PointerEvent, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // Якорь для ресайза — противоположный угол.
    const opp: Record<Corner, [number, number]> = {
      nw: [crop.x + crop.w, crop.y + crop.h],
      ne: [crop.x, crop.y + crop.h],
      sw: [crop.x + crop.w, crop.y],
      se: [crop.x, crop.y],
    };
    const [ax, ay] = mode === "move" ? [0, 0] : opp[mode];
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: crop,
      ax,
      ay,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;

    if (d.mode === "move") {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setCrop({
        ...d.startCrop,
        x: clamp(d.startCrop.x + dx, 0, disp.w - d.startCrop.w),
        y: clamp(d.startCrop.y + dy, 0, disp.h - d.startCrop.h),
      });
      return;
    }

    // Ресайз от угла: позиция указателя в координатах сцены, противоположный угол закреплён.
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pointerX = clamp(e.clientX - box.left, 0, disp.w);
    const pointerY = clamp(e.clientY - box.top, 0, disp.h);

    let w = Math.abs(pointerX - d.ax);
    let h = Math.abs(pointerY - d.ay);
    if (aspect) {
      if (w / h > aspect) w = h * aspect;
      else h = w / aspect;
    }
    w = Math.max(w, MIN);
    h = aspect ? w / aspect : Math.max(h, MIN);
    const x = pointerX < d.ax ? d.ax - w : d.ax;
    const y = pointerY < d.ay ? d.ay - h : d.ay;
    setCrop({
      x: clamp(x, 0, disp.w - w),
      y: clamp(y, 0, disp.h - h),
      w,
      h,
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    drag.current = null;
  }

  async function confirm() {
    const wc = workingRef.current;
    if (!wc || disp.w === 0) return;
    setBusy(true);
    const scale = wc.width / disp.w;
    const sx = Math.round(crop.x * scale);
    const sy = Math.round(crop.y * scale);
    const sw = Math.max(1, Math.round(crop.w * scale));
    const sh = Math.max(1, Math.round(crop.h * scale));
    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const octx = out.getContext("2d");
    if (!octx) {
      setBusy(false);
      return;
    }
    octx.drawImage(wc, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise<Blob | null>((r) =>
      out.toBlob(r, "image/png"),
    );
    setBusy(false);
    if (!blob) return;
    const base = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    onCrop(new File([blob], `${base}.png`, { type: "image/png" }));
  }

  const handleCls =
    "absolute h-4 w-4 rounded-full border-2 border-accent bg-surface shadow-[var(--shadow-sm)]";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 animate-overlay-in bg-black/60 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-[620px] animate-panel-in flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold text-text">{title}</h2>
          <button
            onClick={onCancel}
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex min-h-[280px] items-center justify-center bg-surface-2/60 p-4">
          {!ready ? (
            <Loader2 size={22} className="animate-spin text-faint" />
          ) : (
            <div
              className="relative touch-none select-none"
              style={{ width: disp.w, height: disp.h }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <canvas ref={canvasRef} className="block rounded-md" />
              {/* Рамка кропа с затемнением снаружи */}
              <div
                className="absolute cursor-move"
                onPointerDown={(e) => onPointerDown(e, "move")}
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.w,
                  height: crop.h,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                  outline: "1.5px solid var(--accent)",
                  borderRadius: round ? "9999px" : 4,
                }}
              >
                {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
                  <span
                    key={c}
                    onPointerDown={(e) => onPointerDown(e, c)}
                    className={handleCls}
                    style={{
                      left: c.includes("w") ? -8 : undefined,
                      right: c.includes("e") ? -8 : undefined,
                      top: c.includes("n") ? -8 : undefined,
                      bottom: c.includes("s") ? -8 : undefined,
                      cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          <button
            onClick={() => setRotation((r) => (r + 270) % 360)}
            title="Повернуть влево"
            aria-label="Повернуть влево"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <RotateCcw size={17} />
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Повернуть вправо"
            aria-label="Повернуть вправо"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <RotateCw size={17} />
          </button>
          <button
            onClick={() => resetCrop(disp.w, disp.h)}
            title="Сбросить рамку"
            aria-label="Сбросить рамку"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <RefreshCw size={16} />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onCancel}
              className="h-9 rounded-lg px-3.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              Отмена
            </button>
            <button
              onClick={confirm}
              disabled={busy || !ready}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[13px] font-medium text-accent-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Check size={15} />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
