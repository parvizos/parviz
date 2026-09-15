"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Eraser, Undo2, Trash2, Check, X, Loader2, Pen } from "lucide-react";
import { cn } from "@/lib/cn";

type Pt = { x: number; y: number };
type Stroke = { color: string; width: number; erase: boolean; points: Pt[] };

const COLORS = ["#1e1e1e", "#2563eb", "#dc2626", "#16a34a", "#ea580c"];
const WIDTHS = [2.5, 4.5, 8];
const PAPER = "#ffffff";

// Рисуем штрих со сглаживанием по средним точкам — почерк и формулы
// получаются плавными, а не «лесенкой».
function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  const pts = s.points;
  if (pts.length === 0) return;
  const paint = s.erase ? PAPER : s.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = paint;
  ctx.fillStyle = paint;
  ctx.lineWidth = s.width;

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, s.width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

export function SketchPad({
  onSave,
  onClose,
}: {
  onSave: (file: File) => Promise<void> | void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const drawingRef = useRef(false);
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });

  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [eraser, setEraser] = useState(false);
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h } = sizeRef.current;
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    for (const s of strokesRef.current) drawStroke(ctx, s);
    if (currentRef.current) drawStroke(ctx, currentRef.current);
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    dprRef.current = dpr;
    sizeRef.current = { w, h };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    render();
  }, [render]);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(() => resize());
    if (containerRef.current) ro.observe(containerRef.current);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      ro.disconnect();
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [resize, onClose]);

  function locate(clientX: number, clientY: number): Pt {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    currentRef.current = {
      color,
      width,
      erase: eraser,
      points: [locate(e.clientX, e.clientY)],
    };
    render();
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !currentRef.current) return;
    e.preventDefault();
    const native = e.nativeEvent;
    const events =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];
    for (const ev of events) {
      currentRef.current.points.push(locate(ev.clientX, ev.clientY));
    }
    render();
  }

  function endStroke() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const cur = currentRef.current;
    currentRef.current = null;
    if (cur && cur.points.length > 0) {
      strokesRef.current.push(cur);
      setCount(strokesRef.current.length);
    }
    render();
  }

  function undo() {
    strokesRef.current.pop();
    setCount(strokesRef.current.length);
    render();
  }

  function clearAll() {
    strokesRef.current = [];
    setCount(0);
    render();
  }

  async function done() {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return;
    setSaving(true);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/png"),
    );
    if (!blob) {
      setSaving(false);
      return;
    }
    const file = new File([blob], `sketch-${Date.now()}.png`, {
      type: "image/png",
    });
    try {
      await onSave(file);
      onClose();
    } catch {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  const swatch =
    "flex h-8 w-8 items-center justify-center rounded-full transition-transform";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex animate-overlay-in flex-col bg-surface">
      {/* Шапка */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Pen size={16} className="shrink-0 text-accent" />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-text">Рисунок</div>
            <div className="hidden text-[12px] text-muted sm:block">
              Пиши формулы и схемы от руки — вставится в конспект картинкой
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X size={16} />
            <span className="hidden sm:inline">Отмена</span>
          </button>
          <button
            type="button"
            onClick={done}
            disabled={count === 0 || saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-[13px] font-medium text-accent-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Готово
          </button>
        </div>
      </div>

      {/* Инструменты */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2 sm:gap-2 sm:px-4">
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Цвет ${c}`}
              onClick={() => {
                setColor(c);
                setEraser(false);
              }}
              className={cn(
                swatch,
                !eraser && color === c
                  ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-surface"
                  : "hover:scale-105",
              )}
            >
              <span
                className="h-5 w-5 rounded-full border border-black/10"
                style={{ background: c }}
              />
            </button>
          ))}
        </div>

        <span className="mx-1 h-6 w-px bg-border" />

        <div className="flex items-center gap-1">
          {WIDTHS.map((w, i) => (
            <button
              key={w}
              type="button"
              aria-label={`Толщина ${["тонкая", "средняя", "толстая"][i]}`}
              onClick={() => setWidth(w)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                width === w
                  ? "bg-accent-soft text-accent-soft-text"
                  : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <span
                className="rounded-full bg-current"
                style={{ width: w + 3, height: w + 3 }}
              />
            </button>
          ))}
        </div>

        <span className="mx-1 h-6 w-px bg-border" />

        <button
          type="button"
          onClick={() => setEraser((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-colors",
            eraser
              ? "bg-accent-soft text-accent-soft-text"
              : "text-muted hover:bg-surface-2 hover:text-text",
          )}
        >
          <Eraser size={16} />
          <span className="hidden sm:inline">Ластик</span>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={count === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-40"
          >
            <Undo2 size={16} />
            <span className="hidden sm:inline">Отменить</span>
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={count === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Очистить</span>
          </button>
        </div>
      </div>

      {/* Холст */}
      <div className="flex-1 overflow-hidden bg-surface-2 p-2 sm:p-4">
        <div
          ref={containerRef}
          className="mx-auto h-full w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]"
        >
          <canvas
            ref={canvasRef}
            className="block touch-none"
            style={{ touchAction: "none", cursor: "crosshair" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => {
              e.preventDefault();
              endStroke();
            }}
            onPointerCancel={endStroke}
            onPointerLeave={endStroke}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
