"use client";

import { useEffect } from "react";

/** Не зациклиться на перезагрузках: не чаще раза в 12 секунд. */
function reloadOnce(reason: string) {
  try {
    const key = "parviz-reload-at";
    const last = Number(sessionStorage.getItem(key) || "0");
    if (Date.now() - last < 12000) return; // уже недавно перезагружались — стоп
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    /* приватный режим — просто перезагрузимся */
  }
  console.warn("[parviz] авто-перезагрузка:", reason);
  window.location.reload();
}

const CHUNK_ERROR =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|error loading dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module/i;

/**
 * Регистрирует сервис-воркер (оффлайн-оболочка) и делает деплой безопасным для
 * установленного PWA. Раньше после обновления сервера в браузере продолжал жить
 * старый бандл: часть кнопок открывает код с ленивой подгрузкой (диалоги,
 * редактор, загрузка фото), а нужного чанка после деплоя уже нет на сервере →
 * ChunkLoadError, и клик «молча» ничего не делал. Помогала только ручная
 * перезагрузка. Теперь:
 *  1) при ошибке подгрузки чанка один раз сами перезагружаемся на свежий HTML;
 *  2) при появлении нового воркера активируем его и перезагружаемся.
 */
export function ServiceWorker() {
  useEffect(() => {
    // ── 1. Ловим устаревшие чанки после деплоя ──
    const onError = (e: ErrorEvent) => {
      if (CHUNK_ERROR.test(e?.message || "")) reloadOnce("chunk (error)");
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e?.reason;
      const msg = typeof r === "string" ? r : r?.message || r?.name || "";
      if (CHUNK_ERROR.test(msg)) reloadOnce("chunk (rejection)");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // ── 2. Сервис-воркер и его обновления ──
    let cleanupSw = () => {};
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const sw = navigator.serviceWorker;

      let reloading = false;
      const onControllerChange = () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      };
      // Перезагружаемся только если контроллер уже был (обновление, не первая
      // установка) — чтобы не дёргать страницу при первом визите.
      if (sw.controller) sw.addEventListener("controllerchange", onControllerChange);

      const promoteWaiting = (reg: ServiceWorkerRegistration) => {
        if (reg.waiting && sw.controller) reg.waiting.postMessage("skip-waiting");
      };

      const register = async () => {
        try {
          const reg = await sw.register("/sw.js", { scope: "/" });
          reg.update().catch(() => {});
          promoteWaiting(reg);
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed") promoteWaiting(reg);
            });
          });
        } catch {
          /* оффлайн-оболочка не критична */
        }
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });

      const onVisible = () => {
        if (document.visibilityState !== "visible") return;
        sw.getRegistration()
          .then((reg) => reg?.update().catch(() => {}))
          .catch(() => {});
      };
      document.addEventListener("visibilitychange", onVisible);

      cleanupSw = () => {
        sw.removeEventListener("controllerchange", onControllerChange);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      cleanupSw();
    };
  }, []);
  return null;
}
