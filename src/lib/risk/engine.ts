import { sessionClock } from "@/lib/market/calendar";
import { PDT_EQUITY_CENTS, PDT_MAX_DAY_TRADES, RISK_LIMITS, TRADABLE_SYMBOL } from "@/lib/risk/constants";
import { dollarRiskCents, notionalCents, riskBudgetCents, sharesForRisk } from "@/lib/risk/sizing";
import type { RiskDecision, RiskState, TradeProposal } from "@/lib/risk/types";

function lossRemaining(startCents: number, pnlCents: number, limit: number) {
  return Math.floor(startCents * limit + 1e-6) + pnlCents;
}

/**
 * Independent of the strategy. Every entry passes through here.
 * Size may be reduced to fit cash or remaining open-risk budget. It is never increased.
 */
export function evaluateRisk(proposal: TradeProposal, state: RiskState): RiskDecision {
  const reasons: string[] = [];
  const clock = sessionClock(proposal.now);
  const distance = Math.abs(proposal.entryPrice - proposal.stopPrice);
  const { shares: maxShares, budgetCents } = sharesForRisk(
    state.equityCents,
    proposal.entryPrice,
    proposal.stopPrice,
  );
  const dayPnl = state.equityCents - state.dayStartEquityCents;
  const weekPnl = state.equityCents - state.weekStartEquityCents;
  const drawdown =
    state.peakEquityCents > 0
      ? (state.peakEquityCents - state.equityCents) / state.peakEquityCents
      : 0;

  let shares = proposal.requestedShares;

  if (proposal.symbol.toUpperCase() !== TRADABLE_SYMBOL) {
    reasons.push(`${proposal.symbol} is untouchable. Uriel may trade SPY only.`);
  }
  if (!Number.isFinite(proposal.stopPrice) || distance <= 0) {
    reasons.push("Every trade must have a stop-loss before entry.");
  }
  if (proposal.side === "LONG" && !(proposal.stopPrice < proposal.entryPrice)) {
    reasons.push("Long stop must be below the entry.");
  }
  if (proposal.side === "SHORT" && !(proposal.stopPrice > proposal.entryPrice)) {
    reasons.push("Short stop must be above the entry.");
  }
  if (proposal.side === "LONG" && !(proposal.targetPrice > proposal.entryPrice)) {
    reasons.push("Long target must be above the entry.");
  }
  if (proposal.side === "SHORT" && !(proposal.targetPrice < proposal.entryPrice)) {
    reasons.push("Short target must be below the entry.");
  }
  if (proposal.side === "SHORT" && !state.shortingEnabled) {
    reasons.push("Short sales are off. The Robinhood agent path is long-only.");
  }
  if (!Number.isInteger(shares) || shares < 1) {
    reasons.push("Position size must be a whole number of shares.");
  }
  let heldToLastLoss = false;
  if (state.lastTradeWasLoss && state.lastTradeShares != null && state.lastTradeShares >= 1 && shares > state.lastTradeShares) {
    shares = state.lastTradeShares;
    heldToLastLoss = true;
  }
  if (shares > maxShares) {
    reasons.push("Position size exceeds the risk formula.");
  }
  if (state.spyPositionOpen) {
    reasons.push("No averaging down, and no second SPY position while one is open.");
  }
  if (state.openPositions >= RISK_LIMITS.maxOpenPositions) {
    reasons.push("Maximum open positions reached.");
  }
  if (state.tradesToday >= RISK_LIMITS.maxTradesPerDay) {
    reasons.push("Maximum trades for the day reached.");
  }
  if (state.consecutiveLosses >= 2) {
    reasons.push("Revenge-trading lockout after two consecutive losses.");
  }
  if (state.agentPaused) reasons.push("Uriel is paused.");
  if (state.haltReason) reasons.push(`Trading halted: ${state.haltReason}`);
  if (!clock.entryWindowOpen) reasons.push(`New positions are closed during ${clock.phase}.`);
  if (dayPnl <= -riskBudgetCents(state.dayStartEquityCents, RISK_LIMITS.maxDailyLoss)) {
    reasons.push("Daily loss limit reached. No new positions.");
  }
  if (weekPnl <= -riskBudgetCents(state.weekStartEquityCents, RISK_LIMITS.maxWeeklyLoss)) {
    reasons.push("Weekly loss limit reached.");
  }
  if (drawdown >= RISK_LIMITS.maxDrawdownFromPeak - 1e-12) {
    reasons.push("Drawdown from peak equity reached 5.0%.");
  }
  if (state.equityCents < PDT_EQUITY_CENTS && state.dayTradesInPdtWindow >= PDT_MAX_DAY_TRADES) {
    reasons.push("Pattern day trader limit: 3 day trades in 5 business days under $25,000.");
  }

  const hardReject = reasons.length > 0;

  if (!hardReject) {
    const openRoomCents = Math.max(
      0,
      riskBudgetCents(state.equityCents, RISK_LIMITS.maxTotalOpenRisk) - state.openRiskCents,
    );
    const byOpenRisk = distance > 0 ? Math.floor(openRoomCents / 100 / distance) : 0;
    const byCash =
      proposal.side === "LONG" && proposal.entryPrice > 0
        ? Math.floor(state.cashCents / 100 / proposal.entryPrice)
        : shares;
    const fitted = Math.min(shares, maxShares, byOpenRisk, byCash);
    if (fitted < 1) {
      reasons.push("Available cash or open-risk budget cannot fund one share.");
    } else if (fitted < shares) {
      shares = fitted;
      reasons.push("Position size reduced to the cash and open-risk budget.");
    } else {
      shares = fitted;
    }
    if (heldToLastLoss) reasons.push("Position size reduced to the previous losing trade.");
  }

  const riskCents = dollarRiskCents(Math.max(shares, 0), proposal.entryPrice, proposal.stopPrice);
  if (!hardReject && shares >= 1 && riskCents > budgetCents) {
    reasons.push("Dollar risk exceeds 2% of equity.");
  }

  const blocking = reasons.filter((reason) => !reason.startsWith("Position size reduced"));
  const approved = blocking.length === 0 && shares >= 1;

  return {
    approved,
    shares: approved ? shares : 0,
    riskCents: approved ? dollarRiskCents(shares, proposal.entryPrice, proposal.stopPrice) : 0,
    reasons: approved && reasons.length === 0 ? ["Approved."] : reasons,
    computed: {
      maxShares,
      riskBudgetCents: budgetCents,
      stopDistance: distance,
      openRiskAfterCents: state.openRiskCents + (approved ? dollarRiskCents(shares, proposal.entryPrice, proposal.stopPrice) : 0),
      dailyLossRemainingCents: lossRemaining(state.dayStartEquityCents, dayPnl, RISK_LIMITS.maxDailyLoss),
      weeklyLossRemainingCents: lossRemaining(state.weekStartEquityCents, weekPnl, RISK_LIMITS.maxWeeklyLoss),
      drawdown,
      notionalCents: approved ? notionalCents(shares, proposal.entryPrice) : 0,
    },
  };
}

export function haltReasonForState(state: Pick<
  RiskState,
  "equityCents" | "peakEquityCents" | "dayStartEquityCents" | "weekStartEquityCents"
>) {
  const dayPnl = state.equityCents - state.dayStartEquityCents;
  const weekPnl = state.equityCents - state.weekStartEquityCents;
  const drawdown =
    state.peakEquityCents > 0
      ? (state.peakEquityCents - state.equityCents) / state.peakEquityCents
      : 0;
  if (dayPnl <= -riskBudgetCents(state.dayStartEquityCents, RISK_LIMITS.maxDailyLoss)) {
    return "Daily loss limit reached.";
  }
  if (weekPnl <= -riskBudgetCents(state.weekStartEquityCents, RISK_LIMITS.maxWeeklyLoss)) {
    return "Weekly loss limit reached.";
  }
  if (drawdown >= RISK_LIMITS.maxDrawdownFromPeak - 1e-12) {
    return "Drawdown from peak reached 5.0%.";
  }
  return null;
}
