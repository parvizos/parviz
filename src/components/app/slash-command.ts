import { Extension, type Editor, type Range } from "@tiptap/core";
import { Suggestion } from "@tiptap/suggestion";
import type { ReactNode } from "react";

export type SlashItem = {
  title: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string[];
  run: (editor: Editor, range: Range) => void;
};

export type SlashState = {
  items: SlashItem[];
  rect: DOMRect | null;
  command: (item: SlashItem) => void;
};

export type SlashHandlers = {
  getItems: (query: string) => SlashItem[];
  onOpen: (state: SlashState) => void;
  onUpdate: (state: Omit<SlashState, "command">) => void;
  onKeyDown: (event: KeyboardEvent) => boolean;
  onClose: () => void;
};

export function createSlashCommand(handlers: SlashHandlers) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion<SlashItem>({
          editor: this.editor,
          char: "/",
          allowSpaces: false,
          startOfLine: false,
          items: ({ query }) => handlers.getItems(query),
          command: ({ editor, range, props }) => props.run(editor, range),
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
              }),
            onKeyDown: (props) => handlers.onKeyDown(props.event),
            onExit: () => handlers.onClose(),
          }),
        }),
      ];
    },
  });
}
