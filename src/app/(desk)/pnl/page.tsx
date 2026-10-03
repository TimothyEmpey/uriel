import { PnlBars } from "@/components/charts";
import { DemoBanner, Metric, moneyTone } from "@/components/desk-widgets";
import { Card, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/market/time";
import { getDesk } from "@/server/desk";

export default async function PnlPage() {
  const desk = await getDesk();
  if (!desk) return <p>Seed the paper account before opening the desk.</p>;
  const closed = desk.recentTrades.filter((trade) => trade.status === "CLOSED");
  const wins = closed.filter((trade) => trade.realizedPnlCents > 0);
  const losses = closed.filter((trade) => trade.realizedPnlCents < 0);
  const realized = closed.reduce((sum, trade) => sum + trade.realizedPnlCents, 0);
  const grossWin = wins.reduce((sum, trade) => sum + trade.realizedPnlCents, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.realizedPnlCents, 0));
  const avgR = closed.length
    ? closed.reduce((sum, trade) => sum + (trade.rMultiple ?? 0), 0) / closed.length
    : 0;
  const byDay = new Map<string, number>();
  const ordered = [...closed].sort(
    (a, b) => new Date(a.closedAt ?? a.openedAt).getTime() - new Date(b.closedAt ?? b.openedAt).getTime(),
  );
  for (const trade of ordered) {
    const key = new Date(trade.closedAt ?? trade.openedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
    byDay.set(key, (byDay.get(key) ?? 0) + trade.realizedPnlCents);
  }
  const rows = [...byDay.entries()].map(([label, pnl]) => ({ label, pnl: pnl / 100 }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Results</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">P&L</h1>
      </div>
      {desk.demo ? <DemoBanner /> : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Realized P&L" value={formatUsd(realized, true)} tone={moneyTone(realized)} />
        <Metric label="Win rate" value={closed.length ? `${Math.round((wins.length / closed.length) * 100)}%` : "—"} hint={`${wins.length} wins · ${losses.length} losses`} />
        <Metric label="Average R" value={closed.length ? avgR.toFixed(2) : "—"} />
        <Metric label="Profit factor" value={grossLoss ? (grossWin / grossLoss).toFixed(2) : "—"} />
      </section>
      <Card>
        <CardTitle>Daily realized</CardTitle>
        <div className="mt-4">
          <PnlBars rows={rows} />
        </div>
      </Card>
      <Card>
        <CardTitle>Closed trades</CardTitle>
        <div className="mt-3 space-y-3">
          {closed.map((trade) => (
            <div key={trade.id} className="border-b border-[var(--border)] pb-3 text-sm last:border-0">
              <div className="flex items-center justify-between gap-3">
                <span>{trade.quantity} {trade.symbol} {trade.setup}</span>
                <span className={trade.realizedPnlCents >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
                  {formatUsd(trade.realizedPnlCents, true)}
                </span>
              </div>
              {trade.journal ? <p className="mt-1 text-xs text-[var(--muted)]">{trade.journal}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
