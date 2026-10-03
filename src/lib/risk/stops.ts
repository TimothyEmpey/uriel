import type { Side } from "@/lib/risk/types";

/** A stop may move closer to price. It may never move farther from the entry. */
export function stopChangeAllowed(
  side: Side,
  entryPrice: number,
  currentStop: number,
  nextStop: number,
) {
  if (!Number.isFinite(nextStop) || !Number.isFinite(currentStop)) {
    return { ok: false, reason: "Stop price is missing." };
  }
  if (side === "LONG") {
    if (nextStop >= entryPrice) return { ok: false, reason: "Long stop must stay below entry." };
    if (nextStop < currentStop - 1e-9) {
      return { ok: false, reason: "Stop cannot be widened after entry." };
    }
  } else {
    if (nextStop <= entryPrice) return { ok: false, reason: "Short stop must stay above entry." };
    if (nextStop > currentStop + 1e-9) {
      return { ok: false, reason: "Stop cannot be widened after entry." };
    }
  }
  return { ok: true, reason: "Stop tightened." };
}
