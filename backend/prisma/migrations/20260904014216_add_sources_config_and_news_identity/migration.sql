/*
  Warnings:

  - Made the column `dedupeKey` on table `news` required. This step will fail if there are existing NULL values in that column.
  - Existing `news` rows require an explicit, human-approved data migration because their source URLs cannot be derived from `sourceId`.

*/
-- LegacyDataGuard
-- This migration intentionally performs no destructive cleanup or invented
-- backfill. It aborts before changing the schema when legacy news exist.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "news") THEN
        RAISE EXCEPTION 'Legacy news require an explicit data migration before adding RssSource and typed dedupeKey constraints';
    END IF;
END $$;

-- AlterTable
ALTER TABLE "news" ALTER COLUMN "dedupeKey" SET NOT NULL;

-- CreateTable
CREATE TABLE "rss_sources" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rss_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capture_config" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "capturePeriodicityMinutes" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capture_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rss_sources_url_key" ON "rss_sources"("url");

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "rss_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
