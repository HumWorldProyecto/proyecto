import { SentimentLanguage } from './sentiment-analysis';

export const DIRECT_SENTIMENT_MAX_CODE_POINTS = 10_000;

export type DirectSentimentAnalysisInput = Readonly<{
  text: string;
  language: SentimentLanguage;
}>;
