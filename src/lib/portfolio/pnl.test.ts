import { describe, expect, it } from "vitest";
import { engineClosed, sampleClosed, summarizeRealized } from "@/lib/portfolio/pnl";

const trades = [
  { origin: "DEMO", status: "CLOSED", realizedPnlCents: 4_860, rMultiple: 1, closedAt: "2026-09-08", openedAt: "2026-09-08" },
  { origin: "DEMO", status: "CLOSED", realizedPnlCents: -2_400, rMultiple: -1, closedAt: "2026-09-10", openedAt: "2026-09-10" },
  { origin: "ENGINE", status: "CLOSED", realizedPnlCents: 17_280, rMultiple: 1.5, closedAt: "2026-10-07", openedAt: "2026-10-07" },
  { origin: "ENGINE", status: "OPEN", realizedPnlCents: 0, rMultiple: null, closedAt: null, openedAt: "2026-10-07" },
];

describe("realized book", () => {
  it("keeps sample prints out of the realized total", () => {
    const engine = engineClosed(trades);
    expect(engine).toHaveLength(1);
    expect(sampleClosed(trades)).toHaveLength(2);
    expect(summarizeRealized(engine).realized).toBe(17_280);
    expect(summarizeRealized(trades.filter((trade) => trade.status === "CLOSED")).realized).toBe(19_740);
  });
});
