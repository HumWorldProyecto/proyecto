import { AnalyticsRecord, HumorFilter, SourceGeography, Country } from '../types/analytics';

export interface AnalyticsRepositoryPort {
  readNews(filter: HumorFilter): Promise<readonly AnalyticsRecord[]>;
  listSources(): Promise<readonly SourceGeography[]>;
  assignCountry(id: string, country: Country | null): Promise<SourceGeography>;
}
export const ANALYTICS_REPOSITORY_PORT = Symbol('ANALYTICS_REPOSITORY_PORT');
