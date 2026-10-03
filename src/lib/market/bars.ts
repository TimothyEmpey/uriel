/** Opening-range logic reads one-minute bars. A daily print must not land in a five-minute bucket. */
export function isStrategyBar(timeframe: string) {
  return timeframe === "1m";
}
