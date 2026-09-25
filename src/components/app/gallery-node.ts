import { Node, mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { GalleryNodeView } from "./GalleryNodeView";

export type GalleryImage = { src: string };

/**
 * Галерея — несколько фото в ряд (сетка). Сериализуется как
 * `<div class="pv-gallery" data-cols="3"><img>…<figcaption></div>`, поэтому
 * состав, число колонок и подпись переживают перезагрузку.
 */
export const ImageGallery = Node.create({
  name: "imageGallery",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [] as GalleryImage[],
        parseHTML: (el) =>
          Array.from(el.querySelectorAll("img"))
            .map((img) => ({ src: img.getAttribute("src") || "" }))
            .filter((x) => x.src),
      },
      columns: {
        default: 3,
        parseHTML: (el) => Number(el.getAttribute("data-cols")) || 3,
      },
      caption: {
        default: null as string | null,
        parseHTML: (el) =>
          el.querySelector("figcaption")?.textContent?.trim() || null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.pv-gallery" }];
  },

  renderHTML({ node }) {
    const images = (node.attrs.images as GalleryImage[]) ?? [];
    const children: unknown[] = images.map((im) => ["img", { src: im.src }]);
    if (node.attrs.caption) children.push(["figcaption", {}, node.attrs.caption]);
    return [
      "div",
      mergeAttributes({
        class: "pv-gallery",
        "data-cols": String(node.attrs.columns || 3),
      }),
      ...children,
    ] as unknown as DOMOutputSpec;
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryNodeView);
  },
});
