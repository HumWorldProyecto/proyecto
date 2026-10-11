import { Inject, Injectable } from '@nestjs/common';
import { DictionaryLanguage } from '../../dictionary/types/dictionary-entry';
import {
  NEWS_SENTIMENT_REPOSITORY_PORT,
  NewsSentimentRepositoryPort,
} from '../ports/news-sentiment-repository.port';
import { PersistedNewsSentimentResult } from '../types/persisted-news-sentiment';
import { NewsSentimentAnalysisService } from './news-sentiment-analysis.service';

export type AnalyzeAndPersistNewsSentimentInput = Readonly<{
  newsId: string;
  language: DictionaryLanguage;
}>;

@Injectable()
export class AnalyzeAndPersistNewsSentimentService {
  constructor(
    private readonly newsAnalysis: NewsSentimentAnalysisService,
    @Inject(NEWS_SENTIMENT_REPOSITORY_PORT)
    private readonly repository: NewsSentimentRepositoryPort,
  ) {}

  async execute(
    input: AnalyzeAndPersistNewsSentimentInput,
  ): Promise<PersistedNewsSentimentResult> {
    const analysis = await this.newsAnalysis.analyzeNews(input);

    return this.repository.replaceLatest({
      newsId: analysis.newsId,
      score: analysis.score,
      matchedTerms: analysis.matchedTerms,
      language: input.language,
    });
  }
}
