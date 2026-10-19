import {
  InternalServerErrorException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SentimentController } from '../../src/sentiment/controllers/sentiment.controller';
import {
  DirectSentimentTextTooLongError,
  SentimentDictionaryReadError,
} from '../../src/sentiment/errors/sentiment-analysis.error';
import { DirectSentimentAnalysisService } from '../../src/sentiment/services/direct-sentiment-analysis.service';

describe('SentimentController', () => {
  const service = { analyzeText: jest.fn() };
  let controller: SentimentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SentimentController(
      service as unknown as DirectSentimentAnalysisService,
    );
  });

  it('devuelve exactamente score y matchedTerms', async () => {
    service.analyzeText.mockResolvedValue({ score: 0.75, matchedTerms: 4 });

    await expect(
      controller.analyze({ text: 'resultado', language: 'es' }),
    ).resolves.toEqual({ score: 0.75, matchedTerms: 4 });
    expect(service.analyzeText).toHaveBeenCalledWith({ text: 'resultado', language: 'es' });
  });

  it.each([
    [new DirectSentimentTextTooLongError(), PayloadTooLargeException],
    [new SentimentDictionaryReadError(), ServiceUnavailableException],
    [new Error('postgresql://secret@10.0.0.8/database'), InternalServerErrorException],
  ])('mapea y sanitiza %s', async (error, expected) => {
    service.analyzeText.mockRejectedValue(error);

    try {
      await controller.analyze({ text: 'contenido', language: 'en' });
      throw new Error('Se esperaba una excepción HTTP');
    } catch (caught) {
      expect(caught).toBeInstanceOf(expected);
      expect(JSON.stringify((caught as InternalServerErrorException).getResponse())).not.toMatch(
        /secret|10\.0\.0\.8|postgresql/,
      );
    }
  });
});
