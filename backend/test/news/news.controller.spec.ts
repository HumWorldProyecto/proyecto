import { InternalServerErrorException } from '@nestjs/common';
import { NewsController } from '../../src/news/controllers/news.controller';
import { NewsService } from '../../src/news/services/news.service';
import { News } from '../../src/news/types/news';

describe('NewsController', () => {
  it('responde con la lista vacía cuando no hay noticias almacenadas', async () => {
    const newsService = { listNews: jest.fn().mockResolvedValue([]) } as unknown as NewsService;
    const controller = new NewsController(newsService);

    await expect(controller.list()).resolves.toEqual([]);
  });

  it('responde con las noticias almacenadas mapeadas a DTO', async () => {
    const news: News[] = [
      {
        id: '1',
        sourceId: 'a',
        title: 'Título',
        link: 'https://example.com/1',
        guid: 'guid-1',
        description: 'desc',
        pubDate: new Date('2024-01-01T00:00:00.000Z'),
        capturedAt: new Date('2024-01-02T00:00:00.000Z'),
      },
    ];
    const newsService = { listNews: jest.fn().mockResolvedValue(news) } as unknown as NewsService;
    const controller = new NewsController(newsService);

    const result = await controller.list();

    expect(result).toEqual([
      {
        id: '1',
        source: 'a',
        title: 'Título',
        link: 'https://example.com/1',
        guid: 'guid-1',
        description: 'desc',
        pubDate: news[0].pubDate,
        capturedAt: news[0].capturedAt,
      },
    ]);
  });

  it('propaga el error controlado cuando el servicio falla, sin exponer detalles internos', async () => {
    const newsService = {
      listNews: jest.fn().mockRejectedValue(new InternalServerErrorException('No se pudo obtener el listado de noticias')),
    } as unknown as NewsService;
    const controller = new NewsController(newsService);

    await expect(controller.list()).rejects.toThrow(InternalServerErrorException);
    await expect(controller.list()).rejects.not.toThrow(/prisma|sql|stack/i);
  });
});
