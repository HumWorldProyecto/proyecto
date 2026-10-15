import { DictionaryTermNormalizer } from '../../src/dictionary/domain/dictionary-term-normalizer';
import { DictionaryInputError } from '../../src/dictionary/errors/dictionary-domain.error';
import { DictionaryReaderPort } from '../../src/dictionary/ports/dictionary-reader.port';
import { DictionaryEntry } from '../../src/dictionary/types/dictionary-entry';
import { SentimentDictionaryReadError } from '../../src/sentiment/errors/sentiment-analysis.error';
import {
  calculateSentimentScore,
  DictionarySentimentAnalyzer,
  roundHalfAwayFromZero,
} from '../../src/sentiment/services/dictionary-sentiment-analyzer';

function entry(
  id: string,
  term: string,
  weight: number,
  language: 'es' | 'en' = 'es',
): DictionaryEntry {
  return Object.freeze({ id, term, weight, language });
}

describe('DictionarySentimentAnalyzer', () => {
  let reader: jest.Mocked<DictionaryReaderPort>;
  let analyzer: DictionarySentimentAnalyzer;

  beforeEach(() => {
    reader = { listByLanguage: jest.fn() };
    analyzer = new DictionarySentimentAnalyzer(reader, new DictionaryTermNormalizer());
  });

  it('devuelve cero para segmentos vacíos sin consultar el diccionario', async () => {
    const segments = Object.freeze([null, undefined, '', ' <p>!!!</p> ']);
    const result = await analyzer.analyze({ language: 'es', segments });

    expect(result).toEqual({ score: 0, matchedTerms: 0 });
    expect(Object.isFrozen(result)).toBe(true);
    expect(reader.listByLanguage).not.toHaveBeenCalled();
    expect(segments).toEqual([null, undefined, '', ' <p>!!!</p> ']);
  });

  it('normaliza HTML, NFKC, mayúsculas y puntuación preservando diacríticos', async () => {
    reader.listByLanguage.mockResolvedValue([
      entry('a', 'muy bueno', 5),
      entry('b', 'sí', 5),
      entry('c', 'si', -5),
    ]);
    const segments = Object.freeze(['<p>ＭＵＹ, bueno!</p>', 'SÍ']);

    await expect(analyzer.analyze({ language: 'es', segments })).resolves.toEqual({
      score: 1,
      matchedTerms: 2,
    });
    expect(reader.listByLanguage).toHaveBeenCalledTimes(1);
    expect(reader.listByLanguage).toHaveBeenCalledWith('es');
    expect(segments).toEqual(['<p>ＭＵＹ, bueno!</p>', 'SÍ']);
  });

  it('elige la frase más larga y no cuenta a la vez su subfrase', async () => {
    reader.listByLanguage.mockResolvedValue([
      entry('word', 'bueno', 2),
      entry('phrase', 'muy bueno', 5),
    ]);

    await expect(analyzer.analyze({ language: 'es', segments: ['muy bueno'] })).resolves.toEqual({
      score: 1,
      matchedTerms: 1,
    });
  });

  it('cuenta repeticiones no solapadas y recorre de izquierda a derecha', async () => {
    reader.listByLanguage.mockResolvedValue([
      entry('word', 'bueno', 2),
      entry('phrase', 'bueno bueno', 5),
    ]);

    await expect(
      analyzer.analyze({ language: 'es', segments: ['bueno bueno bueno'] }),
    ).resolves.toEqual({ score: 0.7, matchedTerms: 2 });
  });

  it('no forma frases entre título y descripción ni coincide por subcadena', async () => {
    reader.listByLanguage.mockResolvedValue([
      entry('phrase', 'muy bueno', 5),
      entry('token', 'bien', 5),
    ]);

    await expect(
      analyzer.analyze({ language: 'es', segments: ['muy', 'bueno también'] }),
    ).resolves.toEqual({ score: 0, matchedTerms: 0 });
  });

  it('distingue neutralidad observada de ausencia de evidencia', async () => {
    reader.listByLanguage.mockResolvedValue([
      entry('positive', 'bueno', 5),
      entry('negative', 'malo', -5),
      entry('neutral', 'normal', 0),
    ]);

    await expect(analyzer.analyze({ language: 'es', segments: ['normal'] })).resolves.toEqual({
      score: 0,
      matchedTerms: 1,
    });
    await expect(analyzer.analyze({ language: 'es', segments: ['bueno malo'] })).resolves.toEqual({
      score: 0,
      matchedTerms: 2,
    });
    await expect(analyzer.analyze({ language: 'es', segments: ['desconocido'] })).resolves.toEqual({
      score: 0,
      matchedTerms: 0,
    });
  });

  it('aísla explícitamente español e inglés aunque el snapshot esté contaminado', async () => {
    reader.listByLanguage.mockResolvedValue([
      entry('es', 'éxito', 5, 'es'),
      entry('en', 'éxito', -5, 'en'),
    ]);

    await expect(analyzer.analyze({ language: 'es', segments: ['ÉXITO'] })).resolves.toEqual({
      score: 1,
      matchedTerms: 1,
    });
  });

  it('resuelve empates defensivos por id e ignora el orden del snapshot', async () => {
    const entries = [entry('b', 'stable', -5, 'en'), entry('a', 'stable', 5, 'en')];
    reader.listByLanguage.mockResolvedValueOnce(entries).mockResolvedValueOnce([...entries].reverse());

    await expect(analyzer.analyze({ language: 'en', segments: ['stable'] })).resolves.toEqual({
      score: 1,
      matchedTerms: 1,
    });
    await expect(analyzer.analyze({ language: 'en', segments: ['stable'] })).resolves.toEqual({
      score: 1,
      matchedTerms: 1,
    });
  });

  it('observa cambios del diccionario solo en invocaciones posteriores', async () => {
    reader.listByLanguage
      .mockResolvedValueOnce([entry('a', 'cambio', 1)])
      .mockResolvedValueOnce([entry('a', 'cambio', 5)]);

    const first = await analyzer.analyze({ language: 'es', segments: ['cambio'] });
    const second = await analyzer.analyze({ language: 'es', segments: ['cambio'] });

    expect(first).toEqual({ score: 0.2, matchedTerms: 1 });
    expect(second).toEqual({ score: 1, matchedTerms: 1 });
    expect(first).toEqual({ score: 0.2, matchedTerms: 1 });
  });

  it('convierte un fallo del reader en error controlado, nunca en cero', async () => {
    reader.listByLanguage.mockRejectedValue(new Error('postgresql://secret@10.0.0.1'));

    try {
      await analyzer.analyze({ language: 'es', segments: ['texto'] });
      throw new Error('Se esperaba SentimentDictionaryReadError');
    } catch (error) {
      expect(error).toBeInstanceOf(SentimentDictionaryReadError);
      expect(JSON.stringify(error)).not.toMatch(/secret|10\.0\.0\.1|postgresql/);
    }
  });

  it('rechaza un idioma no admitido antes de consultar el reader', async () => {
    await expect(
      analyzer.analyze({ language: 'fr' as 'es', segments: ['texte'] }),
    ).rejects.toBeInstanceOf(DictionaryInputError);
    expect(reader.listByLanguage).not.toHaveBeenCalled();
  });
});

describe('score de sentimiento', () => {
  it.each([
    [0.12345, 0.1235],
    [-0.12345, -0.1235],
    [0.12344, 0.1234],
    [-0.12344, -0.1234],
  ])('redondea %p a %p con mitad alejándose de cero', (input, expected) => {
    expect(roundHalfAwayFromZero(input, 4)).toBe(expected);
  });

  it('normaliza -0 y aplica cero, promedio y clamp', () => {
    expect(roundHalfAwayFromZero(-0, 4)).toBe(0);
    expect(Object.is(roundHalfAwayFromZero(-0, 4), -0)).toBe(false);
    expect(calculateSentimentScore(0, 0)).toBe(0);
    expect(calculateSentimentScore(8, 3)).toBe(0.5333);
    expect(calculateSentimentScore(20, 1)).toBe(1);
    expect(calculateSentimentScore(-20, 1)).toBe(-1);
  });
});
