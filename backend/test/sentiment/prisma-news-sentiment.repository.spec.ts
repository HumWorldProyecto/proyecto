import { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  NewsForSentimentNotFoundError,
  NewsSentimentPersistenceError,
} from '../../src/sentiment/errors/sentiment-analysis.error';
import { PrismaNewsSentimentRepository } from '../../src/sentiment/repositories/prisma-news-sentiment.repository';

describe('PrismaNewsSentimentRepository', () => {
  const newsId = '11111111-1111-4111-8111-111111111111';
  const analyzedAt = new Date('2026-10-11T15:30:00.000Z');
  let update: jest.Mock;
  let repository: PrismaNewsSentimentRepository;

  beforeEach(() => {
    update = jest.fn();
    const prisma = { news: { update } } as unknown as PrismaService;
    repository = new PrismaNewsSentimentRepository(prisma);
  });

  it('actualiza solo el tuple de sentimiento y convierte Decimal a number', async () => {
    update.mockResolvedValue({
      id: newsId,
      sentimentScore: new Prisma.Decimal('0.8000'),
      sentimentMatchedTerms: 2,
      sentimentLanguage: 'es',
      sentimentAnalyzedAt: analyzedAt,
    });

    const result = await repository.replaceLatest({
      newsId,
      score: 0.8,
      matchedTerms: 2,
      language: 'es',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: newsId },
      data: {
        sentimentScore: 0.8,
        sentimentMatchedTerms: 2,
        sentimentLanguage: 'es',
        sentimentAnalyzedAt: expect.any(Date),
      },
      select: {
        id: true,
        sentimentScore: true,
        sentimentMatchedTerms: true,
        sentimentLanguage: true,
        sentimentAnalyzedAt: true,
      },
    });
    expect(result).toEqual({
      newsId,
      sentiment: { score: 0.8, matchedTerms: 2, language: 'es', analyzedAt },
    });
    expect(typeof result.sentiment.score).toBe('number');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sentiment)).toBe(true);
  });

  it('traduce P2025 a noticia inexistente', async () => {
    update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: '6.19.3',
      }),
    );

    await expect(
      repository.replaceLatest({ newsId, score: 0, matchedTerms: 0, language: 'en' }),
    ).rejects.toBeInstanceOf(NewsForSentimentNotFoundError);
  });

  it('sanitiza fallos inesperados y estados incompletos', async () => {
    update.mockRejectedValueOnce(new Error('password=secret sql select'));
    await expect(
      repository.replaceLatest({ newsId, score: 0, matchedTerms: 0, language: 'es' }),
    ).rejects.toEqual(new NewsSentimentPersistenceError());

    update.mockResolvedValueOnce({
      id: newsId,
      sentimentScore: new Prisma.Decimal('0.0000'),
      sentimentMatchedTerms: null,
      sentimentLanguage: 'es',
      sentimentAnalyzedAt: analyzedAt,
    });
    await expect(
      repository.replaceLatest({ newsId, score: 0, matchedTerms: 0, language: 'es' }),
    ).rejects.toBeInstanceOf(NewsSentimentPersistenceError);
  });
});
