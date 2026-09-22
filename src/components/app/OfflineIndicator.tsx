"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Ненавязчивая плашка, когда пропала сеть. */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[150] flex justify-center pb-[max(14px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3.5 py-2 text-[13px] font-medium text-muted shadow-[var(--shadow-lg)] backdrop-blur">
        <WifiOff size={15} className="text-warning" />
        Нет сети — работаешь офлайн
      </div>
    </div>
  );
}
