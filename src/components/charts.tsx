"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { aggregateEquity, type EquityRange } from "@/lib/portfolio/equity";
import { formatUsd } from "@/lib/market/time";
import { Button } from "@/components/ui/button";

const ranges: EquityRange[] = ["hour", "day", "month", "year", "all"];

export function EquityChart({ points }: { points: { t: number; equityCents: number }[] }) {
  const [range, setRange] = useState<EquityRange>("day");
  const now = points.at(-1)?.t ?? Date.now();
  const data = useMemo(
    () => aggregateEquity(points, range, now).map((point) => ({
      t: point.t,
      label: new Date(point.t).toLocaleString("en-US", range === "hour" ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric" }),
      equity: point.equityCents / 100,
    })),
    [points, range, now],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ranges.map((item) => (
          <Button key={item} type="button" size="sm" variant={item === range ? "default" : "outline"} onClick={() => setRange(item)}>
            {item}
          </Button>
        ))}
      </div>
      <div className="h-64 md:h-80">
        {data.length < 2 ? (
          <p className="text-sm text-[var(--muted)]">Equity marks will appear after the worker records a session.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.45} minTickGap={24} />
              <YAxis
                domain={[(min: number) => min * 0.995, (max: number) => max * 1.005]}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                opacity={0.45}
                width={72}
                tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
              />
              <Tooltip formatter={(value) => formatUsd(Math.round(Number(value) * 100))} />
              <Area type="monotone" dataKey="equity" stroke="#7c3aed" fill="url(#equityFill)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function PriceChart({ points }: { points: { t: number; close: number }[] }) {
  const span = points.length > 1 ? points[points.length - 1].t - points[0].t : 0;
  const withDate = span > 20 * 60 * 60 * 1000;
  const data = points.map((point) => ({
    label: new Date(point.t).toLocaleString("en-US", withDate
      ? { month: "short", day: "numeric", timeZone: "America/New_York" }
      : { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }),
    close: point.close,
  }));
  if (data.length < 2) return <p className="text-sm text-[var(--muted)]">SPY prints show up once the worker has a session.</p>;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={28} stroke="currentColor" opacity={0.4} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={64} stroke="currentColor" opacity={0.4} />
          <Tooltip />
          <Area type="monotone" dataKey="close" stroke="#6d28d9" fill="#7c3aed55" strokeWidth={2.5} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PnlBars({ rows }: { rows: { label: string; pnl: number }[] }) {
  if (!rows.length) return <p className="text-sm text-[var(--muted)]">Closed trades will build this chart.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.45} />
          <YAxis tick={{ fontSize: 11 }} width={64} stroke="currentColor" opacity={0.45} />
          <Tooltip formatter={(value) => formatUsd(Math.round(Number(value) * 100))} />
          <Bar dataKey="pnl" fill="#7c3aed" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
