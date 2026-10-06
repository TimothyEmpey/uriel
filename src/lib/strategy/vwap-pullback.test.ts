import { describe, expect, it } from "vitest";
import { etInstant } from "@/lib/market/time";
import { evaluateVwapPullback, type Bar } from "@/lib/strategy/vwap-pullback";

const DATE = "2026-10-02";

function bar(minuteOfDay: number, open: number, high: number, low: number, close: number, volume = 1_000): Bar {
  return {
    ts: etInstant(DATE, Math.floor(minuteOfDay / 60), minuteOfDay % 60).getTime(),
    open,
    high,
    low,
    close,
    volume,
  };
}

/** Steady climb from 9:30 through 9:54 so VWAP rises and lags under the last close. */
function climb(): Bar[] {
  const bars: Bar[] = [];
  for (let offset = 0; offset < 25; offset += 1) {
    const price = 100 + offset * 0.02;
    bars.push(bar(9 * 60 + 30 + offset, price, price, price, price));
  }
  return bars;
}

function pullback(startMinute: number, open: number, low: number, close: number, volume = 800): Bar[] {
  return [
    bar(startMinute, open, open + 0.05, low, open + 0.02, volume),
    bar(startMinute + 1, open + 0.02, open + 0.08, low + 0.05, open + 0.04, volume),
    bar(startMinute + 2, open + 0.04, open + 0.1, low + 0.08, open + 0.06, volume),
    bar(startMinute + 3, open + 0.06, close, low + 0.1, close - 0.04, volume),
    bar(startMinute + 4, close - 0.04, close + 0.05, close - 0.02, close, volume),
  ];
}

function qualifying() {
  return [...climb(), ...pullback(9 * 60 + 55, 100.4, 100.2, 100.55)];
}

function at(hour: number, minuteOfHour: number, bars: Bar[], overrides: Partial<Parameters<typeof evaluateVwapPullback>[0]> = {}) {
  return evaluateVwapPullback({
    now: etInstant(DATE, hour, minuteOfHour),
    bars,
    hasOpenPosition: false,
    tradesTaken: 0,
    consecutiveLosses: 0,
    ...overrides,
  });
}

describe("SPY VWAP pullback", () => {
  it("buys when a 5-minute bar tags a rising VWAP and closes back above it", () => {
    const decision = at(10, 0, qualifying());
    expect(decision.proposal?.side).toBe("LONG");
    expect(decision.proposal?.setup).toBe("VWAP_PULLBACK");
    expect(decision.proposal?.strategy).toBe("spy-vwap-pullback-2026");
    expect(decision.proposal!.stopPrice).toBeLessThan(decision.proposal!.entryPrice);
    expect(decision.proposal!.targetPrice).toBeGreaterThan(decision.proposal!.entryPrice);
    expect(decision.proposal?.signalBarTs).toBe(etInstant(DATE, 9, 59).getTime());
    expect(decision.note).toMatch(/reclaimed/i);
  });

  it("buys a later pullback after an earlier trade is done", () => {
    const bars = [...qualifying(), ...pullback(10 * 60, 100.5, 100.22, 100.7)];
    const decision = at(10, 5, bars, { tradesTaken: 1 });
    expect(decision.proposal?.side).toBe("LONG");
    expect(decision.proposal?.signalBarTs).toBe(etInstant(DATE, 10, 4).getTime());
  });

  it("stands down when VWAP is not rising", () => {
    const bars: Bar[] = [];
    for (let offset = 0; offset < 30; offset += 1) {
      bars.push(bar(9 * 60 + 30 + offset, 100, 100.05, 99.95, 100));
    }
    const decision = at(10, 0, bars);
    expect(decision.proposal).toBeNull();
    expect(decision.note).toMatch(/not rising/i);
  });

  it("skips a bar that never comes back to VWAP", () => {
    const bars = [...climb(), ...pullback(9 * 60 + 55, 100.5, 100.46, 100.7)];
    const decision = at(10, 0, bars);
    expect(decision.proposal).toBeNull();
    expect(decision.note).toMatch(/no vwap pullback/i);
  });

  it("skips a red bar even when the low tags VWAP", () => {
    const bars = [...climb(), ...pullback(9 * 60 + 55, 100.5, 100.2, 100.3)];
    const decision = at(10, 0, bars);
    expect(decision.proposal).toBeNull();
  });

  it("does not add while a position is open", () => {
    const decision = at(10, 0, qualifying(), { hasOpenPosition: true });
    expect(decision.proposal).toBeNull();
    expect(decision.note).toMatch(/already open/i);
  });

  it("stops at the daily trade cap and after two losses", () => {
    expect(at(10, 0, qualifying(), { tradesTaken: 3 }).note).toMatch(/cap/i);
    expect(at(10, 0, qualifying(), { consecutiveLosses: 2 }).note).toMatch(/stands down/i);
  });

  it("skips a stop wider than 0.65% of price", () => {
    const bars = [
      ...climb(),
      bar(9 * 60 + 55, 100.5, 100.55, 99.7, 100.5, 100),
      bar(9 * 60 + 56, 100.5, 100.7, 100.48, 100.65, 2_000),
      bar(9 * 60 + 57, 100.65, 100.8, 100.6, 100.75, 2_000),
      bar(9 * 60 + 58, 100.75, 100.9, 100.7, 100.85, 2_000),
      bar(9 * 60 + 59, 100.85, 101, 100.8, 100.95, 2_000),
    ];
    const decision = at(10, 0, bars);
    expect(decision.proposal).toBeNull();
    expect(decision.note).toMatch(/0\.65%/);
  });
});
