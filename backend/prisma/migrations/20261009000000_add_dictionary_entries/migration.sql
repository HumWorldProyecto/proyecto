-- CreateEnum
CREATE TYPE "DictionaryLanguage" AS ENUM ('es', 'en');

-- CreateTable
CREATE TABLE "dictionary_entries" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "language" "DictionaryLanguage" NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "dictionary_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dictionary_entries_term_length_check" CHECK (char_length("term") BETWEEN 1 AND 200),
    CONSTRAINT "dictionary_entries_weight_check" CHECK ("weight" BETWEEN -5 AND 5)
);

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_entries_language_term_key"
ON "dictionary_entries"("language", "term");
