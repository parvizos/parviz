import { Node, mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { VideoNodeView } from "./VideoNodeView";
import type { ImageAlign } from "./image-node";

/**
 * Видео: инлайновый плеер с управлением размером и выравниванием.
 * Сериализуется как `<video class="pv-video" src controls data-align style>`.
 */
export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null, parseHTML: (el) => el.getAttribute("src") },
      width: {
        default: null as number | null,
        parseHTML: (el) => {
          const raw = (el as HTMLElement).style?.width || "";
          const n = parseInt(raw, 10);
          return Number.isFinite(n) && n > 0 ? n : null;
        },
      },
      align: {
        default: "center" as ImageAlign,
        parseHTML: (el) => (el.getAttribute("data-align") as ImageAlign) || "center",
      },
    };
  },

  parseHTML() {
    return [{ tag: "video.pv-video" }, { tag: "video[src]" }];
  },

  renderHTML({ node }) {
    const { src, width, align } = node.attrs;
    const attrs: Record<string, string> = {
      class: "pv-video",
      src: src || "",
      controls: "",
      preload: "metadata",
      "data-align": align ?? "center",
    };
    if (width) attrs.style = `width: ${width}px`;
    return ["video", mergeAttributes(attrs)] as DOMOutputSpec;
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },
});
