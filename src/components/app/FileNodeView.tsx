"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtFileSize } from "@/lib/file-upload";

function pickIcon(name: string, mime: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return { Icon: FileImage, tone: "#6366f1" };
  if (mime.startsWith("video/")) return { Icon: FileVideo, tone: "#a855f7" };
  if (mime.startsWith("audio/")) return { Icon: FileAudio, tone: "#ec4899" };
  if (mime === "application/pdf" || ext === "pdf")
    return { Icon: FileText, tone: "#ef4444" };
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext))
    return { Icon: FileArchive, tone: "#f59e0b" };
  if (["xls", "xlsx", "csv", "numbers"].includes(ext))
    return { Icon: FileSpreadsheet, tone: "#22a06b" };
  if (
    ["js", "ts", "tsx", "jsx", "json", "html", "css", "py", "go", "rs", "java", "c", "cpp", "sh"].includes(ext)
  )
    return { Icon: FileCode, tone: "#0ea5e9" };
  if (["doc", "docx", "rtf", "txt", "md", "pages"].includes(ext))
    return { Icon: FileText, tone: "#3b82f6" };
  return { Icon: FileIcon, tone: "#64748b" };
}

export function FileNodeView(props: NodeViewProps) {
  const { node, selected, editor, deleteNode } = props;
  const href = node.attrs.href as string | null;
  const name = (node.attrs.name as string) || "Файл";
  const size = (node.attrs.size as number) || 0;
  const mime = (node.attrs.mime as string) || "";
  const editable = editor.isEditable;
  const { Icon, tone } = pickIcon(name, mime);

  return (
    <NodeViewWrapper className="pv-file-view" data-selected={selected ? "true" : undefined}>
      <div
        contentEditable={false}
        className={cn(
          "group relative my-1.5 flex items-center gap-3 rounded-xl border bg-surface p-2.5 pr-3 transition-colors",
          selected ? "border-accent" : "border-border hover:border-border-strong hover:bg-surface-2",
        )}
      >
        <a
          href={href || "#"}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 flex-1 items-center gap-3"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in oklab, ${tone} 15%, transparent)`, color: tone }}
          >
            <Icon size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-text">{name}</span>
            <span className="block text-[12px] text-faint">
              {[mime.split("/")[1]?.toUpperCase(), fmtFileSize(size)].filter(Boolean).join(" · ") || "файл"}
            </span>
          </span>
        </a>

        <a
          href={href || "#"}
          target="_blank"
          rel="noreferrer"
          aria-label="Скачать"
          title="Скачать"
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <Download size={16} />
        </a>

        {editable && (
          <button
            type="button"
            aria-label="Удалить файл"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => deleteNode()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted opacity-0 transition-all hover:bg-surface-2 hover:text-danger group-hover:opacity-100"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}
