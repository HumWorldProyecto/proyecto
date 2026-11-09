-- Additive metadata: existing sources and all stored news are preserved.
ALTER TABLE "rss_sources" ADD COLUMN "language" "DictionaryLanguage",
ADD COLUMN "mediaTopicQcode" TEXT;
ALTER TABLE "rss_sources" ADD CONSTRAINT "rss_sources_root_topic_check"
CHECK ("mediaTopicQcode" IS NULL OR "mediaTopicQcode" ~ '^medtop:(0[1-9]|1[0-7])000000$');
