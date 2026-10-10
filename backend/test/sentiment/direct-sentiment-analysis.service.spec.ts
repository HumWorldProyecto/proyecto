import { DirectSentimentTextTooLongError } from '../../src/sentiment/errors/sentiment-analysis.error';
import { SentimentAnalyzerPort } from '../../src/sentiment/ports/sentiment-analyzer.port';
import {
  DirectSentimentAnalysisService,
} from '../../src/sentiment/services/direct-sentiment-analysis.service';
import { DIRECT_SENTIMENT_MAX_CODE_POINTS } from '../../src/sentiment/types/direct-sentiment-analysis';

describe('DirectSentimentAnalysisService', () => {
  let analyzer: jest.Mocked<SentimentAnalyzerPort>;
  let service: DirectSentimentAnalysisService;

  beforeEach(() => {
    analyzer = { analyze: jest.fn() };
    service = new DirectSentimentAnalysisService(analyzer);
  });

  it.each(['es', 'en'] as const)(
    'delega %s con el texto como único segmento y conserva el resultado',
    async (language) => {
      const input = Object.freeze({ text: 'texto estable', language });
      const result = Object.freeze({ score: 0.4, matchedTerms: 2 });
      analyzer.analyze.mockResolvedValue(result);

      await expect(service.analyzeText(input)).resolves.toBe(result);
      expect(analyzer.analyze).toHaveBeenCalledTimes(1);
      expect(analyzer.analyze).toHaveBeenCalledWith({
        language,
        segments: ['texto estable'],
      });
      expect(input).toEqual({ text: 'texto estable', language });
    },
  );

  it('acepta exactamente 10.000 puntos Unicode, incluidos pares sustitutos', async () => {
    const text = '😀'.repeat(DIRECT_SENTIMENT_MAX_CODE_POINTS);
    analyzer.analyze.mockResolvedValue({ score: 0, matchedTerms: 0 });

    await expect(service.analyzeText({ text, language: 'es' })).resolves.toEqual({
      score: 0,
      matchedTerms: 0,
    });
    expect(text.length).toBe(DIRECT_SENTIMENT_MAX_CODE_POINTS * 2);
    expect(analyzer.analyze).toHaveBeenCalledTimes(1);
  });

  it('rechaza 10.001 puntos Unicode antes de invocar el motor', async () => {
    const text = '😀'.repeat(DIRECT_SENTIMENT_MAX_CODE_POINTS + 1);

    await expect(service.analyzeText({ text, language: 'en' })).rejects.toBeInstanceOf(
      DirectSentimentTextTooLongError,
    );
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it('propaga el fallo controlado del motor para que la API lo clasifique', async () => {
    const failure = new Error('fallo controlado por el adaptador');
    analyzer.analyze.mockRejectedValue(failure);

    await expect(
      service.analyzeText({ text: 'contenido', language: 'es' }),
    ).rejects.toBe(failure);
  });
});
