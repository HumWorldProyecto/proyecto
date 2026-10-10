import {
  NewsForSentimentNotFoundError,
  NewsForSentimentReadError,
  SentimentDictionaryReadError,
} from '../../src/sentiment/errors/sentiment-analysis.error';
import { NewsForSentimentReaderPort } from '../../src/sentiment/ports/news-for-sentiment-reader.port';
import { SentimentAnalyzerPort } from '../../src/sentiment/ports/sentiment-analyzer.port';
import { NewsSentimentAnalysisService } from '../../src/sentiment/services/news-sentiment-analysis.service';

describe('NewsSentimentAnalysisService', () => {
  const newsId = '11111111-1111-4111-8111-111111111111';
  let newsReader: jest.Mocked<NewsForSentimentReaderPort>;
  let analyzer: jest.Mocked<SentimentAnalyzerPort>;
  let service: NewsSentimentAnalysisService;

  beforeEach(() => {
    newsReader = { findById: jest.fn() };
    analyzer = { analyze: jest.fn() };
    service = new NewsSentimentAnalysisService(newsReader, analyzer);
  });

  it('consulta por newsId, separa título/descripción y conserva el id en el resultado', async () => {
    const news = Object.freeze({ id: newsId, title: 'Muy bueno', description: 'Pero malo' });
    newsReader.findById.mockResolvedValue(news);
    analyzer.analyze.mockResolvedValue({ score: 0, matchedTerms: 2 });

    const result = await service.analyzeNews({ newsId, language: 'es' });

    expect(newsReader.findById).toHaveBeenCalledTimes(1);
    expect(newsReader.findById).toHaveBeenCalledWith(newsId);
    expect(analyzer.analyze).toHaveBeenCalledWith({
      language: 'es',
      segments: ['Muy bueno', 'Pero malo'],
    });
    expect(result).toEqual({ newsId, score: 0, matchedTerms: 2 });
    expect(Object.isFrozen(result)).toBe(true);
    expect(news).toEqual({ id: newsId, title: 'Muy bueno', description: 'Pero malo' });
  });

  it('admite una noticia existente sin texto y devuelve el resultado neutral del motor', async () => {
    newsReader.findById.mockResolvedValue({ id: newsId, title: null, description: '' });
    analyzer.analyze.mockResolvedValue({ score: 0, matchedTerms: 0 });

    await expect(service.analyzeNews({ newsId, language: 'en' })).resolves.toEqual({
      newsId,
      score: 0,
      matchedTerms: 0,
    });
    expect(analyzer.analyze).toHaveBeenCalledWith({ language: 'en', segments: [null, ''] });
  });

  it('rechaza una noticia inexistente sin invocar el motor', async () => {
    newsReader.findById.mockResolvedValue(null);

    await expect(service.analyzeNews({ newsId, language: 'es' })).rejects.toBeInstanceOf(
      NewsForSentimentNotFoundError,
    );
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it('propaga el fallo controlado de lectura de News', async () => {
    newsReader.findById.mockRejectedValue(new NewsForSentimentReadError());

    await expect(service.analyzeNews({ newsId, language: 'es' })).rejects.toBeInstanceOf(
      NewsForSentimentReadError,
    );
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it('propaga el fallo controlado del diccionario sin convertirlo en neutral', async () => {
    newsReader.findById.mockResolvedValue({ id: newsId, title: 'texto', description: null });
    analyzer.analyze.mockRejectedValue(new SentimentDictionaryReadError());

    await expect(service.analyzeNews({ newsId, language: 'es' })).rejects.toBeInstanceOf(
      SentimentDictionaryReadError,
    );
  });
});
