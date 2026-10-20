import {
  NewsForSentimentNotFoundError,
  NewsSentimentPersistenceError,
} from '../../src/sentiment/errors/sentiment-analysis.error';
import { NewsSentimentRepositoryPort } from '../../src/sentiment/ports/news-sentiment-repository.port';
import { AnalyzeAndPersistNewsSentimentService } from '../../src/sentiment/services/analyze-and-persist-news-sentiment.service';
import { NewsSentimentEvidenceService } from '../../src/sentiment/services/news-sentiment-evidence.service';

describe('AnalyzeAndPersistNewsSentimentService', () => {
  const newsId = '11111111-1111-4111-8111-111111111111';
  let analysis: jest.Mocked<Pick<NewsSentimentEvidenceService, 'analyzeNews'>>;
  let repository: jest.Mocked<NewsSentimentRepositoryPort>;
  let service: AnalyzeAndPersistNewsSentimentService;

  beforeEach(() => {
    analysis = { analyzeNews: jest.fn() };
    repository = { replaceLatest: jest.fn() };
    service = new AnalyzeAndPersistNewsSentimentService(
      analysis as unknown as NewsSentimentEvidenceService,
      repository,
    );
  });

  it.each([
    { language: 'es' as const, score: 0.8, matchedTerms: 2 },
    { language: 'en' as const, score: -1, matchedTerms: 1 },
    { language: 'es' as const, score: 0, matchedTerms: 3 },
    { language: 'en' as const, score: 0, matchedTerms: 0 },
  ])('analiza primero y persiste el resultado completo %#', async (example) => {
    analysis.analyzeNews.mockResolvedValue({
      newsId,
      score: example.score,
      matchedTerms: example.matchedTerms,
      terms: [],
    });
    const persisted = {
      newsId,
      sentiment: {
        score: example.score,
        matchedTerms: example.matchedTerms,
        language: example.language,
        analyzedAt: new Date('2026-10-11T15:30:00.000Z'),
      },
    };
    repository.replaceLatest.mockResolvedValue(persisted);

    await expect(service.execute({ newsId, language: example.language })).resolves.toBe(persisted);

    expect(analysis.analyzeNews).toHaveBeenCalledWith({ newsId, language: example.language });
    expect(repository.replaceLatest).toHaveBeenCalledWith({
      newsId,
      score: example.score,
      matchedTerms: example.matchedTerms,
      terms: [],
      language: example.language,
    });
    expect(analysis.analyzeNews.mock.invocationCallOrder[0]).toBeLessThan(
      repository.replaceLatest.mock.invocationCallOrder[0],
    );
  });

  it('no escribe cuando falla la lectura o el análisis', async () => {
    const failure = new Error('fallo controlado');
    analysis.analyzeNews.mockRejectedValue(failure);

    await expect(service.execute({ newsId, language: 'es' })).rejects.toBe(failure);
    expect(repository.replaceLatest).not.toHaveBeenCalled();
  });

  it('propaga un fallo de persistencia y no informa un resultado', async () => {
    analysis.analyzeNews.mockResolvedValue({ newsId, score: 1, matchedTerms: 1, terms: [] });
    repository.replaceLatest.mockRejectedValue(new NewsSentimentPersistenceError());

    await expect(service.execute({ newsId, language: 'es' })).rejects.toBeInstanceOf(
      NewsSentimentPersistenceError,
    );
  });

  it('propaga inexistencia si la noticia desaparece antes de la escritura', async () => {
    analysis.analyzeNews.mockResolvedValue({ newsId, score: 1, matchedTerms: 1, terms: [] });
    repository.replaceLatest.mockRejectedValue(new NewsForSentimentNotFoundError());

    await expect(service.execute({ newsId, language: 'es' })).rejects.toBeInstanceOf(
      NewsForSentimentNotFoundError,
    );
  });
});
