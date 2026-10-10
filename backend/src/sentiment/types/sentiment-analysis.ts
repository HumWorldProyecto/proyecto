import { DictionaryLanguage } from '../../dictionary/types/dictionary-entry';

export type SentimentLanguage = DictionaryLanguage;

export type SentimentAnalysisInput = Readonly<{
  language: SentimentLanguage;
  segments: readonly (string | null | undefined)[];
}>;

export type SentimentAnalysisResult = Readonly<{
  score: number;
  matchedTerms: number;
}>;

export type NewsSentimentAnalysisInput = Readonly<{
  newsId: string;
  language: SentimentLanguage;
}>;

export type NewsSentimentAnalysisResult = Readonly<{
  newsId: string;
  score: number;
  matchedTerms: number;
}>;
