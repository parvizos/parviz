"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { areaColor } from "@/lib/task-format";
import { cn } from "@/lib/cn";
import { uploadImage } from "@/lib/image-upload";
import { ImageCropper } from "./ImageCropper";

function initial(name?: string): string {
  return name?.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Универсальная аватарка сущности: фото (если загружено) → эмодзи на цветной
 * плитке → первая буква названия. Форма — «squircle» (плитка с скруглением, как
 * иконка приложения) или «round» (кружок). Используется для счетов, проектов,
 * предметов, сфер, целей, категорий — везде, где раньше был только смайлик.
 */
export function EntityAvatar({
  image,
  emoji,
  color,
  tone: toneOverride,
  name,
  size = 48,
  shape = "squircle",
  className = "",
}: {
  image?: string | null;
  emoji?: string | null;
  color?: string | null;
  /** Готовый цвет плитки (перекрывает color). Для доменов со своей палитрой. */
  tone?: string;
  name?: string;
  size?: number;
  shape?: "round" | "squircle";
  className?: string;
}) {
  const dim = { width: size, height: size };
  const radius =
    shape === "round" ? size / 2 : Math.max(8, Math.round(size * 0.28));
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? ""}
        style={{ ...dim, borderRadius: radius }}
        className={cn("shrink-0 object-cover", className)}
      />
    );
  }
  const tone = toneOverride ?? areaColor(color);
  return (
    <div
      style={{
        ...dim,
        borderRadius: radius,
        background: `color-mix(in oklab, ${tone} 16%, transparent)`,
        color: tone,
        fontSize: Math.round(size * (emoji ? 0.44 : 0.4)),
      }}
      className={cn(
        "flex shrink-0 items-center justify-center font-medium leading-none",
        className,
      )}
    >
      {emoji || initial(name)}
    </div>
  );
}

/**
 * Загрузчик аватарки для диалогов: кнопка-аватар с бейджем-камерой, обрезка
 * (квадрат/круг) и загрузка в /api/images. Самодостаточный — диалогу нужно
 * лишь хранить строку-URL: <AvatarUpload value={image} onChange={setImage} …/>.
 */
export function AvatarUpload({
  value,
  onChange,
  emoji,
  color,
  tone,
  name,
  size = 60,
  shape = "squircle",
  label = "Загрузить фото",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  emoji?: string | null;
  color?: string | null;
  tone?: string;
  name?: string;
  size?: number;
  shape?: "round" | "squircle";
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) setCropFile(f);
  }
  async function onCrop(file: File) {
    setCropFile(null);
    setUploading(true);
    try {
      // Аватар показывается маленьким — 512px с запасом под ретину.
      const url = await uploadImage(file, {
        compress: { maxDim: 512, quality: 0.9 },
      });
      if (url) onChange(url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title={label}
        className={cn(
          "block outline-none ring-accent transition-[box-shadow] focus-visible:ring-2",
          shape === "round" ? "rounded-full" : "rounded-xl",
        )}
      >
        <EntityAvatar
          image={value}
          emoji={emoji}
          color={color}
          tone={tone}
          name={name}
          size={size}
          shape={shape}
        />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-accent text-accent-fg">
          {uploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Camera size={12} />
          )}
        </span>
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          title="Убрать фото"
          className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-danger text-white"
        >
          <X size={11} />
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={onPick} />
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspect={1}
          round={shape === "round"}
          title="Обрезать фото"
          onCancel={() => setCropFile(null)}
          onCrop={onCrop}
        />
      )}
    </div>
  );
}
