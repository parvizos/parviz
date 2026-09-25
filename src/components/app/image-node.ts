import { Image as BaseImage } from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./ImageNodeView";

export type ImageAlign = "left" | "center" | "right";

function attr(el: HTMLElement, name: string): string | null {
  return (
    el.getAttribute(name) ||
    el.querySelector?.("img")?.getAttribute(name) ||
    null
  );
}
function styleWidth(el: HTMLElement): number | null {
  const raw =
    el.style?.width ||
    (el.querySelector?.("img") as HTMLElement | null)?.style?.width ||
    el.getAttribute("width") ||
    "";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Картинка с управлением размером, положением и подписью.
 * Атрибуты width/align/wrap/caption сериализуются в HTML: без подписи — как
 * `<img style data-align data-wrap>`, с подписью — как
 * `<figure class="pv-figure"><img><figcaption></figure>`, поэтому размер,
 * положение и подпись переживают перезагрузку и простой рендер HTML.
 */
export const ResizableImage = BaseImage.extend({
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => attr(el, "src"),
      },
      alt: {
        default: null,
        parseHTML: (el) => attr(el, "alt"),
      },
      title: {
        default: null,
        parseHTML: (el) => attr(el, "title"),
      },
      width: {
        default: null as number | null,
        parseHTML: (el) => styleWidth(el),
      },
      align: {
        default: "center" as ImageAlign,
        parseHTML: (el) => (attr(el, "data-align") as ImageAlign) || "center",
      },
      wrap: {
        default: false,
        parseHTML: (el) => attr(el, "data-wrap") === "true",
      },
      caption: {
        default: null as string | null,
        parseHTML: (el) =>
          el.querySelector?.("figcaption")?.textContent?.trim() || null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure.pv-figure" }, { tag: "img[src]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, title, width, align, wrap, caption } = node.attrs;
    const layout: Record<string, string> = { "data-align": align ?? "center" };
    if (width) layout.style = `width: ${width}px`;
    if (wrap && align !== "center") layout["data-wrap"] = "true";

    if (caption) {
      return [
        "figure",
        mergeAttributes({ class: "pv-figure" }, layout),
        [
          "img",
          mergeAttributes(this.options.HTMLAttributes, {
            src,
            alt: alt ?? undefined,
            title: title ?? undefined,
          }),
        ],
        ["figcaption", {}, caption],
      ] as DOMOutputSpec;
    }

    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        src,
        alt: alt ?? undefined,
        title: title ?? undefined,
        ...layout,
      }),
    ] as DOMOutputSpec;
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
