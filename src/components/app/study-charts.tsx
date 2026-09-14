import { gradeTone } from "@/lib/study-format";
import type { GpaPoint, WeekPoint, GradeBar } from "@/lib/study-queries";

const MON = new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" });
function monShort(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return MON.format(new Date(Date.UTC(y, m - 1, 1))).replace(".", "");
}

/* ─────────────────────  Средний балл по месяцам (линия)  ───────────────────── */

export function GpaLineChart({ points }: { points: GpaPoint[] }) {
  const W = 720;
  const H = 200;
  const padL = 10;
  const padR = 10;
  const padT = 16;
  const padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;
  const yMax = 5;
  const yMin = Math.min(3, ...points.filter((p) => p.gpa5 > 0).map((p) => p.gpa5), 5);
  const range = yMax - yMin || 1;

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - yMin) / range) * innerH;

  // Рисуем линию только по месяцам, где уже есть оценки.
  const withData = points.map((p, i) => ({ ...p, i })).filter((p) => p.gpa5 > 0);
  const line = withData.map((p) => `${x(p.i)},${y(p.gpa5)}`).join(" ");
  const last = withData[withData.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Средний балл по месяцам">
      {[yMin, (yMin + yMax) / 2, yMax].map((gl) => (
        <g key={gl}>
          <line x1={padL} x2={W - padR} y1={y(gl)} y2={y(gl)} stroke="var(--border)" />
          <text x={padL} y={y(gl) - 3} fontSize="10" fill="var(--faint)">
            {gl.toFixed(1)}
          </text>
        </g>
      ))}
      <polyline
        points={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {withData.map((p) => (
        <circle key={p.month} cx={x(p.i)} cy={y(p.gpa5)} r={p.i === last?.i ? 3.5 : 2} fill="var(--accent)" />
      ))}
      {points.map((p, i) =>
        i % 2 === 0 || i === n - 1 ? (
          <text key={p.month} x={x(i)} y={H - 7} textAnchor="middle" fontSize="11" fill="var(--faint)">
            {monShort(p.month)}
          </text>
        ) : null,
      )}
      {last && (
        <text x={W - padR} y={y(last.gpa5) - 8} textAnchor="end" fontSize="13" fontWeight="600" fill="var(--accent)">
          {last.gpa5.toFixed(2)}
        </text>
      )}
    </svg>
  );
}

/* ────────────────────  Часы фокуса по неделям (столбики)  ──────────────────── */

export function HoursBarChart({ points }: { points: WeekPoint[] }) {
  const W = 720;
  const H = 200;
  const padL = 10;
  const padR = 10;
  const padT = 16;
  const padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;
  const max = Math.max(...points.map((p) => p.seconds), 1);
  const slot = innerW / n;
  const barW = Math.min(slot * 0.5, 40);
  const baseY = padT + innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Часы фокуса по неделям">
      <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke="var(--border)" />
      {points.map((p, i) => {
        const cx = padL + slot * i + slot / 2;
        const h = (p.seconds / max) * innerH;
        return (
          <g key={p.label + i}>
            <rect x={cx - barW / 2} y={baseY - h} width={barW} height={h} rx="4" fill="var(--accent)" opacity={p.seconds > 0 ? 0.9 : 0.2} />
            {p.seconds > 0 && (
              <text x={cx} y={baseY - h - 4} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {Math.round(p.seconds / 60 / 6) / 10}ч
              </text>
            )}
            <text x={cx} y={H - 7} textAnchor="middle" fontSize="10.5" fill="var(--faint)">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────────  Распределение оценок (столбики)  ───────────────────── */

export function GradeDistributionChart({ bars }: { bars: GradeBar[] }) {
  const max = Math.max(...bars.map((b) => b.count), 1);
  return (
    <div className="flex items-end justify-around gap-3 pt-2" style={{ height: 160 }}>
      {bars.map((b) => {
        const tone = gradeTone(b.grade / 5);
        const h = (b.count / max) * 120;
        return (
          <div key={b.grade} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="text-[12px] font-semibold tabular text-muted">{b.count}</div>
            <div
              className="w-full max-w-[56px] rounded-t-lg transition-all"
              style={{
                height: Math.max(h, b.count > 0 ? 6 : 2),
                background: b.count > 0 ? tone : "var(--surface-3)",
              }}
            />
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold tabular"
              style={{ background: `color-mix(in oklab, ${tone} 16%, transparent)`, color: tone }}
            >
              {b.grade}
            </div>
          </div>
        );
      })}
    </div>
  );
}
