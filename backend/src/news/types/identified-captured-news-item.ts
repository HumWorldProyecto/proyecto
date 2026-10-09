import { MediaTopicQCode } from '../../classification/types/media-topic';

export type NewsDedupeKey = `guid:${string}` | `link:${string}`;

export interface IdentifiedCapturedNewsItem {
  readonly sourceId: string;
  readonly dedupeKey: NewsDedupeKey;
  readonly title?: string;
  readonly link?: string;
  readonly guid?: string;
  readonly pubDate?: string;
  readonly description?: string;
  readonly mediaTopicQcodes?: readonly MediaTopicQCode[];
}
