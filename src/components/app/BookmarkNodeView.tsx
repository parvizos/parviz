"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { CSSProperties } from "react";
import {
  HardDrive,
  FileText,
  Table,
  Presentation,
  Folder,
  Play,
  Globe,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { parseLink, type LinkKind } from "@/lib/link-embed";

const META: Record<LinkKind, { Icon: typeof Globe; tone: string }> = {
  "drive-file": { Icon: HardDrive, tone: "#1a73e8" },
  "google-doc": { Icon: FileText, tone: "#1a73e8" },
  "google-sheet": { Icon: Table, tone: "#0f9d58" },
  "google-slide": { Icon: Presentation, tone: "#f4b400" },
  "drive-folder": { Icon: Folder, tone: "#5f6368" },
  youtube: { Icon: Play, tone: "#ff0000" },
  web: { Icon: Globe, tone: "#64748b" },
};

function previewHeight(kind: LinkKind): CSSProperties {
  if (kind === "youtube" || kind === "google-slide")
    return { aspectRatio: "16 / 9" };
  if (kind === "drive-folder") return { height: 300 };
  return { height: 460 };
}

export function BookmarkNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor, deleteNode } = props;
  const url = (node.attrs.url as string) || "";
  const title = node.attrs.title as string | null;
  const preview = Boolean(node.attrs.preview);
  const editable = editor.isEditable;

  const info = parseLink(url);
  const { Icon, tone } = META[info.kind];
  const canEmbed = !!info.embedUrl;
  const showEmbed = canEmbed && preview;

  return (
    <NodeViewWrapper className="pv-bookmark-view" data-kind={info.kind}>
      <div
        contentEditable={false}
        className={cn(
          "group my-2 overflow-hidden rounded-xl border bg-surface transition-colors",
          selected ? "border-accent" : "border-border hover:border-border-strong",
        )}
      >
        <div className="flex items-center gap-3 p-2.5">
          <a
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 flex-1 items-center gap-3"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in oklab, ${tone} 14%, transparent)`, color: tone }}
            >
              <Icon size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-text">
                {title || info.label}
              </span>
              <span className="block truncate text-[12px] text-faint">{info.host}</span>
            </span>
          </a>

          {canEmbed && (
            <button
              type="button"
              aria-label={showEmbed ? "Скрыть превью" : "Показать превью"}
              title={showEmbed ? "Скрыть превью" : "Показать превью"}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => updateAttributes({ preview: !preview })}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              {showEmbed ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          <a
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
            aria-label="Открыть"
            title="Открыть"
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ExternalLink size={16} />
          </a>
          {editable && (
            <button
              type="button"
              aria-label="Удалить"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => deleteNode()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted opacity-0 transition-all hover:bg-surface-2 hover:text-danger group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {showEmbed && info.embedUrl && (
          <iframe
            src={info.embedUrl}
            title={title || info.label}
            loading="lazy"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
            style={{ ...previewHeight(info.kind), border: 0 }}
            className="block w-full border-t border-border bg-black/5"
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}
