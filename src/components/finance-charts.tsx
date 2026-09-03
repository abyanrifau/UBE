import { MONTH_NAMES, money, moneyCompact } from '@/lib/format';

export type MonthPoint = { month: number; income: number; expenses: number; net: number };

/** Pads a sparse set of months into a full 12-month series. */
export function toSeries(
  rows: { month_number: number; income: number; expenses: number; net: number }[],
): MonthPoint[] {
  const byMonth = new Map(rows.map((r) => [r.month_number, r]));
  return Array.from({ length: 12 }, (_, i) => {
    const row = byMonth.get(i + 1);
    return {
      month: i + 1,
      income: Number(row?.income ?? 0),
      expenses: Number(row?.expenses ?? 0),
      net: Number(row?.net ?? 0),
    };
  });
}

/** Rounds an axis maximum up to something a human would choose. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

/* ------------------------------------------------------------------ */
/* Income vs expenses                                                  */
/* ------------------------------------------------------------------ */

export function IncomeExpenseChart({ data }: { data: MonthPoint[] }) {
  const W = 720;
  const H = 260;
  const PAD = { top: 16, right: 8, bottom: 32, left: 56 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 0));
  const slot = plotW / 12;
  const barW = Math.min(14, (slot - 8) / 2);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  const hasData = data.some((d) => d.income > 0 || d.expenses > 0);

  return (
    <figure className="card p-5">
      <figcaption className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <span className="eyebrow">Income vs expenses</span>
        <span className="flex items-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-ink" aria-hidden />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 border border-ink" aria-hidden />
            Expenses
          </span>
        </span>
      </figcaption>

      {!hasData ? (
        <p className="py-14 text-center text-[13px] text-muted">
          No entries logged for this year yet.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-3 w-full text-ink"
          role="img"
          aria-label="Monthly income compared with expenses"
        >
          <defs>
            <pattern id="hatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="1.6" />
            </pattern>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke="currentColor"
                strokeWidth="1"
                opacity={t === 0 ? 0.5 : 0.14}
              />
              <text
                x={PAD.left - 8}
                y={y(t) + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
                opacity="0.55"
              >
                {moneyCompact(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            return (
              <g key={d.month}>
                <rect
                  x={cx - barW - 1.5}
                  y={y(d.income)}
                  width={barW}
                  height={Math.max(0, PAD.top + plotH - y(d.income))}
                  fill="currentColor"
                />
                <rect
                  x={cx + 1.5}
                  y={y(d.expenses)}
                  width={barW}
                  height={Math.max(0, PAD.top + plotH - y(d.expenses))}
                  fill="url(#hatch)"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <text
                  x={cx}
                  y={H - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  opacity="0.55"
                >
                  {MONTH_NAMES[i][0]}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Running balance                                                     */
/* ------------------------------------------------------------------ */

export function RunningBalanceChart({ data }: { data: MonthPoint[] }) {
  const W = 720;
  const H = 220;
  const PAD = { top: 18, right: 8, bottom: 32, left: 56 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  let running = 0;
  const points = data.map((d) => {
    running += d.net;
    return { month: d.month, balance: running };
  });

  const values = points.map((p) => p.balance);
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  const max = niceMax(rawMax);
  const min = rawMin < 0 ? -niceMax(Math.abs(rawMin)) : 0;
  const span = max - min || 1;

  const x = (i: number) => PAD.left + (plotW / 11) * i;
  const y = (v: number) => PAD.top + plotH - ((v - min) / span) * plotH;

  const hasData = data.some((d) => d.income > 0 || d.expenses > 0);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.balance)}`).join(' ');
  const area = `${path} L ${x(11)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const final = points[11].balance;

  return (
    <figure className="card p-5">
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <span className="eyebrow">Running balance</span>
        <span className="text-[13px] font-bold tabular-nums">{money(final)} at year end</span>
      </figcaption>

      {!hasData ? (
        <p className="py-12 text-center text-[13px] text-muted">Nothing to plot yet.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-3 w-full text-ink"
          role="img"
          aria-label="Cumulative balance across the year"
        >
          <defs>
            <pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.7" fill="currentColor" opacity="0.3" />
            </pattern>
          </defs>

          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(0)}
            y2={y(0)}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <text
            x={PAD.left - 8}
            y={y(0) + 3.5}
            textAnchor="end"
            fontSize="10"
            fill="currentColor"
            opacity="0.55"
          >
            {moneyCompact(0)}
          </text>
          <text
            x={PAD.left - 8}
            y={y(max) + 3.5}
            textAnchor="end"
            fontSize="10"
            fill="currentColor"
            opacity="0.55"
          >
            {moneyCompact(max)}
          </text>

          <path d={area} fill="url(#dots)" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />

          {points.map((p, i) => (
            <g key={p.month}>
              <circle cx={x(i)} cy={y(p.balance)} r="2.5" fill="currentColor" />
              <text
                x={x(i)}
                y={H - 12}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                opacity="0.55"
              >
                {MONTH_NAMES[i][0]}
              </text>
            </g>
          ))}
        </svg>
      )}
    </figure>
  );
}
