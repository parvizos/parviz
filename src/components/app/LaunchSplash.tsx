"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Премиум-заставка при запуске: логотип пружинисто появляется, ниже — вордмарк,
 * затем всё плавно растворяется, открывая приложение. Показывается один раз за
 * сессию (холодный запуск PWA/вкладки), уважает prefers-reduced-motion.
 */
export function LaunchSplash() {
  const [phase, setPhase] = useState<"show" | "out" | "gone">("show");

  useEffect(() => {
    let launched = false;
    try {
      launched = sessionStorage.getItem("parviz-launched") === "1";
    } catch {}
    if (launched) {
      const t = setTimeout(() => setPhase("gone"), 0);
      return () => clearTimeout(t);
    }
    try {
      sessionStorage.setItem("parviz-launched", "1");
    } catch {}
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    const hold = reduce ? 300 : 1150;
    const t1 = setTimeout(() => setPhase("out"), hold);
    const t2 = setTimeout(() => setPhase("gone"), hold + 480);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0d0d10] transition-opacity duration-[480ms] ease-out",
        phase === "out" ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <div className="pointer-events-none absolute h-[360px] w-[360px] rounded-full bg-accent/25 blur-[100px]" />
      <div className="relative flex flex-col items-center">
        <div className="splash-logo flex h-[88px] w-[88px] items-center justify-center rounded-[24px] bg-accent text-[46px] font-bold text-white shadow-[0_24px_70px_-15px_rgba(91,91,214,0.85)]">
          P
        </div>
        <div className="splash-word mt-5 text-center">
          <div className="text-[23px] font-semibold tracking-tight text-white">
            ParvizOS
          </div>
          <div className="mt-1 text-[13px] text-white/45">личная система</div>
        </div>
      </div>
    </div>
  );
}
