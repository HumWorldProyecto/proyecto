import {
  PersistNewsSentimentInput,
  PersistedNewsSentimentResult,
} from '../types/persisted-news-sentiment';

export interface NewsSentimentRepositoryPort {
  replaceLatest(input: PersistNewsSentimentInput): Promise<PersistedNewsSentimentResult>;
}

export const NEWS_SENTIMENT_REPOSITORY_PORT = Symbol('NEWS_SENTIMENT_REPOSITORY_PORT');
