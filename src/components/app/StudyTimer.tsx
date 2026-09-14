"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Play, Pause, Square, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { logStudySession } from "@/lib/study-actions";
import { clientToday, type SubjectOption } from "./types";

const PRESETS = [15, 25, 50];

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StudyTimer({ subjectOptions }: { subjectOptions: SubjectOption[] }) {
  const [durationMin, setDurationMin] = useState(25);
  const [subjectId, setSubjectId] = useState("");
  const [mode, setMode] = useState<"idle" | "running" | "paused" | "done">("idle");
  const [remaining, setRemaining] = useState(25 * 60);
  const [manual, setManual] = useState("");
  const endRef = useRef<number | null>(null);
  const [, startTransition] = useTransition();

  // Настройки из прошлого раза (внешнее состояние из localStorage после монтирования).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("parviz-focus");
      if (raw) {
        const j = JSON.parse(raw) as { durationMin?: number; subjectId?: string };
        /* eslint-disable react-hooks/set-state-in-effect */
        if (j.durationMin && PRESETS.includes(j.durationMin)) {
          setDurationMin(j.durationMin);
          setRemaining(j.durationMin * 60);
        }
        if (j.subjectId) setSubjectId(j.subjectId);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "parviz-focus",
        JSON.stringify({ durationMin, subjectId }),
      );
    } catch {}
  }, [durationMin, subjectId]);

  function log(seconds: number) {
    if (seconds < 30) return;
    startTransition(async () => {
      try {
        await logStudySession({
          subjectId: subjectId || null,
          seconds,
          date: clientToday(),
        });
      } catch {}
    });
  }

  // Тик по таймеру от абсолютной метки времени — точно при переключении вкладок.
  useEffect(() => {
    if (mode !== "running") return;
    const id = setInterval(() => {
      if (endRef.current == null) return;
      const rem = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        endRef.current = null;
        setMode("done");
        log(durationMin * 60);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, durationMin]);

  function start() {
    const secs = mode === "paused" ? remaining : durationMin * 60;
    endRef.current = Date.now() + secs * 1000;
    setRemaining(secs);
    setMode("running");
  }
  function pause() {
    endRef.current = null;
    setMode("paused");
  }
  function stop() {
    const elapsed = durationMin * 60 - remaining;
    log(elapsed);
    endRef.current = null;
    setRemaining(durationMin * 60);
    setMode("idle");
  }
  function reset() {
    endRef.current = null;
    setRemaining(durationMin * 60);
    setMode("idle");
  }
  function chooseDuration(min: number) {
    setDurationMin(min);
    setRemaining(min * 60);
    setMode("idle");
    endRef.current = null;
  }

  const total = durationMin * 60;
  const progress = total > 0 ? (total - remaining) / total : 0;
  const R = 78;
  const C = 2 * Math.PI * R;
  const running = mode === "running";
  const active = mode === "running" || mode === "paused";

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      {/* Предмет + пресеты */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          disabled={active}
          className="h-9 max-w-[220px] flex-1"
          aria-label="Предмет"
        >
          <option value="">Без предмета</option>
          {subjectOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="flex gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={active}
              onClick={() => chooseDuration(p)}
              className={cn(
                "h-9 rounded-lg px-3 text-[13px] font-medium transition-colors disabled:opacity-40",
                durationMin === p
                  ? "bg-accent-soft text-accent-soft-text"
                  : "border border-border text-muted hover:bg-surface-2",
              )}
            >
              {p}м
            </button>
          ))}
        </div>
      </div>

      {/* Кольцо */}
      <div className="flex flex-col items-center">
        <div className="relative h-[180px] w-[180px]">
          <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
            <circle
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke="var(--surface-3)"
              strokeWidth="10"
            />
            <circle
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={mode === "done" ? "var(--success)" : "var(--accent)"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.3s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[40px] font-semibold tabular text-text">
              {mmss(remaining)}
            </div>
            <div className="text-[12px] text-faint">
              {mode === "done"
                ? "готово 🎉"
                : running
                  ? "фокус…"
                  : mode === "paused"
                    ? "пауза"
                    : `${durationMin} минут`}
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="mt-6 flex items-center gap-2">
          {mode === "done" ? (
            <Button size="md" onClick={reset}>
              <Check size={17} /> Записано, ещё
            </Button>
          ) : running ? (
            <>
              <Button size="md" variant="secondary" onClick={pause}>
                <Pause size={17} /> Пауза
              </Button>
              <Button size="md" onClick={stop}>
                <Square size={16} /> Стоп
              </Button>
            </>
          ) : (
            <>
              <Button size="md" onClick={start}>
                <Play size={17} /> {mode === "paused" ? "Продолжить" : "Старт"}
              </Button>
              {mode === "paused" && (
                <Button size="md" variant="secondary" onClick={stop}>
                  <Square size={16} /> Стоп
                </Button>
              )}
              {mode === "paused" && (
                <Button size="md" variant="ghost" onClick={reset}>
                  <RotateCcw size={16} />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Записать время вручную */}
      <div className="mt-6 flex items-center gap-2 border-t border-border pt-4">
        <span className="text-[12.5px] text-muted">Записать вручную:</span>
        <Input
          inputMode="numeric"
          placeholder="минут"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          className="h-9 w-24"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const m = Number(manual);
            if (m > 0) {
              log(m * 60);
              setManual("");
            }
          }}
        >
          + Добавить
        </Button>
      </div>
    </div>
  );
}
