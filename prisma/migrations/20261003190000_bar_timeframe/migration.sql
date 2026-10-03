ALTER TABLE "MarketBar" ADD COLUMN "timeframe" TEXT NOT NULL DEFAULT '1m';

-- Bars already stored were fetched as daily prints while the market was closed.
UPDATE "MarketBar" SET "timeframe" = '1d';
