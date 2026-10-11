import { Module } from '@nestjs/common';
import { DictionaryModule } from '../dictionary/dictionary.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaNewsForSentimentReader } from './adapters/prisma-news-for-sentiment.reader';
import { SentimentController } from './controllers/sentiment.controller';
import { NewsSentimentController } from './controllers/news-sentiment.controller';
import { NEWS_FOR_SENTIMENT_READER_PORT } from './ports/news-for-sentiment-reader.port';
import { NEWS_SENTIMENT_REPOSITORY_PORT } from './ports/news-sentiment-repository.port';
import { SENTIMENT_ANALYZER_PORT } from './ports/sentiment-analyzer.port';
import { PrismaNewsSentimentRepository } from './repositories/prisma-news-sentiment.repository';
import { AnalyzeAndPersistNewsSentimentService } from './services/analyze-and-persist-news-sentiment.service';
import { DictionarySentimentAnalyzer } from './services/dictionary-sentiment-analyzer';
import { DirectSentimentAnalysisService } from './services/direct-sentiment-analysis.service';
import { NewsSentimentAnalysisService } from './services/news-sentiment-analysis.service';

@Module({
  imports: [DictionaryModule, PrismaModule],
  controllers: [SentimentController, NewsSentimentController],
  providers: [
    PrismaNewsForSentimentReader,
    { provide: NEWS_FOR_SENTIMENT_READER_PORT, useExisting: PrismaNewsForSentimentReader },
    DictionarySentimentAnalyzer,
    { provide: SENTIMENT_ANALYZER_PORT, useExisting: DictionarySentimentAnalyzer },
    DirectSentimentAnalysisService,
    NewsSentimentAnalysisService,
    PrismaNewsSentimentRepository,
    { provide: NEWS_SENTIMENT_REPOSITORY_PORT, useExisting: PrismaNewsSentimentRepository },
    AnalyzeAndPersistNewsSentimentService,
  ],
  exports: [
    SENTIMENT_ANALYZER_PORT,
    DirectSentimentAnalysisService,
    NewsSentimentAnalysisService,
    AnalyzeAndPersistNewsSentimentService,
  ],
})
export class SentimentModule {}
