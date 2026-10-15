import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { NEWS_REPOSITORY_PORT, NewsRepositoryPort } from '../ports/news-repository.port';
import { News } from '../types/news';
import { CapturedNewsItem } from '../types/captured-news-item';
import { resolveCapturedNewsItem } from '../domain/resolve-captured-news-item';
import {
  MEDIA_TOPIC_CLASSIFIER_PORT,
  MediaTopicClassifierPort,
} from '../../classification/ports/media-topic-classifier.port';
import { MediaTopicQCode } from '../../classification/types/media-topic';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    @Inject(NEWS_REPOSITORY_PORT) private readonly repository: NewsRepositoryPort,
    @Inject(MEDIA_TOPIC_CLASSIFIER_PORT)
    private readonly classifier: MediaTopicClassifierPort = { classify: () => [] },
  ) {}

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
      const identifiedItem = resolveCapturedNewsItem(item);
      if (!identifiedItem) {
        continue;
      }

      let mediaTopicQcodes: readonly MediaTopicQCode[] = [];
      try {
        mediaTopicQcodes = this.classifier.classify({
          title: identifiedItem.title,
          description: identifiedItem.description,
        });
      } catch (error) {
        this.logger.error(
          `Fallo al clasificar el ítem capturado de la fuente ${item.sourceId}`,
          error as Error,
        );
      }

      try {
        await this.repository.upsertCapturedItem({ ...identifiedItem, mediaTopicQcodes });
      } catch (error) {
        this.logger.error(
          `Fallo al almacenar el ítem capturado de la fuente ${item.sourceId}`,
          error as Error,
        );
      }
    }
  }
}
