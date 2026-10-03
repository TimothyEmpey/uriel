import { TRADABLE_SYMBOL } from "@/lib/risk/constants";

export class UntouchableSymbolError extends Error {
  constructor(symbol: string) {
    super(`${symbol} is untouchable. Orders are limited to ${TRADABLE_SYMBOL}.`);
    this.name = "UntouchableSymbolError";
  }
}

export function assertTradableSymbol(symbol: string) {
  if (symbol.toUpperCase() !== TRADABLE_SYMBOL) {
    throw new UntouchableSymbolError(symbol);
  }
}

export function assertAgentExit(input: {
  symbol: string;
  quantity: number;
  agentQuantity: number;
  baselineQuantity: number;
}) {
  assertTradableSymbol(input.symbol);
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error("Exit quantity must be a positive whole number of shares.");
  }
  if (input.quantity > input.agentQuantity) {
    throw new Error(
      `Exit of ${input.quantity} ${input.symbol} would touch ${input.baselineQuantity} reserved baseline shares.`,
    );
  }
}
