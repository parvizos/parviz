"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
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
  Maximize2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { ImageAlign } from "./image-node";

const MIN_W = 120;
const PRESETS: { label: string; width: number }[] = [
  { label: "S", width: 280 },
  { label: "M", width: 460 },
  { label: "L", width: 680 },
];

export function VideoNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor, deleteNode } = props;
  const src = node.attrs.src as string;
  const width = node.attrs.width as number | null;
  const align = (node.attrs.align as ImageAlign) ?? "center";

  const editable = editor.isEditable;
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragW, setDragW] = useState<number | null>(null);
  const [hover, setHover] = useState(false);

  const displayW = dragW ?? width;
  const controls = editable && (selected || hover);

  const maxWidth = useCallback(() => {
    const w = editor.view.dom.getBoundingClientRect().width;
    return w > 0 ? Math.round(w) : 900;
  }, [editor]);

  const beginResize = useCallback(
    (side: "left" | "right") => (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const box = boxRef.current;
      if (!box) return;
      const startX = e.clientX;
      const startW = box.getBoundingClientRect().width;
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

  const wrapperStyle: CSSProperties = {
    display: "flex",
    justifyContent:
      align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
  };
  const innerStyle: CSSProperties = {
    position: "relative",
    width: displayW ? `${displayW}px` : "100%",
    maxWidth: "100%",
  };
  const handle =
    "absolute top-1/2 z-10 h-10 w-1.5 -translate-y-1/2 cursor-ew-resize rounded-full bg-accent shadow ring-2 ring-surface";

  return (
    <NodeViewWrapper className="pv-video-view" style={wrapperStyle} data-align={align}>
      <div
        ref={boxRef}
        style={innerStyle}
        contentEditable={false}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <video
          src={src}
          controls
          preload="metadata"
          style={{ minHeight: 140 }}
          className={cn("block w-full rounded-xl bg-black object-contain", selected && "ring-2 ring-accent")}
        />

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

        {dragW != null && (
          <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {dragW}px
          </span>
        )}

        {controls && (
          <div
            className="absolute -top-11 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-surface px-1 py-1 shadow-[var(--shadow-lg)]"
            onMouseDown={(e) => e.preventDefault()}
          >
            <BarBtn label="Слева" active={align === "left"} onClick={() => updateAttributes({ align: "left" })}>
              <AlignLeft size={15} />
            </BarBtn>
            <BarBtn label="По центру" active={align === "center"} onClick={() => updateAttributes({ align: "center" })}>
              <AlignCenter size={15} />
            </BarBtn>
            <BarBtn label="Справа" active={align === "right"} onClick={() => updateAttributes({ align: "right" })}>
              <AlignRight size={15} />
            </BarBtn>
            <Sep />
            {PRESETS.map((p) => (
              <BarBtn key={p.label} label={`Размер ${p.label}`} active={width === p.width} onClick={() => updateAttributes({ width: p.width })}>
                <span className="text-[12px] font-semibold">{p.label}</span>
              </BarBtn>
            ))}
            <BarBtn label="Во всю ширину" active={width == null} onClick={() => updateAttributes({ width: null })}>
              <Maximize2 size={14} />
            </BarBtn>
            <Sep />
            <BarBtn label="Удалить" danger onClick={() => deleteNode()}>
              <Trash2 size={15} />
            </BarBtn>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px bg-border" />;
}

function BarBtn({
  onClick,
  active,
  danger,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-7 min-w-7 items-center justify-center rounded-lg px-1 transition-colors",
        active && !danger && "bg-accent-soft text-accent-soft-text",
        !active && !danger && "text-muted hover:bg-surface-2 hover:text-text",
        danger && "text-muted hover:bg-surface-2 hover:text-danger",
      )}
    >
      {children}
    </button>
  );
}
