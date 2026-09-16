"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Кнопка «назад» — возвращает туда, откуда пришли (задачи/уроки открывают со многих экранов). */
export function BackLink({ label = "Назад" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
    >
      <ArrowLeft size={15} /> {label}
    </button>
  );
}
