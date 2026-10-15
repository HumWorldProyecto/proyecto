import {
  DictionaryEntry,
  DictionaryEntryChanges,
  DictionaryEntryData,
} from '../types/dictionary-entry';

export interface DictionaryRepositoryPort {
  create(entry: DictionaryEntryData): Promise<DictionaryEntry>;
  findAll(): Promise<readonly DictionaryEntry[]>;
  findById(id: string): Promise<DictionaryEntry | null>;
  update(id: string, changes: DictionaryEntryChanges): Promise<DictionaryEntry>;
  delete(id: string): Promise<void>;
}

export const DICTIONARY_REPOSITORY_PORT = Symbol('DICTIONARY_REPOSITORY_PORT');
