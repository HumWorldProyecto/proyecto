import { Injectable } from '@nestjs/common';
import { CaptureOutputPort } from '../../capture/ports/capture-output.port';
import { RssItem } from '../../capture/types/rss-item';
import { NewsService } from '../services/news.service';

/**
 * Implementa el límite abstracto de salida de HU-01 (CaptureOutputPort)
 * delegando la persistencia en NewsService. No modifica el contrato del
 * puerto ni la lógica de CaptureOrchestratorService.
 */
@Injectable()
export class NewsCaptureOutputAdapter implements CaptureOutputPort {
  constructor(private readonly newsService: NewsService) {}

  async emitItems(items: RssItem[]): Promise<void> {
    await this.newsService.saveCapturedItems(
      items.map((item) => ({
        sourceId: item.sourceId,
        title: item.title,
        link: item.link,
        guid: item.guid,
        pubDate: item.pubDate,
        description: item.description,
      })),
    );
  }
}
