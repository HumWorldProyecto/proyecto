CREATE TABLE "channels" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "channels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "channels_name_nonempty" CHECK (length(btrim("name")) > 0)
);
ALTER TABLE "rss_sources" ADD COLUMN "channelId" TEXT;
ALTER TABLE "rss_sources" ADD CONSTRAINT "rss_sources_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "news_retention_policy" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "retentionDays" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_retention_policy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "news_retention_period_valid" CHECK ("retentionDays" IS NULL OR "retentionDays" BETWEEN 1 AND 36500)
);
CREATE INDEX "news_capturedAt_idx" ON "news"("capturedAt");
