import type { Side } from "@/lib/risk/types";

export function deterministicJournal(input: {
  side: Side;
  quantity: number;
  entry: number;
  exit: number;
  stop: number;
  setup: string;
}) {
  const risk = Math.abs(input.entry - input.stop);
  const move = input.side === "LONG" ? input.exit - input.entry : input.entry - input.exit;
  const r = risk > 0 ? move / risk : 0;
  const outcome = move >= 0 ? "Winner" : "Loser";
  return `${outcome}. ${input.setup} ${input.side.toLowerCase()} ${input.quantity} SPY from ${input.entry.toFixed(2)} to ${input.exit.toFixed(2)}, stop ${input.stop.toFixed(2)}, ${r.toFixed(2)}R.`;
}

/** One short note after a closed trade. Never used to decide an order. */
export async function maybeNarrate(summary: string) {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.7",
        input: `Write one calm sentence a trading journal would keep. Do not give advice or suggest the next trade. Facts: ${summary}`,
        max_output_tokens: 120,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const text =
      body.output_text ??
      body.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join(" ").trim();
    return text || null;
  } catch {
    return null;
  }
}
