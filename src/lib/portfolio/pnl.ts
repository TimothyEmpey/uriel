export type ClosedPnl = {
  origin: string;
  status: string;
  realizedPnlCents: number;
  rMultiple: number | null;
  closedAt: string | null;
  openedAt: string;
};

export function engineClosed<T extends { origin: string; status: string }>(trades: T[]) {
  return trades.filter((trade) => trade.status === "CLOSED" && trade.origin === "ENGINE");
}

export function sampleClosed<T extends { origin: string; status: string }>(trades: T[]) {
  return trades.filter((trade) => trade.status === "CLOSED" && trade.origin !== "ENGINE");
}

export function summarizeRealized(trades: Pick<ClosedPnl, "realizedPnlCents" | "rMultiple">[]) {
  const wins = trades.filter((trade) => trade.realizedPnlCents > 0);
  const losses = trades.filter((trade) => trade.realizedPnlCents < 0);
  const realized = trades.reduce((sum, trade) => sum + trade.realizedPnlCents, 0);
  const grossWin = wins.reduce((sum, trade) => sum + trade.realizedPnlCents, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.realizedPnlCents, 0));
  const avgR = trades.length === 0 ? 0 : trades.reduce((sum, trade) => sum + (trade.rMultiple ?? 0), 0) / trades.length;
  return {
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    realized,
    grossWin,
    grossLoss,
    avgR,
  };
}
