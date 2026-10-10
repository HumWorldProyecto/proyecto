import { Inject, Injectable } from '@nestjs/common';
import { DirectSentimentTextTooLongError } from '../errors/sentiment-analysis.error';
import {
  SENTIMENT_ANALYZER_PORT,
  SentimentAnalyzerPort,
} from '../ports/sentiment-analyzer.port';
import {
  DIRECT_SENTIMENT_MAX_CODE_POINTS,
  DirectSentimentAnalysisInput,
} from '../types/direct-sentiment-analysis';
import { SentimentAnalysisResult } from '../types/sentiment-analysis';

@Injectable()
export class DirectSentimentAnalysisService {
  constructor(
    @Inject(SENTIMENT_ANALYZER_PORT)
    private readonly analyzer: SentimentAnalyzerPort,
  ) {}

  async analyzeText(input: DirectSentimentAnalysisInput): Promise<SentimentAnalysisResult> {
    if (Array.from(input.text).length > DIRECT_SENTIMENT_MAX_CODE_POINTS) {
      throw new DirectSentimentTextTooLongError();
    }

    return this.analyzer.analyze({
      language: input.language,
      segments: [input.text],
    });
  }
}
