import { RssSource } from '../types/rss-source';

export type SourceChanges = Readonly<{
  url?: string;
  active?: boolean;
}>;

export interface SourceRepositoryPort {
  create(url: string): Promise<RssSource>;
  findById(id: string): Promise<RssSource | null>;
  findByUrl(url: string): Promise<RssSource | null>;
  list(active?: boolean): Promise<RssSource[]>;
  replace(id: string, url: string): Promise<RssSource>;
  update(id: string, changes: SourceChanges): Promise<RssSource>;
  setActive(id: string, active: boolean): Promise<RssSource>;
}

export const SOURCE_REPOSITORY_PORT = Symbol('SOURCE_REPOSITORY_PORT');
