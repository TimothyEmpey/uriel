import type { Side } from "@/lib/risk/types";

export type MarkedTrade = {
  side: Side;
  quantity: number;
  mark: number;
};

export type MarkedHolding = {
  quantity: number;
  mark: number;
};

export function marketValueCents(quantity: number, price: number) {
  return Math.round(quantity * price * 100);
}

export function accountEquityCents(input: {
  cashCents: number;
  holdings: MarkedHolding[];
  openTrades: MarkedTrade[];
}) {
  let equity = input.cashCents;
  for (const holding of input.holdings) {
    equity += marketValueCents(holding.quantity, holding.mark);
  }
  for (const trade of input.openTrades) {
    if (trade.side === "LONG") equity += marketValueCents(trade.quantity, trade.mark);
    else equity -= marketValueCents(trade.quantity, trade.mark);
  }
  return equity;
}

export type SnapshotPoint = { t: number; equityCents: number };

export type EquityRange = "hour" | "day" | "month" | "year" | "all";

const RANGE_MS: Record<Exclude<EquityRange, "all">, number> = {
  hour: 48 * 60 * 60 * 1000,
  day: 90 * 24 * 60 * 60 * 1000,
  month: 24 * 30 * 24 * 60 * 60 * 1000,
  year: 5 * 365 * 24 * 60 * 60 * 1000,
};

function bucketKey(t: number, range: EquityRange) {
  const date = new Date(t);
  if (range === "hour") {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours());
  }
  if (range === "day" || range === "all") {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  // Month and year views both keep a monthly mark. A calendar-year bucket
  // collapses a new book to one point, and the chart needs two.
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function aggregateEquity(points: SnapshotPoint[], range: EquityRange, now: number) {
  const cutoff = range === "all" ? Number.NEGATIVE_INFINITY : now - RANGE_MS[range];
  const buckets = new Map<number, SnapshotPoint>();
  for (const point of points) {
    if (point.t < cutoff || point.t > now + 60_000) continue;
    buckets.set(bucketKey(point.t, range), point);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, point]) => ({ t: bucket, equityCents: point.equityCents }));
}
