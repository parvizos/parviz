"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Wallet,
  ListChecks,
  GraduationCap,
  Timer,
  ArrowRight,
  CalendarClock,
  Receipt,
  Handshake,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  FolderKanban,
  Flame,
  Target,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { areaColor } from "@/lib/task-format";
import { formatMoneyShort, formatMoney } from "@/lib/money";
import { formatDuration } from "@/lib/study-format";
import { ruMonthDay } from "@/lib/dates";
import type { DashData, DashUpcoming } from "@/lib/dashboard-queries";

/* ─────────────────────────  Утилиты анимации  ───────────────────────── */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** Плавный счётчик от 0 до value с форматтером кадра. */
function CountUp({
  value,
  format,
  duration = 1100,
  className,
}: {
  value: number;
  format: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value);
      return;
    }
    startRef.current = null;
    let raf = 0;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return <span className={className}>{format(display)}</span>;
}

/** Кольцо прогресса, «дорисовывается» на монтировании. */
function ProgressRing({
  value,
  max,
  size = 108,
  stroke = 9,
  color = "var(--accent)",
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const offset = mounted ? c * (1 - pct) : c;
  const dotX = size / 2 + r * Math.cos(2 * Math.PI * pct);
  const dotY = size / 2 + r * Math.sin(2 * Math.PI * pct);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="dash-ring-value"
        />
        {pct > 0.001 && (
          <circle
            cx={dotX}
            cy={dotY}
            r={stroke * 0.6}
            fill={color}
            className={cn("dash-ring-dot", mounted && "on")}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/** Мини-столбики (капитал по месяцам). */
function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  return (
    <div className="flex h-16 items-end gap-1.5">
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "min-h-[4px] flex-1 rounded-[3px]",
              last ? "dash-grow-last bg-accent" : "dash-grow bg-accent-soft",
            )}
            style={
              {
                height: `${Math.max(6, (Math.abs(v) / max) * 100)}%`,
                "--i": i,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/** Прогресс-бар, вырастающий от нуля на монтировании, с бегущим бликом. */
function AnimatedBar({
  pct,
  color,
  track,
}: {
  pct: number;
  color: string;
  track: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [w, setW] = useState(0);
  useEffect(() => {
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setW(pct);
      return;
    }
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct, reduced]);
  return (
    <div className={cn("overflow-hidden rounded-full bg-surface-3", track)}>
      <div
        className="dash-barfill h-full rounded-full transition-[width] duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: `${Math.round(w * 100)}%`, background: color }}
      />
    </div>
  );
}

/* ─────────────────────────────  Каркас  ─────────────────────────────── */

function Card({
  children,
  className,
  i = 0,
  lift = false,
}: {
  children: ReactNode;
  className?: string;
  i?: number;
  lift?: boolean;
}) {
  return (
    <div
      className={cn(
        "dash-rise rounded-2xl border border-border bg-surface",
        lift && "dash-lift",
        className,
      )}
      style={{ "--i": i } as CSSProperties}
    >
      {children}
    </div>
  );
}

function WidgetHead({
  icon: Icon,
  title,
  href,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  href: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="dash-pop flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent-soft text-accent-soft-text">
        <Icon size={16} />
      </span>
      <h2 className="text-[15px] font-semibold text-text">{title}</h2>
      {hint && <span className="text-[12px] text-faint">{hint}</span>}
      <Link
        href={href}
        className="group ml-auto flex items-center gap-1 text-[12.5px] font-medium text-muted transition-colors hover:text-accent"
      >
        Всё
        <ArrowRight
          size={13}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

/* ─────────────────────────────  Дашборд  ────────────────────────────── */

const UPCOMING_META: Record<
  DashUpcoming["kind"],
  { icon: LucideIcon; color: string; label: string }
> = {
  exam: { icon: GraduationCap, color: "var(--danger)", label: "Экзамен" },
  payment: { icon: Receipt, color: "var(--warning)", label: "Платёж" },
  task: { icon: CheckSquare, color: "var(--accent)", label: "Задача" },
  meeting: { icon: Handshake, color: "var(--success)", label: "Встреча" },
};

function daysLabel(d: number): string {
  if (d <= 0) return "сегодня";
  if (d === 1) return "завтра";
  if (d < 5) return `через ${d} дн`;
  return `через ${d} дн`;
}

function monthShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", { month: "short" })
      .format(new Date(iso + "T00:00:00"))
      .replace(".", "");
  } catch {
    return "";
  }
}

export function Dashboard({
  data,
  greeting,
  dateLabel,
  timeZone,
}: {
  data: DashData;
  greeting: string;
  dateLabel: string;
  timeZone: string;
}) {
  const { tasks, finance, study, upcoming, projects, base } = data;
  const money = (v: number) => formatMoneyShort(Math.round(v), base);

  // Живые часы в часовом поясе приложения (только после монтирования).
  const [clock, setClock] = useState<string | null>(null);
  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      }).format(new Date());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock(fmt());
    const id = setInterval(() => setClock(fmt()), 15000);
    return () => clearInterval(id);
  }, [timeZone]);

  const openTasks = tasks.todayCount + tasks.overdueCount;
  const nextUp = upcoming[0];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Герой ── */}
      <div
        className="dash-rise relative overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-7"
        style={{ "--i": 0 } as CSSProperties}
      >
        <div className="dash-aurora" />
        <div className="dash-hero-glow pointer-events-none absolute inset-0" />
        <div className="dash-sweep" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-accent-soft-text">
              <Sparkles size={15} className="dash-pop" />
              ParvizOS
            </div>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-text sm:text-[30px]">
              {greeting}, Парвиз
            </h1>
            <p className="mt-1 text-[14px] text-muted">{dateLabel}</p>

            {/* Живая сводка */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SummaryPill
                icon={ListChecks}
                text={
                  openTasks > 0
                    ? `${openTasks} ${plural(openTasks, "задача", "задачи", "задач")} на сегодня`
                    : "на сегодня чисто"
                }
                tone={tasks.overdueCount > 0 ? "danger" : "default"}
              />
              {nextUp && (
                <SummaryPill
                  icon={CalendarClock}
                  text={`${nextUp.title} · ${daysLabel(nextUp.daysLeft)}`}
                />
              )}
              {study.nextExam && (
                <SummaryPill
                  icon={GraduationCap}
                  text={`экзамен через ${study.nextExam.daysLeft} дн`}
                  tone={study.nextExam.daysLeft <= 3 ? "danger" : "default"}
                />
              )}
            </div>
          </div>

          {/* Часы */}
          <div className="text-right">
            <div
              className="text-[34px] font-semibold tabular leading-none text-text sm:text-[40px]"
              suppressHydrationWarning
            >
              {clock ?? " "}
            </div>
            <div className="mt-1 text-[12px] text-faint">{timeZone}</div>
          </div>
        </div>
      </div>

      {/* ── KPI ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          i={1}
          icon={Wallet}
          label="Капитал"
          value={<CountUp value={finance.net} format={money} className="" />}
          sub={
            finance.missingRates > 0
              ? `нет курса для ${finance.missingRates} валют`
              : "чистыми, в " + base
          }
          subTone={finance.missingRates > 0 ? "warning" : "default"}
        />
        <Kpi
          i={2}
          icon={ListChecks}
          label="Задачи сегодня"
          value={
            <CountUp
              value={openTasks}
              format={(v) => String(Math.round(v))}
            />
          }
          sub={
            tasks.overdueCount > 0
              ? `${tasks.overdueCount} просрочено`
              : "под контролем"
          }
          subTone={tasks.overdueCount > 0 ? "danger" : "success"}
        />
        <Kpi
          i={3}
          icon={GraduationCap}
          label="Средний балл"
          value={
            study.gradeCount > 0 ? (
              <CountUp value={study.gpa5} format={(v) => v.toFixed(2)} />
            ) : (
              <span className="text-faint">—</span>
            )
          }
          sub={study.termName ?? "нет семестра"}
        />
        <Kpi
          i={4}
          icon={Timer}
          label="Фокус за неделю"
          value={
            study.weekFocusSeconds > 0 ? (
              <CountUp
                value={study.weekFocusSeconds}
                format={(v) => formatDuration(Math.round(v))}
              />
            ) : (
              <span className="text-faint">—</span>
            )
          }
          sub="за 7 дней"
        />
      </div>

      {/* ── Три виджета ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Задачи */}
        <Card i={5} className="p-5">
          <WidgetHead icon={ListChecks} title="Сегодня" href="/segodnya" />
          {tasks.list.length > 0 ? (
            <div className="flex flex-col">
              {tasks.list.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 border-b border-border/70 py-2 last:border-0"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: areaColor(t.color) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">
                    {t.title}
                  </span>
                  {t.overdue && (
                    <span className="shrink-0 rounded-full bg-danger-soft px-1.5 py-0.5 text-[10.5px] font-medium text-danger">
                      просрочено
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine icon={Sparkles} text="На сегодня всё чисто" />
          )}
          <div className="mt-3 flex items-center gap-3 text-[12px] text-faint">
            <span>{tasks.todayCount} на сегодня</span>
            {tasks.overdueCount > 0 && (
              <span className="text-danger">{tasks.overdueCount} просрочено</span>
            )}
            <span className="ml-auto">{tasks.inbox} во входящих</span>
          </div>
        </Card>

        {/* Учёба */}
        <Card i={6} className="p-5">
          <WidgetHead icon={GraduationCap} title="Учёба" href="/uchyoba" />
          <div className="flex items-center gap-4">
            <ProgressRing
              value={study.gpa5}
              max={5}
              size={96}
              color={
                study.gpa5 >= 4.5
                  ? "var(--success)"
                  : study.gpa5 >= 3.5
                    ? "var(--accent)"
                    : "var(--warning)"
              }
            >
              {study.gradeCount > 0 ? (
                <>
                  <span className="text-[22px] font-semibold tabular text-text">
                    {study.gpa5.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-faint">из 5</span>
                </>
              ) : (
                <span className="text-[13px] text-faint">нет оценок</span>
              )}
            </ProgressRing>
            <div className="min-w-0 flex-1">
              {study.nextExam ? (
                <div className="rounded-xl bg-surface-2 px-3 py-2.5">
                  <div className="text-[11px] uppercase tracking-wide text-faint">
                    Ближайший экзамен
                  </div>
                  <div className="mt-0.5 truncate text-[14px] font-medium text-text">
                    {study.nextExam.title}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 text-[12.5px] font-medium tabular",
                      study.nextExam.daysLeft <= 3
                        ? "text-danger"
                        : "text-muted",
                    )}
                  >
                    {daysLabel(study.nextExam.daysLeft)} ·{" "}
                    {ruMonthDay(study.nextExam.date)}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-muted">
                  Экзаменов пока нет
                </div>
              )}
              <div className="mt-2 px-1 text-[12px] leading-relaxed text-faint">
                {study.todayLessons} пар сегодня
                {study.weekFocusSeconds > 0
                  ? ` · ${formatDuration(study.weekFocusSeconds)} фокуса`
                  : ""}
              </div>
            </div>
          </div>
        </Card>

        {/* Финансы */}
        <Card i={7} className="p-5">
          <WidgetHead icon={Wallet} title="Финансы" href="/finansy" />
          <div className="text-[24px] font-semibold tabular text-text">
            {money(finance.net)}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-wide text-faint">
            В этом месяце
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <TrendingUp size={14} />
              {formatMoney(finance.month.income, base)}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-danger">
              <TrendingDown size={14} />
              {formatMoney(finance.month.expense, base)}
            </span>
          </div>
          {finance.capitalSeries.length > 1 && (
            <div className="mt-4">
              <MiniBars values={finance.capitalSeries} />
              <div className="mt-1 text-[11px] text-faint">
                Капитал по месяцам
              </div>
            </div>
          )}
          {(finance.commitmentExpense > 0 || finance.topGoal) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[12px]">
              {finance.commitmentExpense > 0 && (
                <span className="inline-flex items-center gap-1 text-muted">
                  <Flame size={13} className="text-warning" />
                  {money(finance.commitmentExpense)}/мес обязательств
                </span>
              )}
              {finance.dueCount > 0 && (
                <span className="rounded-full bg-warning-soft px-1.5 py-0.5 font-medium text-warning">
                  {finance.dueCount} к оплате
                </span>
              )}
            </div>
          )}
          {finance.topGoal && (
            <div className="mt-2 flex items-center gap-2">
              <Target size={14} className="shrink-0 text-accent" />
              <span className="shrink-0 text-[12px] text-muted">
                {finance.topGoal.icon ? finance.topGoal.icon + " " : ""}
                {finance.topGoal.title}
              </span>
              <AnimatedBar
                pct={finance.topGoal.pct}
                color="var(--accent)"
                track="h-1.5 flex-1"
              />
              <span className="shrink-0 text-[11.5px] tabular text-faint">
                {Math.round(finance.topGoal.pct * 100)}%
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* ── Предстоящее + Проекты ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card i={8} className="p-5 lg:col-span-2">
          <WidgetHead
            icon={CalendarClock}
            title="Предстоящее"
            href="/predstoyaschee"
            hint="3 недели вперёд"
          />
          {upcoming.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {upcoming.map((u, idx) => {
                const meta = UPCOMING_META[u.kind];
                const Icon = meta.icon;
                const soon = u.daysLeft <= 3;
                return (
                  <div
                    key={idx}
                    className="dash-row group flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2 hover:shadow-[var(--shadow-sm)]"
                    style={{ "--i": idx } as CSSProperties}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-white transition-transform duration-200 group-hover:scale-[1.07]"
                      style={{ background: meta.color }}
                    >
                      <span className="text-[15px] font-semibold leading-none tabular">
                        {u.date.slice(8, 10)}
                      </span>
                      <span className="text-[9.5px] uppercase leading-tight opacity-90">
                        {monthShort(u.date)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon size={13} style={{ color: meta.color }} />
                        <span className="truncate text-[13.5px] font-medium text-text">
                          {u.title}
                        </span>
                      </div>
                      <div className="truncate text-[12px] text-faint">
                        {u.subtitle ?? meta.label}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium tabular",
                        soon
                          ? "dash-soon bg-danger-soft text-danger"
                          : "bg-surface-3 text-muted",
                      )}
                    >
                      {daysLabel(u.daysLeft)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyLine
              icon={CalendarClock}
              text="На ближайшие 3 недели ничего не запланировано"
            />
          )}
        </Card>

        {/* Проекты */}
        <Card i={9} className="p-5">
          <WidgetHead icon={FolderKanban} title="Проекты" href="/proekty" />
          {projects.length > 0 ? (
            <div className="flex flex-col gap-3.5">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/proekty/${p.id}`}
                  className="group block"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: areaColor(p.color) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-text transition-colors group-hover:text-accent">
                      {p.name}
                    </span>
                    <span className="shrink-0 text-[12px] tabular text-faint">
                      {p.done}/{p.total}
                    </span>
                  </div>
                  <AnimatedBar pct={p.pct} color={areaColor(p.color)} track="h-2" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyLine icon={FolderKanban} text="Нет активных проектов" />
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────────  Мелочи  ─────────────────────────────── */

function Kpi({
  i,
  icon: Icon,
  label,
  value,
  sub,
  subTone = "default",
}: {
  i: number;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub: string;
  subTone?: "default" | "success" | "danger" | "warning";
}) {
  const tone =
    subTone === "success"
      ? "text-success"
      : subTone === "danger"
        ? "text-danger"
        : subTone === "warning"
          ? "text-warning"
          : "text-faint";
  return (
    <Card i={i} lift className="group p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted">{label}</span>
        <span className="dash-pop flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-text transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110">
          <Icon size={15} />
        </span>
      </div>
      <div className="dash-num mt-2 text-[22px] font-semibold tabular leading-tight text-text">
        {value}
      </div>
      <div className={cn("mt-0.5 truncate text-[12px]", tone)}>{sub}</div>
    </Card>
  );
}

function SummaryPill({
  icon: Icon,
  text,
  tone = "default",
}: {
  icon: LucideIcon;
  text: string;
  tone?: "default" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px]",
        tone === "danger"
          ? "border-danger-soft bg-danger-soft text-danger"
          : "border-border bg-surface text-muted",
      )}
    >
      <Icon size={13} />
      {text}
    </span>
  );
}

function EmptyLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-faint">
        <Icon size={18} />
      </span>
      <span className="text-[13px] text-muted">{text}</span>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
