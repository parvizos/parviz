import { formatMoneyShort } from "@/lib/money";
import type { CapitalPoint, MonthPoint } from "@/lib/finance-queries";

const MON = new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" });
function monShort(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return MON.format(new Date(Date.UTC(y, m - 1, 1))).replace(".", "");
}

/* ─────────────────────  Капитал по месяцам (линия)  ───────────────────── */

export function CapitalChart({
  points,
  base,
}: {
  points: CapitalPoint[];
  base: string;
}) {
  const W = 720;
  const H = 220;
  const padL = 10;
  const padR = 10;
  const padT = 18;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;

  const caps = points.map((p) => p.capital);
  const yMax = Math.max(...caps, 1);
  const yMin = Math.min(0, ...caps);
  const range = yMax - yMin || 1;

  const x = (i: number) =>
    padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - yMin) / range) * innerH;

  const line = points.map((p, i) => `${x(i)},${y(p.capital)}`).join(" ");
  const area = `M ${x(0)},${y(yMin)} L ${points
    .map((p, i) => `${x(i)},${y(p.capital)}`)
    .join(" L ")} L ${x(n - 1)},${y(yMin)} Z`;

  const zeroY = y(0);
  const last = points[n - 1]?.capital ?? 0;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Капитал по месяцам"
    >
      {/* Нулевая линия */}
      {yMin < 0 && (
        <line
          x1={padL}
          x2={W - padR}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--border-strong)"
          strokeDasharray="3 3"
        />
      )}
      {/* Верхняя сетка */}
      <line
        x1={padL}
        x2={W - padR}
        y1={padT}
        y2={padT}
        stroke="var(--border)"
      />
      <path d={area} fill="var(--accent)" opacity="0.12" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle
          key={p.month}
          cx={x(i)}
          cy={y(p.capital)}
          r={i === n - 1 ? 3.5 : 0}
          fill="var(--accent)"
        />
      ))}
      {/* Подписи месяцев */}
      {points.map((p, i) =>
        i % 2 === 0 || i === n - 1 ? (
          <text
            key={p.month}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill="var(--faint)"
          >
            {monShort(p.month)}
          </text>
        ) : null,
      )}
      {/* Значение максимума */}
      <text x={padL} y={padT - 5} fontSize="11" fill="var(--faint)">
        {formatMoneyShort(yMax, base)}
      </text>
      {/* Текущее значение */}
      <text
        x={W - padR}
        y={y(last) - 8}
        textAnchor="end"
        fontSize="12"
        fontWeight="600"
        fill="var(--accent)"
      >
        {formatMoneyShort(last, base)}
      </text>
    </svg>
  );
}

/* ────────────────  Доход/расход по месяцам (столбики)  ──────────────── */

export function IncomeExpenseChart({
  points,
  base,
}: {
  points: MonthPoint[];
  base: string;
}) {
  const W = 720;
  const H = 220;
  const padL = 10;
  const padR = 10;
  const padT = 16;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;

  const max = Math.max(...points.flatMap((p) => [p.income, p.expense]), 1);
  const slot = innerW / n;
  const barW = Math.min(slot * 0.32, 26);
  const gap = 3;
  const h = (v: number) => (v / max) * innerH;
  const baseY = padT + innerH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Доход и расход по месяцам"
    >
      <line
        x1={padL}
        x2={W - padR}
        y1={baseY}
        y2={baseY}
        stroke="var(--border)"
      />
      {points.map((p, i) => {
        const cx = padL + slot * i + slot / 2;
        const incH = h(p.income);
        const expH = h(p.expense);
        return (
          <g key={p.month}>
            <rect
              x={cx - barW - gap / 2}
              y={baseY - incH}
              width={barW}
              height={incH}
              rx="3"
              fill="var(--success)"
            />
            <rect
              x={cx + gap / 2}
              y={baseY - expH}
              width={barW}
              height={expH}
              rx="3"
              fill="var(--danger)"
            />
            <text
              x={cx}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--faint)"
            >
              {monShort(p.month)}
            </text>
          </g>
        );
      })}
      <text x={padL} y={padT - 3} fontSize="11" fill="var(--faint)">
        {formatMoneyShort(max, base)}
      </text>
    </svg>
  );
}
