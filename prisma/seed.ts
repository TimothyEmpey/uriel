import bcrypt from "bcryptjs";
import { accountEquityCents } from "../src/lib/portfolio/equity";
import { deterministicJournal } from "../src/server/journal";
import { prisma } from "../src/server/db";
import { etInstant } from "../src/lib/market/time";

const holdings = [
  { symbol: "AAPL", quantity: 25, averagePrice: 186.4, marketPrice: 228.15, origin: "UNTOUCHABLE", tradable: false },
  { symbol: "MSFT", quantity: 10, averagePrice: 372.1, marketPrice: 428.6, origin: "UNTOUCHABLE", tradable: false },
  { symbol: "VTI", quantity: 18, averagePrice: 255.2, marketPrice: 291.4, origin: "UNTOUCHABLE", tradable: false },
  { symbol: "SPY", quantity: 8, averagePrice: 512.3, marketPrice: 668.42, origin: "BASELINE", tradable: false },
];

const samples = [
  { day: "2026-09-08", hour: 10, minute: 6, qty: 12, entry: 652.1, stop: 649.4, exit: 656.15, hold: 74 },
  { day: "2026-09-10", hour: 10, minute: 11, qty: 10, entry: 648.2, stop: 645.8, exit: 645.8, hold: 28 },
  { day: "2026-09-15", hour: 10, minute: 4, qty: 9, entry: 661.4, stop: 658.9, exit: 665.15, hold: 62 },
  { day: "2026-09-17", hour: 10, minute: 18, qty: 8, entry: 659.05, stop: 656.7, exit: 656.7, hold: 22 },
  { day: "2026-09-22", hour: 9, minute: 58, qty: 8, entry: 670.2, stop: 667.85, exit: 673.72, hold: 81 },
  { day: "2026-09-24", hour: 10, minute: 9, qty: 7, entry: 668.4, stop: 666.1, exit: 671.85, hold: 55 },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const email = (process.env.URIEL_OPERATOR_EMAIL ?? "operator@uriel.local").toLowerCase();
  const password = process.env.URIEL_OPERATOR_PASSWORD;
  if (!password) throw new Error("Set URIEL_OPERATOR_PASSWORD before seeding.");

  await prisma.user.deleteMany();
  const user = await prisma.user.create({
    data: {
      email,
      name: "Operator",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  const cashCents = 3_250_000;
  const equityCents = accountEquityCents({
    cashCents,
    holdings: holdings.map((holding) => ({ quantity: holding.quantity, mark: holding.marketPrice })),
    openTrades: [],
  });

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      mode: "PAPER",
      demo: true,
      cashCents,
      equityCents,
      peakEquityCents: equityCents,
      dayStartEquityCents: equityCents,
      dayStartDate: "2026-10-02",
      weekStartEquityCents: equityCents,
      weekStartDate: "2026-09-28",
      baselineSpyShares: 8,
      holdings: { create: holdings },
    },
  });

  for (const sample of samples) {
    const openedAt = etInstant(sample.day, sample.hour, sample.minute);
    const closedAt = new Date(openedAt.getTime() + sample.hold * 60_000);
    const target = Math.round((sample.entry + 1.5 * (sample.entry - sample.stop)) * 100) / 100;
    const realized = Math.round((sample.exit - sample.entry) * sample.qty * 100);
    const risk = sample.entry - sample.stop;
    const trade = await prisma.trade.create({
      data: {
        accountId: account.id,
        symbol: "SPY",
        side: "LONG",
        quantity: sample.qty,
        entryPrice: sample.entry,
        stopPrice: sample.stop,
        initialStopPrice: sample.stop,
        targetPrice: target,
        exitPrice: sample.exit,
        realizedPnlCents: realized,
        rMultiple: risk > 0 ? (sample.exit - sample.entry) / risk : 0,
        status: "CLOSED",
        setup: "ORB_LONG",
        strategy: "spy-orb-15-vwap-2026",
        origin: "DEMO",
        openedAt,
        closedAt,
        journal: deterministicJournal({
          side: "LONG",
          quantity: sample.qty,
          entry: sample.entry,
          exit: sample.exit,
          stop: sample.stop,
          setup: "ORB_LONG",
        }),
      },
    });
    await prisma.order.createMany({
      data: [
        {
          accountId: account.id,
          tradeId: trade.id,
          symbol: "SPY",
          side: "BUY",
          type: "LIMIT",
          purpose: "ENTRY",
          quantity: sample.qty,
          limitPrice: sample.entry,
          fillPrice: sample.entry,
          status: "FILLED",
          createdAt: openedAt,
          filledAt: openedAt,
        },
        {
          accountId: account.id,
          tradeId: trade.id,
          symbol: "SPY",
          side: "SELL",
          type: sample.exit <= sample.stop ? "STOP" : "LIMIT",
          purpose: sample.exit <= sample.stop ? "STOP" : "TARGET",
          quantity: sample.qty,
          stopPrice: sample.stop,
          fillPrice: sample.exit,
          status: "FILLED",
          createdAt: closedAt,
          filledAt: closedAt,
        },
      ],
    });
  }

  const rand = mulberry32(20261003);
  let walk = Math.round(equityCents * 0.94);
  const daily: { capturedAt: Date; equityCents: number }[] = [];
  for (let offset = 90; offset >= 0; offset -= 1) {
    const day = new Date(Date.UTC(2026, 9, 3));
    day.setUTCDate(day.getUTCDate() - offset);
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    walk = Math.round(walk * (1 + (rand() - 0.46) * 0.006));
    daily.push({ capturedAt: new Date(day.toISOString().slice(0, 10) + "T20:00:00Z"), equityCents: walk });
  }
  if (daily.length > 1) {
    const arrived = daily[daily.length - 1].equityCents;
    const scale = arrived > 0 ? equityCents / arrived : 1;
    for (const point of daily) point.equityCents = Math.round(point.equityCents * scale);
  }
  if (daily.length) daily[daily.length - 1].equityCents = equityCents;
  const hourly: { capturedAt: Date; equityCents: number }[] = [];
  for (let hour = 36; hour >= 0; hour -= 1) {
    const capturedAt = new Date(Date.now() - hour * 60 * 60 * 1000);
    const drift = Math.round(equityCents * (1 - hour * 0.00015));
    hourly.push({ capturedAt, equityCents: hour === 0 ? equityCents : drift });
  }
  await prisma.equitySnapshot.createMany({
    data: [...daily, ...hourly].map((point) => ({
      accountId: account.id,
      equityCents: point.equityCents,
      cashCents,
      capturedAt: point.capturedAt,
    })),
  });

  await prisma.riskDecisionRecord.create({
    data: {
      accountId: account.id,
      approved: false,
      proposal: { symbol: "AAPL", side: "LONG", requestedShares: 5 },
      computed: {},
      reasons: ["AAPL is untouchable. Uriel may trade SPY only."],
    },
  });
  await prisma.agentEvent.createMany({
    data: [
      {
        accountId: account.id,
        kind: "CONTROL",
        level: "info",
        message: "Paper desk is ready. Live Robinhood orders are not armed.",
      },
      {
        accountId: account.id,
        kind: "RISK_BLOCK",
        level: "warn",
        message: "AAPL is untouchable. Uriel may trade SPY only.",
      },
      {
        accountId: account.id,
        kind: "HEARTBEAT",
        level: "info",
        message: "Sample book loaded. Start the worker to mark SPY through the session.",
      },
    ],
  });

  console.log(`Seeded ${email}. Equity $${(equityCents / 100).toFixed(2)}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
