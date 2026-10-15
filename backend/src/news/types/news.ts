import { MediaTopic } from '../../classification/types/media-topic';

export interface News {
  readonly id: string;
  readonly sourceId: string;
  readonly title: string | null;
  readonly link: string | null;
  readonly guid: string | null;
  readonly description: string | null;
  readonly pubDate: Date | null;
  readonly mediaTopics: readonly MediaTopic[];
  readonly capturedAt: Date;
}
