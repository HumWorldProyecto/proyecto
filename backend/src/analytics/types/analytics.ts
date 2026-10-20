import { SentimentTermEvidence } from '../../sentiment/ports/sentiment-evidence-analyzer.port';

export const CONTINENTS = [
  'AFRICA',
  'ASIA',
  'EUROPE',
  'NORTH_AMERICA',
  'SOUTH_AMERICA',
  'OCEANIA',
] as const;
export type AnalyticsContinent = (typeof CONTINENTS)[number];
export type Country = Readonly<{ code: string; name: string; continent: AnalyticsContinent }>;
export type HumorFilter = Readonly<{
  continent?: AnalyticsContinent;
  country?: string;
  from?: string;
  to?: string;
}>;
export type SourceGeography = Readonly<{
  id: string;
  url: string;
  active: boolean;
  countryCode: string | null;
  continent: AnalyticsContinent | null;
}>;
export type AnalyticsRecord = Readonly<{
  id: string;
  title: string | null;
  description: string | null;
  link: string | null;
  pubDate: Date | null;
  capturedAt: Date;
  sourceId: string;
  sourceUrl: string;
  countryCode: string | null;
  continent: AnalyticsContinent | null;
  score: number | null;
  matchedTerms: number | null;
  language: 'es' | 'en' | null;
  analyzedAt: Date | null;
  terms: readonly SentimentTermEvidence[] | null;
}>;
export type Coverage = Readonly<{
  total: number;
  analyzed: number;
  withEvidence: number;
  withoutEvidence: number;
  unanalyzed: number;
  unknownCountry: number;
  missingTermEvidence: number;
  average: number | null;
}>;
export type NewsDetail = Omit<AnalyticsRecord, 'pubDate' | 'capturedAt' | 'analyzedAt'> & {
  date: string;
  dateSource: 'publication' | 'capture';
  analyzedAt: string | null;
  contribution: number | null;
};
export type WordInfluence = {
  term: string;
  language: 'es' | 'en';
  occurrences: number;
  newsCount: number;
  contribution: number;
  influence: number;
};
export type HumorDashboard = {
  filters: {
    continent: AnalyticsContinent | null;
    country: string | null;
    from: string | null;
    to: string | null;
  };
  summary: Coverage;
  timeline: (Coverage & { date: string })[];
  countries: (Country & Coverage)[];
  words: WordInfluence[];
  news: NewsDetail[];
};

export class AnalyticsInputError extends Error {}
export class AnalyticsUnavailableError extends Error {}
export class GeographySourceNotFoundError extends Error {}
