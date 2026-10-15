import { DictionaryEntry, DictionaryLanguage } from '../types/dictionary-entry';

export interface DictionaryReaderPort {
  listByLanguage(language: DictionaryLanguage): Promise<readonly DictionaryEntry[]>;
}

export const DICTIONARY_READER_PORT = Symbol('DICTIONARY_READER_PORT');
