-- AlterTable
ALTER TABLE "news"
ADD COLUMN "sentimentScore" DECIMAL(5,4),
ADD COLUMN "sentimentMatchedTerms" INTEGER,
ADD COLUMN "sentimentLanguage" "DictionaryLanguage",
ADD COLUMN "sentimentAnalyzedAt" TIMESTAMP(3);

-- The complete analysis is either absent or present as one coherent tuple.
ALTER TABLE "news"
ADD CONSTRAINT "news_sentiment_nullability_check"
CHECK (
  (
    "sentimentScore" IS NULL
    AND "sentimentMatchedTerms" IS NULL
    AND "sentimentLanguage" IS NULL
    AND "sentimentAnalyzedAt" IS NULL
  )
  OR
  (
    "sentimentScore" IS NOT NULL
    AND "sentimentMatchedTerms" IS NOT NULL
    AND "sentimentLanguage" IS NOT NULL
    AND "sentimentAnalyzedAt" IS NOT NULL
  )
);

ALTER TABLE "news"
ADD CONSTRAINT "news_sentiment_score_range_check"
CHECK ("sentimentScore" IS NULL OR "sentimentScore" BETWEEN -1 AND 1);

ALTER TABLE "news"
ADD CONSTRAINT "news_sentiment_matched_terms_check"
CHECK ("sentimentMatchedTerms" IS NULL OR "sentimentMatchedTerms" >= 0);

ALTER TABLE "news"
ADD CONSTRAINT "news_sentiment_no_evidence_score_check"
CHECK (
  "sentimentMatchedTerms" IS NULL
  OR "sentimentMatchedTerms" <> 0
  OR "sentimentScore" = 0
);
