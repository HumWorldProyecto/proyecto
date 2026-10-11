import { DictionaryLanguage } from '../../dictionary/types/dictionary-entry';

export type PersistedNewsSentiment = Readonly<{
  score: number;
  matchedTerms: number;
  language: DictionaryLanguage;
  analyzedAt: Date;
}>;

export type PersistNewsSentimentInput = Readonly<{
  newsId: string;
  score: number;
  matchedTerms: number;
  language: DictionaryLanguage;
}>;

export type PersistedNewsSentimentResult = Readonly<{
  newsId: string;
  sentiment: PersistedNewsSentiment;
}>;
