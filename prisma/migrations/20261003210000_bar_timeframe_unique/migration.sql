-- Daily prints share the 9:30 ET timestamp with the first one-minute bar.
-- Keep both so the candle chart can show a daily series and a session series.
DROP INDEX "MarketBar_accountId_symbol_ts_key";

CREATE UNIQUE INDEX "MarketBar_accountId_symbol_ts_timeframe_key" ON "MarketBar"("accountId", "symbol", "ts", "timeframe");
