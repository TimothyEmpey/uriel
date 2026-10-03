import { describe, expect, it } from "vitest";
import { assertPaperBaseUrl, paperBracketOrder } from "@/server/alpaca";

describe("alpaca paper broker", () => {
  it("locks orders to the paper host", () => {
    expect(assertPaperBaseUrl("https://paper-api.alpaca.markets/v2")).toBe("https://paper-api.alpaca.markets");
    expect(() => assertPaperBaseUrl("https://api.alpaca.markets")).toThrow(/paper host/);
  });

  it("builds a SPY bracket with a stop and a target", () => {
    expect(
      paperBracketOrder({
        symbol: "SPY",
        quantity: 4,
        limitPrice: 500.12,
        stopPrice: 497.5,
        targetPrice: 504.05,
        clientOrderId: "uriel-1",
      }),
    ).toMatchObject({
      symbol: "SPY",
      qty: "4",
      side: "buy",
      type: "limit",
      order_class: "bracket",
      limit_price: "500.12",
      stop_loss: { stop_price: "497.50" },
      take_profit: { limit_price: "504.05" },
    });
    expect(() =>
      paperBracketOrder({
        symbol: "AAPL",
        quantity: 1,
        limitPrice: 10,
        stopPrice: 9,
        targetPrice: 12,
        clientOrderId: "uriel-2",
      }),
    ).toThrow(/untouchable/);
    expect(() =>
      paperBracketOrder({
        symbol: "SPY",
        quantity: 1,
        limitPrice: 10,
        stopPrice: 10,
        targetPrice: 12,
        clientOrderId: "uriel-3",
      }),
    ).toThrow(/stop/);
  });
});
