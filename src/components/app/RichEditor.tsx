"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { useEffect, useReducer } from "react";
import {
  Heading1,
  Heading2,
  Bold,
  Italic,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/cn";

function Btn({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-accent-soft text-accent-soft-text"
          : "text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const sep = <span className="mx-0.5 h-5 w-px bg-border" />;
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <Btn
        label="Заголовок"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={17} />
      </Btn>
      <Btn
        label="Подзаголовок"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={17} />
      </Btn>
      {sep}
      <Btn
        label="Жирный"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </Btn>
      <Btn
        label="Курсив"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </Btn>
      {sep}
      <Btn
        label="Список"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={17} />
      </Btn>
      <Btn
        label="Нумерованный список"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={17} />
      </Btn>
      <Btn
        label="Чек-лист"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListChecks size={17} />
      </Btn>
      {sep}
      <Btn
        label="Цитата"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </Btn>
      <Btn
        label="Код"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 size={16} />
      </Btn>
    </div>
  );
}

export function RichEditor({
  initialHTML,
  placeholder,
  onChange,
  toolbar = true,
  minHeightClass = "min-h-[45vh]",
}: {
  initialHTML: string;
  placeholder?: string;
  onChange?: (html: string, text: string) => void;
  toolbar?: boolean;
  minHeightClass?: string;
}) {
  const [, force] = useReducer((x: number) => x + 1, 0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder ?? "Пиши здесь…" }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: initialHTML || "",
    editorProps: { attributes: { class: cn("outline-none", minHeightClass) } },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML(), editor.getText()),
  });

  // Перерисовываем панель при изменении выделения/содержимого.
  useEffect(() => {
    if (!editor) return;
    const h = () => force();
    editor.on("transaction", h);
    return () => {
      editor.off("transaction", h);
    };
  }, [editor]);

  return (
    <div>
      {toolbar && editor && (
        <div className="sticky top-14 z-10 -mx-1 mb-3 flex items-center rounded-xl border border-border bg-surface/90 px-1.5 py-1 backdrop-blur lg:top-2">
          <Toolbar editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
