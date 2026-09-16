"use client";

/*
 * Двигатель напоминаний: пока приложение открыто, следит за задачами на сегодня
 * с заданным временем и в нужную минуту показывает тост (и системное уведомление,
 * если разрешено). В тосте можно отложить напоминание («+1 час» / «Завтра»).
 * Фоновые пуши при закрытом приложении — отдельная задача (web push).
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { toggleTask, updateTask } from "@/lib/actions";

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
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
function nowHM(): string {
  return hm(new Date());
}

export function ReminderEngine() {
  const { toast } = useToast();
  const router = useRouter();
  const tasksRef = useRef<Rem[]>([]);
  const dayRef = useRef<string>("");
  // Синхронная защита от повторного показа (в т.ч. при гонке двух проверок).
  const firedRef = useRef<Set<string>>(new Set());

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
        if (dayRef.current && dayRef.current !== json.today) {
          saveFired({});
          firedRef.current.clear();
        }
        dayRef.current = json.today;
      } catch {}
    }

    // Отложить напоминание: перенести время задачи и разрешить повторный показ.
    async function snooze(task: Rem, kind: "hour" | "tomorrow") {
      const d = new Date();
      let newDate: string;
      let newTime: string;
      let label: string;
      if (kind === "hour") {
        d.setTime(Date.now() + 60 * 60_000);
        newDate = ymd(d);
        newTime = hm(d);
        label = `до ${newTime}`;
      } else {
        d.setDate(d.getDate() + 1);
        newDate = ymd(d);
        newTime = task.time; // то же время, но завтра
        label = `на завтра, ${newTime}`;
      }

      // Обновляем локальное состояние движка, чтобы не сработало тут же снова.
      if (newDate === dayRef.current) {
        const t = tasksRef.current.find((x) => x.id === task.id);
        if (t) t.time = newTime;
      } else {
        tasksRef.current = tasksRef.current.filter((x) => x.id !== task.id);
      }
      const fired = loadFired();
      for (const k of [`${task.id}:${dayRef.current}`, `${task.id}:${newDate}`]) {
        delete fired[k];
        firedRef.current.delete(k);
      }
      saveFired(fired);

      // Подтверждаем сразу, задачу переносим в фоне.
      toast({ title: "Отложено", body: label, duration: 3000 });
      try {
        await updateTask(task.id, {
          scheduledDate: newDate,
          scheduledTime: newTime,
        });
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
          { label: "+1 час", onClick: () => void snooze(task, "hour") },
          { label: "Завтра", onClick: () => void snooze(task, "tomorrow") },
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
        if (firedRef.current.has(key) || fired[key]) continue;
        if (task.time <= now) {
          firedRef.current.add(key); // синхронно застолбили — гонки не будет
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
