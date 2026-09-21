import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Выноска (callout) как в Notion: цветная плашка с эмодзи-иконкой.
 * Иконка и цвет — из варианта (через CSS ::before), поэтому нода — обычный
 * контентный <div data-callout data-variant>, который идеально round-trip'ится
 * в HTML и обратно.
 */
export type CalloutVariant = "info" | "warn" | "success" | "note";

const VARIANTS: CalloutVariant[] = ["info", "warn", "success", "note"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant?: CalloutVariant) => ReturnType;
      toggleCallout: (variant?: CalloutVariant) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info" as CalloutVariant,
        parseHTML: (el) => {
          const v = el.getAttribute("data-variant");
          return VARIANTS.includes(v as CalloutVariant) ? v : "info";
        },
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-callout": "" }, HTMLAttributes), 0];
  },

  addCommands() {
    const name = this.name;
    return {
      setCallout:
        (variant = "info") =>
        ({ commands }) =>
          commands.wrapIn(name, { variant }),
      toggleCallout:
        (variant = "info") =>
        ({ commands, editor }) =>
          editor.isActive(name)
            ? commands.lift(name)
            : commands.wrapIn(name, { variant }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(name),
    };
  },
});
