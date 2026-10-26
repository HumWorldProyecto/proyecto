-- Additive only: existing geography and analysis tuples remain unchanged.
ALTER TABLE "rss_sources" ADD COLUMN "countryCode" VARCHAR(2);
ALTER TABLE "rss_sources" ADD CONSTRAINT "rss_source_country_format_check"
CHECK ("countryCode" IS NULL OR "countryCode" ~ '^[A-Z]{2}$');

ALTER TABLE "news" ADD COLUMN "sentimentTerms" JSONB;
ALTER TABLE "news" ADD CONSTRAINT "news_sentiment_terms_shape_check"
CHECK ("sentimentTerms" IS NULL OR
  (jsonb_typeof("sentimentTerms") = 'array' AND "sentimentScore" IS NOT NULL));
