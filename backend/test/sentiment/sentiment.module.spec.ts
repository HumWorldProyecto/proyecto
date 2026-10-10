import { Test } from '@nestjs/testing';
import { PrismaNewsForSentimentReader } from '../../src/sentiment/adapters/prisma-news-for-sentiment.reader';
import { SentimentController } from '../../src/sentiment/controllers/sentiment.controller';
import { SentimentModule } from '../../src/sentiment/sentiment.module';
import { NEWS_FOR_SENTIMENT_READER_PORT } from '../../src/sentiment/ports/news-for-sentiment-reader.port';
import { SENTIMENT_ANALYZER_PORT } from '../../src/sentiment/ports/sentiment-analyzer.port';
import { DictionarySentimentAnalyzer } from '../../src/sentiment/services/dictionary-sentiment-analyzer';
import { DirectSentimentAnalysisService } from '../../src/sentiment/services/direct-sentiment-analysis.service';
import { NewsSentimentAnalysisService } from '../../src/sentiment/services/news-sentiment-analysis.service';

describe('SentimentModule', () => {
  it('compone el lector News, el puerto del motor y un caso de uso resoluble', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [SentimentModule] }).compile();

    expect(moduleRef.get(NEWS_FOR_SENTIMENT_READER_PORT)).toBeInstanceOf(
      PrismaNewsForSentimentReader,
    );
    expect(moduleRef.get(SENTIMENT_ANALYZER_PORT)).toBeInstanceOf(DictionarySentimentAnalyzer);
    expect(moduleRef.get(DirectSentimentAnalysisService)).toBeInstanceOf(
      DirectSentimentAnalysisService,
    );
    expect(moduleRef.get(SentimentController)).toBeInstanceOf(SentimentController);
    expect(moduleRef.get(NewsSentimentAnalysisService)).toBeInstanceOf(
      NewsSentimentAnalysisService,
    );

    await moduleRef.close();
  });
});
