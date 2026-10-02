-- CreateEnum
CREATE TYPE "Continent" AS ENUM ('AFRICA', 'ASIA', 'EUROPE', 'NORTH_AMERICA', 'SOUTH_AMERICA', 'OCEANIA');

-- AlterTable
ALTER TABLE "rss_sources" ADD COLUMN "continent" "Continent";
