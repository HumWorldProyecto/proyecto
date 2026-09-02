-- CreateTable
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT,
    "link" TEXT,
    "guid" TEXT,
    "description" TEXT,
    "pubDate" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_sourceId_dedupeKey_key" ON "news"("sourceId", "dedupeKey");
