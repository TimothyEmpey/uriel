export type Side = "LONG" | "SHORT";

export type TradeProposal = {
  symbol: string;
  side: Side;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  requestedShares: number;
  setup: string;
  now: Date;
};

export type RiskState = {
  equityCents: number;
  cashCents: number;
  peakEquityCents: number;
  dayStartEquityCents: number;
  weekStartEquityCents: number;
  openPositions: number;
  openRiskCents: number;
  tradesToday: number;
  consecutiveLosses: number;
  lastTradeWasLoss: boolean;
  lastTradeShares: number | null;
  agentPaused: boolean;
  haltReason: string | null;
  spyPositionOpen: boolean;
  shortingEnabled: boolean;
  dayTradesInPdtWindow: number;
};

export type RiskDecision = {
  approved: boolean;
  shares: number;
  riskCents: number;
  reasons: string[];
  computed: {
    maxShares: number;
    riskBudgetCents: number;
    stopDistance: number;
    openRiskAfterCents: number;
    dailyLossRemainingCents: number;
    weeklyLossRemainingCents: number;
    drawdown: number;
    notionalCents: number;
  };
};
