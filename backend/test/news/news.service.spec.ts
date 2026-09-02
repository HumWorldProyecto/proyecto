import { InternalServerErrorException } from '@nestjs/common';
import { NewsService } from '../../src/news/services/news.service';
import { NewsRepositoryPort } from '../../src/news/ports/news-repository.port';
import { News } from '../../src/news/types/news';
import { CapturedNewsItem } from '../../src/news/types/captured-news-item';

describe('NewsService', () => {
  it('devuelve una lista vacía cuando no hay noticias almacenadas', async () => {
    const repository: NewsRepositoryPort = {
      findAll: jest.fn().mockResolvedValue([]),
      upsertCapturedItem: jest.fn(),
    };
    const service = new NewsService(repository);

    await expect(service.listNews()).resolves.toEqual([]);
  });

  it('devuelve las noticias almacenadas cuando existen', async () => {
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
    const repository: NewsRepositoryPort = {
      findAll: jest.fn().mockResolvedValue(news),
      upsertCapturedItem: jest.fn(),
    };
    const service = new NewsService(repository);

    await expect(service.listNews()).resolves.toEqual(news);
  });

  it('traduce un fallo de consulta a un error controlado sin exponer detalles internos', async () => {
    const repository: NewsRepositoryPort = {
      findAll: jest.fn().mockRejectedValue(new Error('detalle interno sensible de la base de datos')),
      upsertCapturedItem: jest.fn(),
    };
    const service = new NewsService(repository);

    await expect(service.listNews()).rejects.toThrow(InternalServerErrorException);
    await expect(service.listNews()).rejects.not.toThrow('detalle interno sensible de la base de datos');
  });

  it('persiste cada ítem capturado de forma aislada, sin duplicar la deduplicación en el servicio', async () => {
    const items: CapturedNewsItem[] = [
      { sourceId: 'a', guid: 'guid-1', title: 'Uno' },
      { sourceId: 'a', guid: 'guid-2', title: 'Dos' },
    ];
    const upsertCapturedItem = jest.fn().mockResolvedValue(undefined);
    const repository: NewsRepositoryPort = { findAll: jest.fn(), upsertCapturedItem };
    const service = new NewsService(repository);

    await service.saveCapturedItems(items);

    expect(upsertCapturedItem).toHaveBeenCalledTimes(2);
    expect(upsertCapturedItem).toHaveBeenNthCalledWith(1, items[0]);
    expect(upsertCapturedItem).toHaveBeenNthCalledWith(2, items[1]);
  });

  it('aísla el fallo al guardar un ítem sin interrumpir el procesamiento de los demás', async () => {
    const items: CapturedNewsItem[] = [
      { sourceId: 'a', guid: 'guid-1', title: 'Falla' },
      { sourceId: 'a', guid: 'guid-2', title: 'Correcto' },
    ];
    const upsertCapturedItem = jest
      .fn()
      .mockRejectedValueOnce(new Error('fallo de persistencia'))
      .mockResolvedValueOnce(undefined);
    const repository: NewsRepositoryPort = { findAll: jest.fn(), upsertCapturedItem };
    const service = new NewsService(repository);

    await expect(service.saveCapturedItems(items)).resolves.toBeUndefined();

    expect(upsertCapturedItem).toHaveBeenCalledTimes(2);
    expect(upsertCapturedItem).toHaveBeenNthCalledWith(2, items[1]);
  });
});
