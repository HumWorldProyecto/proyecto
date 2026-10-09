import { DictionaryInputError } from '../errors/dictionary-domain.error';
import {
  DICTIONARY_LANGUAGES,
  DictionaryLanguage,
} from '../types/dictionary-entry';

export const MAX_DICTIONARY_TERM_LENGTH = 200;

export class DictionaryTermNormalizer {
  normalize(rawTerm: string, language: DictionaryLanguage): string {
    if (typeof rawTerm !== 'string') {
      throw new DictionaryInputError('El término debe ser texto');
    }

    return rawTerm
      .normalize('NFKC')
      .toLocaleLowerCase(language)
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  normalizeAndValidate(rawTerm: string, language: DictionaryLanguage): string {
    this.assertLanguage(language);
    const term = this.normalize(rawTerm, language);
    const length = [...term].length;

    if (length === 0) {
      throw new DictionaryInputError('El término no puede quedar vacío');
    }
    if (length > MAX_DICTIONARY_TERM_LENGTH) {
      throw new DictionaryInputError('El término supera los 200 caracteres');
    }

    return term;
  }

  assertLanguage(language: unknown): asserts language is DictionaryLanguage {
    if (!DICTIONARY_LANGUAGES.includes(language as DictionaryLanguage)) {
      throw new DictionaryInputError('El idioma debe ser es o en');
    }
  }

  assertWeight(weight: unknown): asserts weight is number {
    if (typeof weight !== 'number' || !Number.isInteger(weight) || weight < -5 || weight > 5) {
      throw new DictionaryInputError('El peso debe ser un entero entre -5 y 5');
    }
  }
}
