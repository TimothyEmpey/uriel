import { formatUsd } from "@/lib/market/time";
import { alpacaPaperConfigured, getPaperBalances } from "@/server/alpaca";
import { prisma } from "@/server/db";

const usage = `uriel portfolio              portfolio equity and cash
uriel performance -today     today's profit or loss
uriel performance -all       all-time profit or loss
uriel start                  start the worker and the desk
uriel stop                   stop the worker and the desk`;

function line(label: string, value: string) {
  return `${label.padEnd(12)}${value}`;
}

async function snapshot() {
  const account = await prisma.account.findFirst();
  if (!account) {
    throw new Error("No Uriel account is stored. Start Postgres, then run the worker once.");
  }
  let equityCents = account.equityCents;
  let cashCents = account.cashCents;
  if (account.mode === "ALPACA_PAPER" && alpacaPaperConfigured()) {
    const live = await getPaperBalances();
    equityCents = live.equityCents;
    cashCents = live.cashCents;
  }
  const first = await prisma.equitySnapshot.findFirst({
    where: { accountId: account.id },
    orderBy: { capturedAt: "asc" },
  });
  const startedCents = first?.equityCents ?? account.equityCents;
  return {
    equityCents,
    cashCents,
    dayPnlCents: equityCents - account.dayStartEquityCents,
    allTimePnlCents: equityCents - startedCents,
    startedCents,
    session: account.dayStartDate,
  };
}

async function balance() {
  const book = await snapshot();
  console.log(line("Portfolio", formatUsd(book.equityCents)));
  console.log(line("Cash", formatUsd(book.cashCents)));
}

async function performance(span: "today" | "all") {
  const book = await snapshot();
  if (span === "all") {
    console.log(line("All time", formatUsd(book.allTimePnlCents, true)));
    console.log(line("Portfolio", formatUsd(book.equityCents)));
    console.log(line("Started", formatUsd(book.startedCents)));
    return;
  }
  console.log(line("Today", formatUsd(book.dayPnlCents, true)));
  console.log(line("Portfolio", formatUsd(book.equityCents)));
  console.log(line("Started", formatUsd(book.equityCents - book.dayPnlCents)));
  if (book.session) console.log(line("Session", book.session));
}

function performanceSpan(args: string[]) {
  const flags = args.map((arg) => arg.toLowerCase());
  const today = flags.some((flag) => flag === "-today" || flag === "--today" || flag === "today");
  const all = flags.some((flag) => flag === "-all" || flag === "--all" || flag === "all");
  if (today && all) throw new Error("Choose one of -today or -all.");
  if (today) return "today" as const;
  if (all) return "all" as const;
  return null;
}

async function main() {
  const command = (process.argv[2] ?? "").toLowerCase();
  if (command === "balance" || command === "portfolio") {
    await balance();
    return;
  }
  if (command === "today") {
    await performance("today");
    return;
  }
  if (command === "performance") {
    const span = performanceSpan(process.argv.slice(3));
    if (!span) {
      console.log(usage);
      if (process.argv.length > 3) throw new Error(`Unknown option "${process.argv[3]}".`);
      return;
    }
    await performance(span);
    return;
  }
  console.log(usage);
  if (command && command !== "help" && command !== "--help" && command !== "-h") {
    throw new Error(`Unknown command "${process.argv[2]}".`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
