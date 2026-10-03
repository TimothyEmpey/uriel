-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'PAPER',
    "demo" BOOLEAN NOT NULL DEFAULT true,
    "cashCents" INTEGER NOT NULL,
    "equityCents" INTEGER NOT NULL,
    "peakEquityCents" INTEGER NOT NULL,
    "dayStartEquityCents" INTEGER NOT NULL,
    "dayStartDate" TEXT,
    "weekStartEquityCents" INTEGER NOT NULL,
    "weekStartDate" TEXT,
    "baselineSpyShares" INTEGER NOT NULL DEFAULT 0,
    "agentPaused" BOOLEAN NOT NULL DEFAULT false,
    "haltReason" TEXT,
    "shortingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "averagePrice" DOUBLE PRECISION NOT NULL,
    "marketPrice" DOUBLE PRECISION NOT NULL,
    "origin" TEXT NOT NULL,
    "tradable" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "stopPrice" DOUBLE PRECISION NOT NULL,
    "initialStopPrice" DOUBLE PRECISION NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "realizedPnlCents" INTEGER NOT NULL DEFAULT 0,
    "rMultiple" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "setup" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'ENGINE',
    "notes" TEXT,
    "journal" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tradeId" TEXT,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "limitPrice" DOUBLE PRECISION,
    "stopPrice" DOUBLE PRECISION,
    "fillPrice" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquitySnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "equityCents" INTEGER NOT NULL,
    "cashCents" INTEGER NOT NULL,
    "spyPrice" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskDecisionRecord" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "proposal" JSONB NOT NULL,
    "computed" JSONB NOT NULL,
    "reasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskDecisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategySession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sessionDate" TEXT NOT NULL,
    "orHigh" DOUBLE PRECISION,
    "orLow" DOUBLE PRECISION,
    "vwap" DOUBLE PRECISION,
    "standDown" TEXT,
    "tradesTaken" INTEGER NOT NULL DEFAULT 0,
    "consecutiveLosses" INTEGER NOT NULL DEFAULT 0,
    "longStopped" BOOLEAN NOT NULL DEFAULT false,
    "lastSignalBarTs" TIMESTAMP(3),
    "dayBaselined" BOOLEAN NOT NULL DEFAULT false,
    "flattened" BOOLEAN NOT NULL DEFAULT false,
    "lastTradeWasLoss" BOOLEAN NOT NULL DEFAULT false,
    "lastTradeShares" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketBar" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketBar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_accountId_symbol_key" ON "Holding"("accountId", "symbol");

-- CreateIndex
CREATE INDEX "EquitySnapshot_accountId_capturedAt_idx" ON "EquitySnapshot"("accountId", "capturedAt");

-- CreateIndex
CREATE INDEX "AgentEvent_accountId_createdAt_idx" ON "AgentEvent"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StrategySession_accountId_sessionDate_key" ON "StrategySession"("accountId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "MarketBar_accountId_symbol_ts_key" ON "MarketBar"("accountId", "symbol", "ts");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquitySnapshot" ADD CONSTRAINT "EquitySnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskDecisionRecord" ADD CONSTRAINT "RiskDecisionRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategySession" ADD CONSTRAINT "StrategySession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketBar" ADD CONSTRAINT "MarketBar_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
