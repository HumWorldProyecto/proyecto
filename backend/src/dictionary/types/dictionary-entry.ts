export const DICTIONARY_LANGUAGES = ['es', 'en'] as const;

export type DictionaryLanguage = (typeof DICTIONARY_LANGUAGES)[number];

export type DictionaryEntry = Readonly<{
  id: string;
  term: string;
  language: DictionaryLanguage;
  weight: number;
}>;

export type DictionaryEntryData = Readonly<Omit<DictionaryEntry, 'id'>>;

export type DictionaryEntryChanges = Readonly<Partial<DictionaryEntryData>>;
