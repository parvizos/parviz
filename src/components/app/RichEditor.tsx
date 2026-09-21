"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Image } from "@tiptap/extension-image";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type ChangeEvent,
} from "react";
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
  ImagePlus,
  Camera,
  Pen,
  Type,
  Minus,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { createSlashCommand, type SlashItem, type SlashState } from "./slash-command";
import { SketchPad } from "./SketchPad";
import { ImageCropper } from "./ImageCropper";
import { uploadImage } from "@/lib/image-upload";

function insertImage(editor: Editor, url: string, pos?: number) {
  if (pos != null) {
    editor.chain().focus().insertContentAt(pos, { type: "image", attrs: { src: url } }).run();
  } else {
    editor.chain().focus().setImage({ src: url }).run();
  }
}

function Btn({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: ReactNode;
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

function Toolbar({
  editor,
  onImage,
  onCamera,
  onSketch,
}: {
  editor: Editor;
  onImage: () => void;
  onCamera: () => void;
  onSketch: () => void;
}) {
  const sep = <span className="mx-0.5 h-5 w-px bg-border" />;
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <Btn label="Заголовок" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={17} />
      </Btn>
      <Btn label="Подзаголовок" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={17} />
      </Btn>
      {sep}
      <Btn label="Жирный" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={16} />
      </Btn>
      <Btn label="Курсив" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={16} />
      </Btn>
      {sep}
      <Btn label="Список" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={17} />
      </Btn>
      <Btn label="Нумерованный список" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={17} />
      </Btn>
      <Btn label="Чек-лист" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListChecks size={17} />
      </Btn>
      {sep}
      <Btn label="Цитата" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={16} />
      </Btn>
      <Btn label="Код" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code2 size={16} />
      </Btn>
      {sep}
      <Btn label="Картинка" onClick={onImage}>
        <ImagePlus size={16} />
      </Btn>
      <Btn label="Сфоткать доску" onClick={onCamera}>
        <Camera size={16} />
      </Btn>
      <Btn label="Нарисовать" onClick={onSketch}>
        <Pen size={16} />
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
  toolbarStickyClass = "top-14 lg:top-2",
}: {
  initialHTML: string;
  placeholder?: string;
  onChange?: (html: string, text: string) => void;
  toolbar?: boolean;
  minHeightClass?: string;
  toolbarStickyClass?: string;
}) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const editorRef = useRef<Editor | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [sketchOpen, setSketchOpen] = useState(false);
  const [cropQueue, setCropQueue] = useState<File[]>([]);

  // Состояние слэш-меню.
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const slashRef = useRef<SlashState | null>(null);
  const slashIndexRef = useRef(0);

  const SLASH_ITEMS: SlashItem[] = [
    { title: "Текст", icon: <Type size={16} />, keywords: ["text", "параграф"], run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
    { title: "Заголовок 1", icon: <Heading1 size={16} />, keywords: ["h1", "заголовок"], run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 1 }).run() },
    { title: "Заголовок 2", icon: <Heading2 size={16} />, keywords: ["h2", "подзаголовок"], run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 2 }).run() },
    { title: "Список", icon: <List size={16} />, keywords: ["bullet", "маркер"], run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
    { title: "Нумерованный список", icon: <ListOrdered size={16} />, keywords: ["number", "цифры"], run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
    { title: "Чек-лист", icon: <ListChecks size={16} />, keywords: ["todo", "задачи", "чекбокс"], run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
    { title: "Цитата", icon: <Quote size={16} />, keywords: ["quote"], run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
    { title: "Код", icon: <Code2 size={16} />, keywords: ["code", "код"], run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
    { title: "Разделитель", icon: <Minus size={16} />, keywords: ["hr", "линия"], run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
    { title: "Картинка", icon: <ImagePlus size={16} />, keywords: ["image", "картинка"], run: (e, r) => { e.chain().focus().deleteRange(r).run(); fileInputRef.current?.click(); } },
    { title: "Камера", icon: <Camera size={16} />, keywords: ["camera", "фото", "доска", "снимок"], run: (e, r) => { e.chain().focus().deleteRange(r).run(); cameraInputRef.current?.click(); } },
    { title: "Рисунок", icon: <Pen size={16} />, keywords: ["draw", "рисовать", "формула", "схема", "sketch"], run: (e, r) => { e.chain().focus().deleteRange(r).run(); setSketchOpen(true); } },
  ];

  function getItems(query: string): SlashItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.keywords?.some((k) => k.includes(q)),
    );
  }

  function onSlashKeyDown(e: KeyboardEvent): boolean {
    const s = slashRef.current;
    if (!s || s.items.length === 0) return false;
    if (e.key === "ArrowDown") {
      const n = Math.min(slashIndexRef.current + 1, s.items.length - 1);
      slashIndexRef.current = n;
      setSlashIndex(n);
      return true;
    }
    if (e.key === "ArrowUp") {
      const n = Math.max(slashIndexRef.current - 1, 0);
      slashIndexRef.current = n;
      setSlashIndex(n);
      return true;
    }
    if (e.key === "Enter") {
      const item = s.items[slashIndexRef.current];
      if (item) s.command(item);
      return true;
    }
    return false;
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: placeholder ?? "Пиши здесь…  Нажми «/» для команд.",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, allowBase64: false }),
      // Рефы читаются только в колбэках слэш-меню (не во время рендера).
      // eslint-disable-next-line react-hooks/refs
      createSlashCommand({
        getItems,
        onOpen: (state) => {
          slashRef.current = state;
          slashIndexRef.current = 0;
          setSlash(state);
          setSlashIndex(0);
        },
        onUpdate: (state) => {
          setSlash((s) => {
            const next = s ? { ...s, items: state.items, rect: state.rect } : s;
            slashRef.current = next;
            return next;
          });
          slashIndexRef.current = 0;
          setSlashIndex(0);
        },
        onKeyDown: onSlashKeyDown,
        onClose: () => {
          slashRef.current = null;
          setSlash(null);
        },
      }),
    ],
    content: initialHTML || "",
    editorProps: {
      attributes: { class: cn("outline-none", minHeightClass) },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach(async (file) => {
          const url = await uploadImage(file);
          if (url && editorRef.current) insertImage(editorRef.current, url);
        });
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;
        files.forEach(async (file) => {
          const url = await uploadImage(file);
          if (url && editorRef.current) insertImage(editorRef.current, url, pos);
        });
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML(), editor.getText()),
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const h = () => force();
    editor.on("transaction", h);
    return () => {
      editor.off("transaction", h);
    };
  }, [editor]);

  function onFilePick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    e.target.value = "";
    // Выбранные фото сначала прогоняем через обрезку (по одному), потом грузим.
    if (files.length) setCropQueue(files);
  }

  async function uploadAndInsert(file: File) {
    const url = await uploadImage(file);
    if (url && editorRef.current) insertImage(editorRef.current, url);
  }

  return (
    <div>
      {toolbar && editor && (
        <div
          className={cn(
            "sticky z-10 -mx-1 mb-3 flex items-center rounded-xl border border-border bg-surface/90 px-1.5 py-1 backdrop-blur",
            toolbarStickyClass,
          )}
        >
          <Toolbar
            editor={editor}
            onImage={() => fileInputRef.current?.click()}
            onCamera={() => cameraInputRef.current?.click()}
            onSketch={() => setSketchOpen(true)}
          />
        </div>
      )}

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onFilePick}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFilePick}
      />

      {sketchOpen && editor && (
        <SketchPad
          onClose={() => setSketchOpen(false)}
          onSave={async (file) => {
            // Рисунок — тонкие линии, перекодировать нельзя: грузим как есть.
            const url = await uploadImage(file, { compress: false });
            if (url && editorRef.current) insertImage(editorRef.current, url);
          }}
        />
      )}

      {cropQueue.length > 0 && (
        <ImageCropper
          key={`${cropQueue.length}:${cropQueue[0].name}`}
          file={cropQueue[0]}
          title="Обрезать фото"
          onCancel={() => setCropQueue((q) => q.slice(1))}
          onCrop={(cropped) => {
            setCropQueue((q) => q.slice(1));
            void uploadAndInsert(cropped);
          }}
        />
      )}

      {slash && slash.rect && slash.items.length > 0 && (
        <div
          className="fixed z-50 w-64 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-lg)]"
          style={{
            top: Math.min(slash.rect.bottom + 6, window.innerHeight - 320),
            left: Math.min(slash.rect.left, window.innerWidth - 272),
          }}
        >
          {slash.items.map((item, i) => (
            <button
              key={item.title}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => {
                slashIndexRef.current = i;
                setSlashIndex(i);
              }}
              onClick={() => slash.command(item)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px]",
                i === slashIndex ? "bg-surface-2 text-text" : "text-muted",
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center text-faint">
                {item.icon}
              </span>
              <span className="flex-1 text-text">{item.title}</span>
              {i === slashIndex && (
                <CornerDownLeft size={13} className="text-faint" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
