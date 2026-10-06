import { etParts, roundPrice } from "@/lib/market/time";
import { STRATEGY_ID } from "@/lib/risk/constants";
import type { Side } from "@/lib/risk/types";

export type Bar = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PullbackContext = {
  now: Date;
  bars: Bar[];
  hasOpenPosition: boolean;
  tradesTaken: number;
  consecutiveLosses: number;
  maxTrades?: number;
};

export type PullbackProposal = {
  symbol: "SPY";
  side: Side;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  setup: "VWAP_PULLBACK";
  strategy: string;
  reason: string;
  signalBarTs: number;
};

export type PullbackSnapshot = {
  ready: boolean;
  orHigh: number | null;
  orLow: number | null;
  orWidth: number | null;
  vwap: number | null;
  vwapSlope: number | null;
  standDown: string | null;
  proposal: PullbackProposal | null;
  note: string;
};

const MIN_STOP = 0.05;
const MAX_STOP_PCT = 0.0065;
const TARGET_R = 1.5;
const LIMIT_OFFSET = 0.02;
const VOLUME_FLOOR = 0.5;
/** A low within 0.04% of VWAP still counts as a tag. On a $780 SPY print that is about $0.31. */
const VWAP_BAND = 0.0004;

function aggregate(list: Bar[]): Bar {
  const ordered = [...list].sort((a, b) => a.ts - b.ts);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  return {
    ts: last.ts,
    open: first.open,
    high: Math.max(...ordered.map((bar) => bar.high)),
    low: Math.min(...ordered.map((bar) => bar.low)),
    close: last.close,
    volume: ordered.reduce((sum, bar) => sum + bar.volume, 0),
  };
}

function fiveMinute(bars: Bar[], dateKey: string, nowMinutes: number) {
  const groups = new Map<number, Bar[]>();
  for (const bar of bars) {
    const z = etParts(new Date(bar.ts));
    if (z.dateKey !== dateKey || z.minutes < 9 * 60 + 30 || z.minutes >= 16 * 60) continue;
    const start = z.minutes - (z.minutes % 5);
    if (nowMinutes < start + 5) continue;
    const list = groups.get(start) ?? [];
    list.push(bar);
    groups.set(start, list);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, list]) => aggregate(list));
}

function vwapAt(bars: Bar[], dateKey: string, throughMinutes: number) {
  let weighted = 0;
  let volume = 0;
  for (const bar of bars) {
    const z = etParts(new Date(bar.ts));
    if (z.dateKey !== dateKey || z.minutes < 9 * 60 + 30 || z.minutes > throughMinutes || bar.volume <= 0) continue;
    const typical = (bar.high + bar.low + bar.close) / 3;
    weighted += typical * bar.volume;
    volume += bar.volume;
  }
  if (volume <= 0) return null;
  return weighted / volume;
}

function empty(note: string, extra: Partial<PullbackSnapshot> = {}): PullbackSnapshot {
  return {
    ready: false,
    orHigh: null,
    orLow: null,
    orWidth: null,
    vwap: null,
    vwapSlope: null,
    standDown: null,
    proposal: null,
    note,
    ...extra,
  };
}

/**
 * Long-only VWAP pullback. Price is already above a rising session VWAP.
 * The newest completed 5-minute bar comes back to VWAP, then closes up and
 * back above it. Each fresh bar can be its own buy, up to the daily trade
 * cap. This takes more trades than one opening-range break, and it gets
 * stopped more often.
 */
export function evaluateVwapPullback(context: PullbackContext): PullbackSnapshot {
  const z = etParts(context.now);
  const maxTrades = context.maxTrades ?? 3;
  const base = {
    vwap: vwapAt(context.bars, z.dateKey, z.minutes),
    vwapSlope: null as number | null,
  };
  if (context.hasOpenPosition) return { ...empty("An SPY position is already open.", base) };
  if (context.consecutiveLosses >= 2) return { ...empty("Two losses in a row. Session stands down.", base) };
  if (context.tradesTaken >= maxTrades) return { ...empty("Daily trade cap reached.", base) };

  const bars = fiveMinute(context.bars, z.dateKey, z.minutes);
  const latest = bars.at(-1);
  const previous = bars.at(-2);
  if (!latest || !previous) return { ...empty("Waiting for two completed 5-minute bars.", base) };

  const priorVwap = vwapAt(context.bars, z.dateKey, z.minutes - 5);
  const vwap = base.vwap;
  const vwapSlope = vwap != null && priorVwap != null ? vwap - priorVwap : null;
  const view = { vwap, vwapSlope };
  if (vwap == null || vwapSlope == null || vwapSlope <= 0) {
    return { ...empty("VWAP is not rising.", view) };
  }
  if (latest.close <= vwap) return { ...empty("Price is not above VWAP.", view) };

  const pulledBack = previous.close > vwap && latest.low <= vwap * (1 + VWAP_BAND);
  const reclaimed = latest.close > latest.open && latest.close > previous.close;
  const participated = previous.volume <= 0 || latest.volume >= previous.volume * VOLUME_FLOOR;
  if (!pulledBack || !reclaimed || !participated) {
    return { ...empty("No VWAP pullback on the latest 5-minute bar.", view) };
  }

  const entry = roundPrice(latest.close + LIMIT_OFFSET);
  const stop = roundPrice(latest.low - 0.01);
  const stopDistance = roundPrice(entry - stop);
  if (stopDistance < MIN_STOP) return { ...empty("Natural stop is inside the spread.", view) };
  if (stopDistance / entry > MAX_STOP_PCT) return { ...empty("Stop distance is wider than 0.65% of price.", view) };

  return {
    ready: true,
    orHigh: null,
    orLow: null,
    orWidth: null,
    vwap,
    vwapSlope,
    standDown: null,
    note: "VWAP pullback. Buyers reclaimed the dip.",
    proposal: {
      symbol: "SPY",
      side: "LONG",
      entryPrice: entry,
      stopPrice: stop,
      targetPrice: roundPrice(entry + stopDistance * TARGET_R),
      setup: "VWAP_PULLBACK",
      strategy: STRATEGY_ID,
      reason: "5-minute pullback to a rising VWAP, then a close back above it.",
      signalBarTs: latest.ts,
    },
  };
}
