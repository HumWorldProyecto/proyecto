import {
  DictionaryTermNormalizer,
  MAX_DICTIONARY_TERM_LENGTH,
} from '../../src/dictionary/domain/dictionary-term-normalizer';
import { DictionaryInputError } from '../../src/dictionary/errors/dictionary-domain.error';

describe('DictionaryTermNormalizer', () => {
  const normalizer = new DictionaryTermNormalizer();

  it('aplica NFKC, minúsculas, separadores Unicode, colapso y trim', () => {
    expect(normalizer.normalizeAndValidate('  ＭＵＹ—POSITIVO...  ', 'es')).toBe(
      'muy positivo',
    );
    expect(normalizer.normalizeAndValidate('good\t\nnews', 'en')).toBe('good news');
  });

  it('conserva diacríticos y no confunde sí con si', () => {
    expect(normalizer.normalizeAndValidate('SÍ', 'es')).toBe('sí');
    expect(normalizer.normalizeAndValidate('SI', 'es')).toBe('si');
  });

  it('acepta exactamente 200 caracteres Unicode y rechaza 201', () => {
    expect(
      [...normalizer.normalizeAndValidate('á'.repeat(MAX_DICTIONARY_TERM_LENGTH), 'es')],
    ).toHaveLength(200);
    expect(() => normalizer.normalizeAndValidate('á'.repeat(201), 'es')).toThrow(
      DictionaryInputError,
    );
  });

  it.each(['', '  !!!  ', '😀'])('rechaza una forma canónica vacía: %p', (term) => {
    expect(() => normalizer.normalizeAndValidate(term, 'es')).toThrow(DictionaryInputError);
  });

  it('rechaza un término no textual y un idioma no admitido', () => {
    expect(() =>
      normalizer.normalizeAndValidate(42 as unknown as string, 'es'),
    ).toThrow(DictionaryInputError);
    expect(() =>
      normalizer.normalizeAndValidate('valid', 'fr' as unknown as 'es'),
    ).toThrow(DictionaryInputError);
  });

  it.each([-5, 0, 5])('acepta el peso entero límite %p', (weight) => {
    expect(() => normalizer.assertWeight(weight)).not.toThrow();
  });

  it.each([-6, 6, 1.5, Number.NaN, '2'])('rechaza el peso inválido %p', (weight) => {
    expect(() => normalizer.assertWeight(weight)).toThrow(DictionaryInputError);
  });
});
