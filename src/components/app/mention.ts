import { Node, mergeAttributes, Extension, type Editor, type Range } from "@tiptap/core";
import { Suggestion } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";

export type MentionKind = "person" | "project" | "page";

export type MentionItem = {
  type: MentionKind;
  id: string;
  label: string;
  href: string;
  icon?: string | null;
};

export type MentionState = {
  items: MentionItem[];
  rect: DOMRect | null;
  command: (item: MentionItem) => void;
};

export type MentionHandlers = {
  getItems: (query: string) => MentionItem[];
  onOpen: (state: MentionState) => void;
  onUpdate: (state: MentionState) => void;
  onKeyDown: (event: KeyboardEvent) => boolean;
  onClose: () => void;
};

/**
 * Инлайн-упоминание (@человек / проект / страница). Хранится как ссылка
 * `<a data-mention data-mention-id …>` — идеальный round-trip и удобный поиск
 * обратных ссылок (LIKE по data-mention-id).
 */
export const Mention = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      mentionType: {
        default: "page",
        parseHTML: (el) => el.getAttribute("data-mention-type") || "page",
        renderHTML: (a) => ({ "data-mention-type": a.mentionType }),
      },
      mentionId: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-mention-id") || "",
        renderHTML: (a) => ({ "data-mention-id": a.mentionId }),
      },
      label: {
        default: "",
        parseHTML: (el) =>
          el.getAttribute("data-mention-label") ??
          (el.textContent || "").replace(/^@/, ""),
        renderHTML: (a) => ({ "data-mention-label": a.label }),
      },
      href: {
        default: "#",
        parseHTML: (el) => el.getAttribute("href") || "#",
        renderHTML: (a) => ({ href: a.href }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-mention]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes({ "data-mention": "", class: "mention" }, HTMLAttributes),
      `@${node.attrs.label}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label}`;
  },
});

/** Расширение со всплывающим меню упоминаний (символ «@»). */
export function createMentionCommand(handlers: MentionHandlers) {
  return Extension.create({
    name: "mentionCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion<MentionItem>({
          editor: this.editor,
          char: "@",
          pluginKey: new PluginKey("mentionSuggestion"),
          allowSpaces: false,
          startOfLine: false,
          items: ({ query }) => handlers.getItems(query),
          command: ({ editor, range, props }: { editor: Editor; range: Range; props: MentionItem }) => {
            // Заменяем весь диапазон «@запрос» на чип (официальный паттерн —
            // надёжнее, чем deleteRange + insertContent).
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: "mention",
                  attrs: {
                    mentionType: props.type,
                    mentionId: props.id,
                    label: props.label,
                    href: props.href,
                  },
                },
                { type: "text", text: " " },
              ])
              .run();
          },
          render: () => ({
            onStart: (props) =>
              handlers.onOpen({
                items: props.items,
                rect: props.clientRect?.() ?? null,
                command: (item) => props.command(item),
              }),
            onUpdate: (props) =>
              handlers.onUpdate({
                items: props.items,
                rect: props.clientRect?.() ?? null,
                command: (item) => props.command(item),
              }),
            onKeyDown: (props) => handlers.onKeyDown(props.event),
            onExit: () => handlers.onClose(),
          }),
        }),
      ];
    },
  });
}
