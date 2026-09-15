"use client";

/*
 * Двигатель напоминаний: пока приложение открыто, следит за задачами на сегодня
 * с заданным временем и в нужную минуту показывает тост (и системное уведомление,
 * если разрешено). Фоновые пуши при закрытом приложении — отдельная задача (web push).
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { toggleTask } from "@/lib/actions";

type Rem = { id: string; title: string; time: string };
const STORE = "parviz-reminded";

function loadFired(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}
function saveFired(m: Record<string, true>) {
  try {
    localStorage.setItem(STORE, JSON.stringify(m));
  } catch {}
}
function nowHM(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ReminderEngine() {
  const { toast } = useToast();
  const router = useRouter();
  const tasksRef = useRef<Rem[]>([]);
  const dayRef = useRef<string>("");

  useEffect(() => {
    let alive = true;

    async function fetchTasks() {
      try {
        const res = await fetch("/api/reminders", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const json = (await res.json()) as { today: string; tasks: Rem[] };
        if (!alive) return;
        tasksRef.current = json.tasks;
        // Новый день — забываем отметки о прошлых напоминаниях.
        if (dayRef.current && dayRef.current !== json.today) saveFired({});
        dayRef.current = json.today;
      } catch {}
    }

    function fireReminder(task: Rem) {
      toast({
        title: "Напоминание",
        body: `${task.title} · ${task.time}`,
        duration: 0, // напоминание не исчезает само
        onClick: () => router.push("/segodnya"),
        actions: [
          {
            label: "Выполнить",
            onClick: () => void toggleTask(task.id, true).catch(() => {}),
          },
        ],
      });
      try {
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          const n = new Notification(`⏰ ${task.title}`, {
            body: `Напоминание · ${task.time}`,
            tag: task.id,
          });
          n.onclick = () => {
            window.focus();
            router.push("/segodnya");
            n.close();
          };
        }
      } catch {}
    }

    function check() {
      const day = dayRef.current;
      if (!day) return;
      const now = nowHM();
      const fired = loadFired();
      let changed = false;
      for (const task of tasksRef.current) {
        const key = `${task.id}:${day}`;
        if (fired[key]) continue;
        if (task.time <= now) {
          fired[key] = true;
          changed = true;
          fireReminder(task);
        }
      }
      if (changed) saveFired(fired);
    }

    void fetchTasks().then(check);
    const fetchInt = setInterval(fetchTasks, 3 * 60 * 1000); // список — раз в 3 мин
    const checkInt = setInterval(check, 30 * 1000); // время — каждые 30 сек
    return () => {
      alive = false;
      clearInterval(fetchInt);
      clearInterval(checkInt);
    };
  }, [toast, router]);

  return null;
}
