import {
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NewsSentimentController } from '../../src/sentiment/controllers/news-sentiment.controller';
import {
  NewsForSentimentNotFoundError,
  NewsForSentimentReadError,
  NewsSentimentPersistenceError,
  SentimentDictionaryReadError,
} from '../../src/sentiment/errors/sentiment-analysis.error';
import { AnalyzeAndPersistNewsSentimentService } from '../../src/sentiment/services/analyze-and-persist-news-sentiment.service';

describe('NewsSentimentController', () => {
  const newsId = '11111111-1111-4111-8111-111111111111';
  let execute: jest.Mock;
  let controller: NewsSentimentController;

  beforeEach(() => {
    execute = jest.fn();
    controller = new NewsSentimentController(
      { execute } as unknown as AnalyzeAndPersistNewsSentimentService,
    );
  });

  it('devuelve exactamente el resultado confirmado por persistencia', async () => {
    const analyzedAt = new Date('2026-10-11T15:30:00.000Z');
    execute.mockResolvedValue({
      newsId,
      sentiment: { score: 0.8, matchedTerms: 2, language: 'es', analyzedAt },
    });

    await expect(controller.analyze(newsId, { language: 'es' })).resolves.toEqual({
      newsId,
      sentiment: { score: 0.8, matchedTerms: 2, language: 'es', analyzedAt },
    });
    expect(execute).toHaveBeenCalledWith({ newsId, language: 'es' });
  });

  it('mapea inexistencia a 404', async () => {
    execute.mockRejectedValue(new NewsForSentimentNotFoundError());
    await expect(controller.analyze(newsId, { language: 'es' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('mapea fallo del diccionario a 503 sin detalles internos', async () => {
    execute.mockRejectedValue(new SentimentDictionaryReadError());
    await expect(controller.analyze(newsId, { language: 'en' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it.each([
    new NewsForSentimentReadError(),
    new NewsSentimentPersistenceError(),
    new Error('sql password=secret'),
  ])('mapea fallos internos o de persistencia a 500 sanitizado', async (failure) => {
    execute.mockRejectedValue(failure);

    try {
      await controller.analyze(newsId, { language: 'es' });
      throw new Error('La llamada debió fallar');
    } catch (error) {
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect((error as Error).message).not.toMatch(/sql|password|secret/i);
    }
  });
});
