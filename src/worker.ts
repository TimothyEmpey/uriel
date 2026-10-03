import { tick } from "@/server/trading";
import { sessionClock } from "@/lib/market/calendar";

const ACTIVE = new Set(["preopen", "opening_range", "entry", "manage", "flatten"]);

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop() {
  console.log("Uriel worker is up. Decisions are deterministic. The model is not on the order path.");
  while (true) {
    const started = Date.now();
    try {
      const result = await tick(new Date());
      if (result.ok) {
        console.log(`${result.beat.label} · SPY ${result.beat.spy?.toFixed(2) ?? "—"} · ${result.beat.phase}`);
      } else {
        console.log(result.reason);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
    const clock = sessionClock(new Date());
    const elapsed = Date.now() - started;
    const wait = (ACTIVE.has(clock.phase) ? 20_000 : 60_000) - elapsed;
    await sleep(Math.max(1_000, wait));
  }
}

void loop();
