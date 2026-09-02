import { News } from '../types/news';
import { CapturedNewsItem } from '../types/captured-news-item';

/**
 * Abstracción de persistencia de noticias. Los servicios dependen de este
 * contrato, no del cliente de datos concreto.
 */
export interface NewsRepositoryPort {
  findAll(): Promise<News[]>;
  upsertCapturedItem(item: CapturedNewsItem): Promise<void>;
}

export const NEWS_REPOSITORY_PORT = Symbol('NEWS_REPOSITORY_PORT');
