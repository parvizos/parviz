"use client";

import { createContext, useContext } from "react";
import type { MentionItem } from "./mention";

/**
 * Список того, что можно упомянуть (@) в любом редакторе. Пустой по умолчанию,
 * чтобы RichEditor работал и вне провайдера.
 */
const MentionCtx = createContext<MentionItem[]>([]);

export const MentionProvider = MentionCtx.Provider;

export function useMentionOptions(): MentionItem[] {
  return useContext(MentionCtx);
}
