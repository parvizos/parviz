"use client";

import { useEffect } from "react";
import { allCaptures, removeCapture } from "@/lib/capture-queue";

/**
 * Досылает записи из офлайн-очереди на сервер: при возвращении сети и при заходе
 * в приложение. Один владелец очереди — без дублей.
 */
export function CaptureSync() {
  useEffect(() => {
    let running = false;
    async function flush() {
      if (running || typeof navigator === "undefined" || !navigator.onLine) {
        return;
      }
      running = true;
      try {
        const items = await allCaptures();
        for (const it of items) {
          try {
            const res = await fetch("/api/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind: it.kind, text: it.text }),
            });
            if (res.ok) await removeCapture(it.id);
            else if (res.status === 401) break; // не авторизованы — позже
          } catch {
            break; // снова офлайн — позже
          }
        }
      } catch {
        /* нет IndexedDB — ничего страшного */
      } finally {
        running = false;
      }
    }
    const t = setTimeout(flush, 1500);
    window.addEventListener("online", flush);
    return () => {
      clearTimeout(t);
      window.removeEventListener("online", flush);
    };
  }, []);
  return null;
}
