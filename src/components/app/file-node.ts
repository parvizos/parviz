import { Node, mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FileNodeView } from "./FileNodeView";

/**
 * Вложение-файл: карточка со значком типа, именем и размером, ведёт на
 * /api/files/[id]. Сериализуется как `<a class="pv-file" href data-*>`.
 */
export const FileAttachment = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: { default: null, parseHTML: (el) => el.getAttribute("href") },
      name: {
        default: "Файл",
        parseHTML: (el) =>
          el.getAttribute("data-name") || el.textContent?.trim() || "Файл",
      },
      size: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-size")) || 0,
      },
      mime: { default: "", parseHTML: (el) => el.getAttribute("data-mime") || "" },
    };
  },

  parseHTML() {
    return [{ tag: "a.pv-file" }];
  },

  renderHTML({ node }) {
    const { href, name, size, mime } = node.attrs;
    return [
      "a",
      mergeAttributes({
        class: "pv-file",
        href: href || "#",
        "data-name": name,
        "data-size": String(size || 0),
        "data-mime": mime || "",
        target: "_blank",
        rel: "noreferrer",
      }),
      name,
    ] as DOMOutputSpec;
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileNodeView);
  },
});
