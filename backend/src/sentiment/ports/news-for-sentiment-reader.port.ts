export type NewsForSentiment = Readonly<{
  id: string;
  title: string | null;
  description: string | null;
}>;

export interface NewsForSentimentReaderPort {
  findById(newsId: string): Promise<NewsForSentiment | null>;
}

export const NEWS_FOR_SENTIMENT_READER_PORT = Symbol('NEWS_FOR_SENTIMENT_READER_PORT');
