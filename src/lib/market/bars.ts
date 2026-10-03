import { etParts } from "@/lib/market/time";

/** Opening-range logic reads one-minute bars. A daily print must not land in a five-minute bucket. */
export function isStrategyBar(timeframe: string) {
  return timeframe === "1m";
}

export type Candle = {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** Collapse one-minute prints into 5-minute candles, in Eastern Time. */
export function fiveMinuteCandles(bars: Candle[]): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const bar of bars) {
    const z = etParts(new Date(bar.t));
    const start = z.minutes - (z.minutes % 5);
    const key = `${z.dateKey}-${String(start).padStart(4, "0")}`;
    const list = groups.get(key) ?? [];
    list.push(bar);
    groups.set(key, list);
  }
  return [...groups.values()]
    .map((list) => {
      const ordered = [...list].sort((a, b) => a.t - b.t);
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      return {
        t: first.t,
        open: first.open,
        high: Math.max(...ordered.map((bar) => bar.high)),
        low: Math.min(...ordered.map((bar) => bar.low)),
        close: last.close,
        volume: ordered.reduce((sum, bar) => sum + bar.volume, 0),
      };
    })
    .sort((a, b) => a.t - b.t);
}
