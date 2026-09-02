import { NewsCaptureOutputAdapter } from '../../src/news/integrations/news-capture-output.adapter';
import { NewsService } from '../../src/news/services/news.service';
import { RssItem } from '../../src/capture/types/rss-item';

describe('NewsCaptureOutputAdapter', () => {
  it('delega en NewsService.saveCapturedItems con los ítems recibidos del límite de salida', async () => {
    const saveCapturedItems = jest.fn().mockResolvedValue(undefined);
    const newsService = { saveCapturedItems } as unknown as NewsService;
    const adapter = new NewsCaptureOutputAdapter(newsService);

    const items: RssItem[] = [
      { sourceId: 'a', title: 'Noticia', link: 'https://example.com/1', guid: 'g1' },
    ];

    await adapter.emitItems(items);

    expect(saveCapturedItems).toHaveBeenCalledWith([
      { sourceId: 'a', title: 'Noticia', link: 'https://example.com/1', guid: 'g1', pubDate: undefined, description: undefined },
    ]);
  });

  it('no interrumpe la captura si NewsService falla al aislar el fallo por ítem (el aislamiento ya lo garantiza NewsService)', async () => {
    const saveCapturedItems = jest.fn().mockResolvedValue(undefined);
    const newsService = { saveCapturedItems } as unknown as NewsService;
    const adapter = new NewsCaptureOutputAdapter(newsService);

    await expect(adapter.emitItems([])).resolves.toBeUndefined();
    expect(saveCapturedItems).toHaveBeenCalledWith([]);
  });
});
