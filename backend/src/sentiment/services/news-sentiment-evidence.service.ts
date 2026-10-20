import { Inject, Injectable } from '@nestjs/common';
import { NewsForSentimentNotFoundError } from '../errors/sentiment-analysis.error';
import {
  NEWS_FOR_SENTIMENT_READER_PORT,
  NewsForSentimentReaderPort,
} from '../ports/news-for-sentiment-reader.port';
import {
  SENTIMENT_EVIDENCE_ANALYZER_PORT,
  SentimentEvidenceAnalyzerPort,
  SentimentEvidenceResult,
} from '../ports/sentiment-evidence-analyzer.port';
import { NewsSentimentAnalysisInput } from '../types/sentiment-analysis';

@Injectable()
export class NewsSentimentEvidenceService {
  constructor(
    @Inject(NEWS_FOR_SENTIMENT_READER_PORT) private readonly reader: NewsForSentimentReaderPort,
    @Inject(SENTIMENT_EVIDENCE_ANALYZER_PORT)
    private readonly analyzer: SentimentEvidenceAnalyzerPort,
  ) {}

  async analyzeNews(
    input: NewsSentimentAnalysisInput,
  ): Promise<SentimentEvidenceResult & { newsId: string }> {
    const news = await this.reader.findById(input.newsId);
    if (!news) throw new NewsForSentimentNotFoundError();
    const result = await this.analyzer.analyzeWithEvidence({
      language: input.language,
      segments: [news.title, news.description],
    });
    return Object.freeze({ newsId: input.newsId, ...result });
  }
}
