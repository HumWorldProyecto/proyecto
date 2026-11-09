import { RssSource } from '../types/rss-source';

export type SourceMetadata = Readonly<{
  countryCode?: string | null;
  continent?: import('@prisma/client').Continent | null;
  channelId?: string | null;
  language?: 'es' | 'en' | null;
  mediaTopicQcode?: string | null;
}>;

export type SourceChanges = Readonly<{
  url?: string;
  active?: boolean;
}> & SourceMetadata;

export interface SourceRepositoryPort {
  create(url: string, metadata?: SourceMetadata): Promise<RssSource>;
  findById(id: string): Promise<RssSource | null>;
  findByUrl(url: string): Promise<RssSource | null>;
  list(active?: boolean): Promise<RssSource[]>;
  replace(id: string, url: string): Promise<RssSource>;
  update(id: string, changes: SourceChanges): Promise<RssSource>;
  deleteWithNews?(id: string): Promise<void>;
  setActive(id: string, active: boolean): Promise<RssSource>;
}

export const SOURCE_REPOSITORY_PORT = Symbol('SOURCE_REPOSITORY_PORT');
