ALTER TABLE "news"
ADD COLUMN "mediaTopicQcodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "news"
ADD CONSTRAINT "news_media_topic_qcodes_official_check"
CHECK (
  "mediaTopicQcodes" <@ ARRAY[
    'medtop:01000000',
    'medtop:02000000',
    'medtop:03000000',
    'medtop:04000000',
    'medtop:05000000',
    'medtop:06000000',
    'medtop:07000000',
    'medtop:08000000',
    'medtop:09000000',
    'medtop:10000000',
    'medtop:11000000',
    'medtop:12000000',
    'medtop:13000000',
    'medtop:14000000',
    'medtop:15000000',
    'medtop:16000000',
    'medtop:17000000'
  ]::TEXT[]
);
