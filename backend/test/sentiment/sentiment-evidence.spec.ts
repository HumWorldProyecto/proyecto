import { DictionarySentimentAnalyzer } from '../../src/sentiment/services/dictionary-sentiment-analyzer';
import { DictionaryTermNormalizer } from '../../src/dictionary/domain/dictionary-term-normalizer';
import { NewsSentimentEvidenceService } from '../../src/sentiment/services/news-sentiment-evidence.service';
import { NewsForSentimentNotFoundError } from '../../src/sentiment/errors/sentiment-analysis.error';

describe('evidencia del mismo snapshot', () => {
  it('conserva frases largas, repeticiones, pesos e idioma y no amplía contrato público', async () => {
    const reader = {
      listByLanguage: jest.fn().mockResolvedValue([
        { id: 'a', term: 'muy bueno', language: 'es', weight: 5 },
        { id: 'b', term: 'bueno', language: 'es', weight: 2 },
        { id: 'c', term: 'bad', language: 'en', weight: -5 },
      ]),
    };
    const analyzer = new DictionarySentimentAnalyzer(reader, new DictionaryTermNormalizer());
    const input = { language: 'es' as const, segments: ['Muy bueno muy bueno', 'bueno bad'] };
    const result = await analyzer.analyzeWithEvidence(input);
    expect(result).toEqual({
      score: 0.8,
      matchedTerms: 3,
      terms: [
        { term: 'muy bueno', language: 'es', weight: 5, occurrences: 2 },
        { term: 'bueno', language: 'es', weight: 2, occurrences: 1 },
      ],
    });
    expect(reader.listByLanguage).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(result.terms[0])).toBe(true);
    await expect(analyzer.analyze(input)).resolves.toEqual({ score: 0.8, matchedTerms: 3 });
  });

  it('coordina lectura y evidencia sin mutar la noticia, y rechaza inexistencia', async () => {
    const reader = {
      findById: jest.fn().mockResolvedValue({ id: 'a', title: 'bueno', description: null }),
    };
    const analyzer = {
      analyzeWithEvidence: jest
        .fn()
        .mockResolvedValue({
          score: 1,
          matchedTerms: 1,
          terms: [{ term: 'bueno', language: 'es', weight: 5, occurrences: 1 }],
        }),
    };
    const service = new NewsSentimentEvidenceService(reader, analyzer);
    expect(await service.analyzeNews({ newsId: 'a', language: 'es' })).toMatchObject({
      newsId: 'a',
      score: 1,
      terms: [{ term: 'bueno', weight: 5, language: 'es', occurrences: 1 }],
    });
    expect(analyzer.analyzeWithEvidence).toHaveBeenCalledWith({
      language: 'es',
      segments: ['bueno', null],
    });
    reader.findById.mockResolvedValue(null);
    await expect(service.analyzeNews({ newsId: 'b', language: 'en' })).rejects.toBeInstanceOf(
      NewsForSentimentNotFoundError,
    );
    expect(analyzer.analyzeWithEvidence).toHaveBeenCalledTimes(1);
  });
});
