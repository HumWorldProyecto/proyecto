import { Inject, Injectable } from '@nestjs/common';
import { NewsForSentimentNotFoundError } from '../errors/sentiment-analysis.error';
import {
  NEWS_FOR_SENTIMENT_READER_PORT,
  NewsForSentimentReaderPort,
} from '../ports/news-for-sentiment-reader.port';
import {
  SENTIMENT_ANALYZER_PORT,
  SentimentAnalyzerPort,
} from '../ports/sentiment-analyzer.port';
import {
  NewsSentimentAnalysisInput,
  NewsSentimentAnalysisResult,
} from '../types/sentiment-analysis';

@Injectable()
export class NewsSentimentAnalysisService {
  constructor(
    @Inject(NEWS_FOR_SENTIMENT_READER_PORT)
    private readonly newsReader: NewsForSentimentReaderPort,
    @Inject(SENTIMENT_ANALYZER_PORT)
    private readonly sentimentAnalyzer: SentimentAnalyzerPort,
  ) {}

  async analyzeNews(input: NewsSentimentAnalysisInput): Promise<NewsSentimentAnalysisResult> {
    const news = await this.newsReader.findById(input.newsId);
    if (!news) {
      throw new NewsForSentimentNotFoundError();
    }

    const result = await this.sentimentAnalyzer.analyze({
      language: input.language,
      segments: [news.title, news.description],
    });

    return Object.freeze({
      newsId: input.newsId,
      score: result.score,
      matchedTerms: result.matchedTerms,
    });
  }
}
