export type Continent =
  'AFRICA' | 'ASIA' | 'EUROPE' | 'NORTH_AMERICA' | 'SOUTH_AMERICA' | 'OCEANIA';
export type Filters = { continent?: Continent; country?: string; from?: string; to?: string };
export type Country = { code: string; name: string; continent: Continent };
export type Source = {
  id: string;
  url: string;
  active: boolean;
  countryCode: string | null;
  continent: Continent | null;
};
export type Geography = { countries: Country[]; sources: Source[] };
export type Coverage = {
  total: number;
  analyzed: number;
  withEvidence: number;
  withoutEvidence: number;
  unanalyzed: number;
  unknownCountry: number;
  missingTermEvidence: number;
  average: number | null;
};
export type Timeline = Coverage & { date: string };
export type CountryValue = Country & Coverage;
export type Term = { term: string; language: 'es' | 'en'; weight: number; occurrences: number };
export type Word = {
  term: string;
  language: 'es' | 'en';
  occurrences: number;
  newsCount: number;
  contribution: number;
  influence: number;
};
export type News = {
  id: string;
  title: string | null;
  description: string | null;
  link: string | null;
  date: string;
  dateSource: 'publication' | 'capture';
  sourceId: string;
  sourceUrl: string;
  countryCode: string | null;
  continent: Continent | null;
  score: number | null;
  matchedTerms: number | null;
  language: 'es' | 'en' | null;
  analyzedAt: string | null;
  terms: Term[] | null;
  contribution: number | null;
};
export type Dashboard = {
  filters: {
    continent: Continent | null;
    country: string | null;
    from: string | null;
    to: string | null;
  };
  summary: Coverage;
  timeline: Timeline[];
  countries: CountryValue[];
  words: Word[];
  news: News[];
};
