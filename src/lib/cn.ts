import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// twMerge разрешает конфликты Tailwind-утилит: если и в базовом классе, и в
// переданном есть, скажем, ширина (w-full и w-14) — побеждает последняя, как и
// ожидаешь от переопределения. Без этого CSS-порядок решал сам, и w-full мог
// «съесть» w-14 (из-за чего поля в диалогах ломались по ширине).
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
