import { DictionaryLanguage } from '../../dictionary/types/dictionary-entry';
import { SentimentTermEvidence } from '../ports/sentiment-evidence-analyzer.port';

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
  terms?: readonly SentimentTermEvidence[];
}>;

export type PersistedNewsSentimentResult = Readonly<{
  newsId: string;
  sentiment: PersistedNewsSentiment;
}>;
