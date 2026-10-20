import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NewsForSentimentNotFoundError,
  NewsSentimentPersistenceError,
} from '../errors/sentiment-analysis.error';
import { NewsSentimentRepositoryPort } from '../ports/news-sentiment-repository.port';
import {
  PersistNewsSentimentInput,
  PersistedNewsSentimentResult,
} from '../types/persisted-news-sentiment';

@Injectable()
export class PrismaNewsSentimentRepository implements NewsSentimentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async replaceLatest(input: PersistNewsSentimentInput): Promise<PersistedNewsSentimentResult> {
    const analyzedAt = new Date();

    try {
      const row = await this.prisma.news.update({
        where: { id: input.newsId },
        data: {
          sentimentScore: input.score,
          sentimentMatchedTerms: input.matchedTerms,
          sentimentLanguage: input.language,
          sentimentAnalyzedAt: analyzedAt,
          sentimentTerms: input.terms ? input.terms.map((term) => ({ ...term })) : Prisma.DbNull,
        },
        select: {
          id: true,
          sentimentScore: true,
          sentimentMatchedTerms: true,
          sentimentLanguage: true,
          sentimentAnalyzedAt: true,
        },
      });

      if (
        row.sentimentScore === null ||
        row.sentimentMatchedTerms === null ||
        row.sentimentLanguage === null ||
        row.sentimentAnalyzedAt === null
      ) {
        throw new NewsSentimentPersistenceError();
      }

      return Object.freeze({
        newsId: row.id,
        sentiment: Object.freeze({
          score: Number(row.sentimentScore),
          matchedTerms: row.sentimentMatchedTerms,
          language: row.sentimentLanguage,
          analyzedAt: row.sentimentAnalyzedAt,
        }),
      });
    } catch (error) {
      if (error instanceof NewsSentimentPersistenceError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NewsForSentimentNotFoundError();
      }
      throw new NewsSentimentPersistenceError();
    }
  }
}
