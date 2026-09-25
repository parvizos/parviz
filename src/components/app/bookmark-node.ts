import { Node, mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { BookmarkNodeView } from "./BookmarkNodeView";

/**
 * Закладка/встраивание внешней ссылки: карточка + живое превью для
 * Google Диска, Документов, YouTube и т.п. Сериализуется как
 * `<a class="pv-bookmark" href data-title data-preview>`.
 */
export const LinkEmbed = Node.create({
  name: "linkEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: null, parseHTML: (el) => el.getAttribute("href") },
      title: {
        default: null,
        parseHTML: (el) =>
          el.getAttribute("data-title") || el.textContent?.trim() || null,
      },
      preview: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-preview") !== "false",
      },
    };
  },

  parseHTML() {
    return [{ tag: "a.pv-bookmark" }];
  },

  renderHTML({ node }) {
    const { url, title, preview } = node.attrs;
    return [
      "a",
      mergeAttributes({
        class: "pv-bookmark",
        href: url || "#",
        "data-title": title ?? "",
        "data-preview": preview ? "true" : "false",
        target: "_blank",
        rel: "noreferrer",
      }),
      title || url || "Ссылка",
    ] as DOMOutputSpec;
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkNodeView);
  },
});
