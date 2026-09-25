"use client";

import {
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  WrapText,
  Maximize2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { ImageAlign } from "./image-node";

const MIN_W = 90;
const PRESETS: { label: string; width: number }[] = [
  { label: "S", width: 220 },
  { label: "M", width: 380 },
  { label: "L", width: 620 },
];

export function ImageNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor, deleteNode } = props;
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string | null) ?? "";
  const title = (node.attrs.title as string | null) ?? undefined;
  const width = node.attrs.width as number | null;
  const align = (node.attrs.align as ImageAlign) ?? "center";
  const wrap = Boolean(node.attrs.wrap);

  const editable = editor.isEditable;
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragW, setDragW] = useState<number | null>(null);
  const [hover, setHover] = useState(false);

  const effectiveWrap = wrap && align !== "center";
  const displayW = dragW ?? width;
  const controls = editable && (selected || hover);

  // Максимальная ширина — по ширине области редактора.
  const maxWidth = useCallback(() => {
    const w = editor.view.dom.getBoundingClientRect().width;
    return w > 0 ? Math.round(w) : 900;
  }, [editor]);

  const beginResize = useCallback(
    (side: "left" | "right") => (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;
      const startX = e.clientX;
      const startW = img.getBoundingClientRect().width;
      const max = maxWidth();

      const compute = (clientX: number) => {
        const dx = clientX - startX;
        const delta = side === "right" ? dx : -dx;
        return Math.max(MIN_W, Math.min(Math.round(startW + delta), max));
      };
      const onMove = (ev: PointerEvent) => setDragW(compute(ev.clientX));
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setDragW(null);
        updateAttributes({ width: compute(ev.clientX) });
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [maxWidth, updateAttributes],
  );

  function setAlign(a: ImageAlign) {
    updateAttributes({ align: a, wrap: a === "center" ? false : wrap });
  }
  function toggleWrap() {
    const next = !wrap;
    updateAttributes({
      wrap: next,
      align: next && align === "center" ? "left" : align,
      // Обтекание без заданной ширины выглядит плохо — задаём разумную.
      width: next && !width ? 320 : width,
    });
  }
  function setPreset(w: number | null) {
    updateAttributes({ width: w });
  }

  const wrapperStyle: CSSProperties = effectiveWrap
    ? {
        float: align === "right" ? "right" : "left",
        margin:
          align === "right" ? "0.2em 0 0.6em 1.1em" : "0.2em 1.1em 0.6em 0",
        maxWidth: "62%",
        clear: "none",
      }
    : {
        display: "flex",
        justifyContent:
          align === "left"
            ? "flex-start"
            : align === "right"
              ? "flex-end"
              : "center",
      };

  const innerStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
    width: displayW ? `${displayW}px` : "100%",
    maxWidth: "100%",
    lineHeight: 0,
  };

  const handle =
    "absolute top-1/2 z-10 h-10 w-1.5 -translate-y-1/2 cursor-ew-resize rounded-full bg-accent shadow ring-2 ring-surface transition-opacity";

  return (
    <NodeViewWrapper
      className="pv-image"
      style={wrapperStyle}
      data-align={align}
      data-wrap={effectiveWrap ? "true" : undefined}
    >
      <div
        style={innerStyle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          title={title}
          draggable={false}
          data-drag-handle
          className={cn(
            "block h-auto w-full rounded-xl transition-shadow",
            selected && "ring-2 ring-accent",
          )}
        />

        {/* Ручки ресайза */}
        {controls && (
          <>
            <span
              className={cn(handle, "left-0 -translate-x-1/2")}
              onPointerDown={beginResize("left")}
              role="separator"
              aria-label="Изменить размер"
            />
            <span
              className={cn(handle, "right-0 translate-x-1/2")}
              onPointerDown={beginResize("right")}
              role="separator"
              aria-label="Изменить размер"
            />
          </>
        )}

        {/* Бейдж ширины во время перетаскивания */}
        {dragW != null && (
          <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {dragW}px
          </span>
        )}

        {/* Панель управления */}
        {editable && selected && (
          <div
            className="absolute -top-11 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-surface px-1 py-1 shadow-[var(--shadow-lg)]"
            onMouseDown={(e) => e.preventDefault()}
          >
            <BarBtn label="Слева" active={align === "left"} onClick={() => setAlign("left")}>
              <AlignLeft size={15} />
            </BarBtn>
            <BarBtn label="По центру" active={align === "center"} onClick={() => setAlign("center")}>
              <AlignCenter size={15} />
            </BarBtn>
            <BarBtn label="Справа" active={align === "right"} onClick={() => setAlign("right")}>
              <AlignRight size={15} />
            </BarBtn>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <BarBtn
              label="Обтекание текстом"
              active={effectiveWrap}
              disabled={align === "center"}
              onClick={toggleWrap}
            >
              <WrapText size={15} />
            </BarBtn>
            <span className="mx-0.5 h-5 w-px bg-border" />
            {PRESETS.map((p) => (
              <BarBtn
                key={p.label}
                label={`Размер ${p.label}`}
                active={width === p.width}
                onClick={() => setPreset(p.width)}
              >
                <span className="text-[12px] font-semibold">{p.label}</span>
              </BarBtn>
            ))}
            <BarBtn label="Во всю ширину" active={width == null} onClick={() => setPreset(null)}>
              <Maximize2 size={14} />
            </BarBtn>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <BarBtn label="Удалить" danger onClick={() => deleteNode()}>
              <Trash2 size={15} />
            </BarBtn>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function BarBtn({
  onClick,
  active,
  danger,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-7 min-w-7 items-center justify-center rounded-lg px-1 transition-colors",
        disabled && "cursor-not-allowed opacity-35",
        !disabled && active && !danger && "bg-accent-soft text-accent-soft-text",
        !disabled && !active && !danger && "text-muted hover:bg-surface-2 hover:text-text",
        !disabled && danger && "text-muted hover:bg-surface-2 hover:text-danger",
      )}
    >
      {children}
    </button>
  );
}
