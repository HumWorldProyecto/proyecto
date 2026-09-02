import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { NEWS_REPOSITORY_PORT, NewsRepositoryPort } from '../ports/news-repository.port';
import { News } from '../types/news';
import { CapturedNewsItem } from '../types/captured-news-item';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(@Inject(NEWS_REPOSITORY_PORT) private readonly repository: NewsRepositoryPort) {}

  async listNews(): Promise<News[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      this.logger.error('Fallo al consultar las noticias almacenadas', error as Error);
      throw new InternalServerErrorException('No se pudo obtener el listado de noticias');
    }
  }

  async saveCapturedItems(items: CapturedNewsItem[]): Promise<void> {
    for (const item of items) {
      try {
        await this.repository.upsertCapturedItem(item);
      } catch (error) {
        this.logger.error(
          `Fallo al almacenar el ítem capturado de la fuente ${item.sourceId}`,
          error as Error,
        );
      }
    }
  }
}
