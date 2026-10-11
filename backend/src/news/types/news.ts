import type { PersistedNewsSentiment } from '../../sentiment/types/persisted-news-sentiment';

export interface News {
  readonly id: string;
  readonly sourceId: string;
  readonly title: string | null;
  readonly link: string | null;
  readonly guid: string | null;
  readonly description: string | null;
  readonly pubDate: Date | null;
  readonly sentiment: PersistedNewsSentiment | null;
  readonly capturedAt: Date;
}
