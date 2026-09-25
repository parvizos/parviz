import { Image as BaseImage } from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./ImageNodeView";

export type ImageAlign = "left" | "center" | "right";

/**
 * Картинка с управлением размером и положением.
 * Поверх базовой ноды добавляем атрибуты width/align/wrap и React-node-view
 * с ручками ресайза и панелькой выравнивания. В HTML всё сериализуется как
 * инлайновые атрибуты (`style="width"`, `data-align`, `data-wrap`), поэтому
 * сохранённый контент выглядит одинаково и в редакторе, и при простом рендере.
 */
export const ResizableImage = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as number | null,
        parseHTML: (el) => {
          const raw = el.style.width || el.getAttribute("width") || "";
          const n = parseInt(raw, 10);
          return Number.isFinite(n) && n > 0 ? n : null;
        },
        renderHTML: (attrs) =>
          attrs.width ? { style: `width: ${attrs.width}px` } : {},
      },
      align: {
        default: "center" as ImageAlign,
        parseHTML: (el) => (el.getAttribute("data-align") as ImageAlign) || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align ?? "center" }),
      },
      wrap: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-wrap") === "true",
        renderHTML: (attrs) => (attrs.wrap ? { "data-wrap": "true" } : {}),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
