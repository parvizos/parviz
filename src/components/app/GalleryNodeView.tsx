"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Columns2,
  Columns3,
  Columns4,
  Captions,
  Plus,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { uploadImage } from "@/lib/image-upload";
import type { GalleryImage } from "./gallery-node";
import { Lightbox } from "./Lightbox";

export function GalleryNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor, deleteNode } = props;
  const images = (node.attrs.images as GalleryImage[]) ?? [];
  const columns = (node.attrs.columns as number) ?? 3;
  const caption = node.attrs.caption as string | null;

  const editable = editor.isEditable;
  const capRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [hover, setHover] = useState(false);
  const [uploading, setUploading] = useState(0);

  useEffect(() => {
    const t = capRef.current;
    if (t) {
      t.style.height = "auto";
      t.style.height = `${t.scrollHeight}px`;
    }
  }, [caption]);

  function remove(idx: number) {
    const next = images.filter((_, i) => i !== idx);
    if (next.length === 0) deleteNode();
    else updateAttributes({ images: next });
  }
  function toggleCaption() {
    if (caption == null) {
      updateAttributes({ caption: "" });
      requestAnimationFrame(() => capRef.current?.focus());
    } else {
      updateAttributes({ caption: null });
    }
  }
  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    e.target.value = "";
    if (!files.length) return;
    setUploading((n) => n + files.length);
    const added: GalleryImage[] = [];
    for (const file of files) {
      try {
        const url = await uploadImage(file);
        if (url) added.push({ src: url });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (added.length) updateAttributes({ images: [...images, ...added] });
  }

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
    gap: 8,
  };
  const controls = editable && (selected || hover);

  return (
    <NodeViewWrapper className="pv-gallery-view" data-cols={columns}>
      <div
        style={{ position: "relative" }}
        contentEditable={false}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div style={gridStyle}>
          {images.map((im, idx) => (
            <div
              key={`${idx}-${im.src}`}
              className="group/cell relative aspect-square overflow-hidden rounded-xl bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={im.src}
                alt=""
                draggable={false}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(idx);
                }}
                style={{ height: "100%", width: "100%", objectFit: "cover", borderRadius: 0, margin: 0 }}
                className="cursor-zoom-in transition-transform duration-200 hover:scale-[1.03]"
              />
              {editable && (
                <button
                  type="button"
                  aria-label="Убрать фото"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(idx);
                  }}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/75 group-hover/cell:opacity-100"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}

          {uploading > 0 &&
            Array.from({ length: uploading }).map((_, k) => (
              <div
                key={`up-${k}`}
                className="flex aspect-square items-center justify-center rounded-xl bg-surface-2 text-muted"
              >
                <Loader2 size={20} className="animate-spin" />
              </div>
            ))}
        </div>

        {caption != null && (
          <textarea
            ref={capRef}
            value={caption}
            rows={1}
            placeholder="Подпись к галерее…"
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            onBlur={() => {
              if (!caption.trim()) updateAttributes({ caption: null });
            }}
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            readOnly={!editable}
            className="mt-1.5 w-full resize-none overflow-hidden border-0 bg-transparent text-center text-[13px] italic leading-snug text-muted outline-none placeholder:not-italic placeholder:text-faint"
          />
        )}

        {controls && (
          <div
            className="absolute -top-11 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-surface px-1 py-1 shadow-[var(--shadow-lg)]"
            onMouseDown={(e) => e.preventDefault()}
          >
            <BarBtn label="2 в ряд" active={columns === 2} onClick={() => updateAttributes({ columns: 2 })}>
              <Columns2 size={15} />
            </BarBtn>
            <BarBtn label="3 в ряд" active={columns === 3} onClick={() => updateAttributes({ columns: 3 })}>
              <Columns3 size={15} />
            </BarBtn>
            <BarBtn label="4 в ряд" active={columns === 4} onClick={() => updateAttributes({ columns: 4 })}>
              <Columns4 size={15} />
            </BarBtn>
            <Sep />
            <BarBtn label="Добавить фото" onClick={() => fileRef.current?.click()}>
              <Plus size={15} />
            </BarBtn>
            <BarBtn label="Подпись" active={caption != null} onClick={toggleCaption}>
              <Captions size={15} />
            </BarBtn>
            <Sep />
            <BarBtn label="Удалить галерею" danger onClick={() => deleteNode()}>
              <Trash2 size={15} />
            </BarBtn>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onPick}
        />
      </div>

      {lightbox != null && (
        <Lightbox
          images={images.map((im) => im.src)}
          start={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
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
