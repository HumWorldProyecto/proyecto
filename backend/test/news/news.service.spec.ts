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
    await expect(service.listNews()).rejects.not.toThrow(
      'detalle interno sensible de la base de datos',
    );
  });

  it('aplica trim al GUID, conserva capitalización y le da prioridad sobre el enlace', async () => {
    const upsertCapturedItem = jest.fn().mockResolvedValue(undefined);
    const repository: NewsRepositoryPort = { findAll: jest.fn(), upsertCapturedItem };
    const service = new NewsService(repository);

    await service.saveCapturedItems([
      {
        sourceId: 'a',
        guid: '  AbC  ',
        link: '  HTTPS://Example.com/Path?B=2&A=1  ',
        title: 'Noticia',
      },
    ]);

    expect(upsertCapturedItem).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'a',
        dedupeKey: 'guid:AbC',
        guid: 'AbC',
        link: 'HTTPS://Example.com/Path?B=2&A=1',
        title: 'Noticia',
      }),
    );
  });

  it('usa el enlace como fallback sin canonicalizarlo cuando el GUID está ausente', async () => {
    const upsertCapturedItem = jest.fn().mockResolvedValue(undefined);
    const repository: NewsRepositoryPort = { findAll: jest.fn(), upsertCapturedItem };
    const service = new NewsService(repository);

    await service.saveCapturedItems([
      {
        sourceId: 'a',
        guid: '   ',
        link: '  HTTPS://Example.com/Path?B=2&A=1  ',
      },
    ]);

    expect(upsertCapturedItem).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: 'link:HTTPS://Example.com/Path?B=2&A=1',
        guid: undefined,
        link: 'HTTPS://Example.com/Path?B=2&A=1',
      }),
    );
  });

  it('mantiene separadas las identidades guid:abc y link:abc', async () => {
    const upsertCapturedItem = jest.fn().mockResolvedValue(undefined);
    const repository: NewsRepositoryPort = { findAll: jest.fn(), upsertCapturedItem };
    const service = new NewsService(repository);

    await service.saveCapturedItems([
      { sourceId: 'a', guid: 'abc' },
      { sourceId: 'a', guid: null, link: 'abc' },
    ]);

    expect(upsertCapturedItem).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ dedupeKey: 'guid:abc' }),
    );
    expect(upsertCapturedItem).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ dedupeKey: 'link:abc' }),
    );
  });

  it('acepta un GUID válido aunque falten enlace y título', async () => {
    const upsertCapturedItem = jest.fn().mockResolvedValue(undefined);
    const repository: NewsRepositoryPort = { findAll: jest.fn(), upsertCapturedItem };
    const service = new NewsService(repository);

    await service.saveCapturedItems([{ sourceId: 'a', guid: 'guid-solo' }]);

    expect(upsertCapturedItem).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: 'guid:guid-solo',
        guid: 'guid-solo',
        link: undefined,
        title: undefined,
      }),
    );
  });

  it('trata null, undefined, vacío y espacios como ausencia y no llama al repositorio', async () => {
    const items: CapturedNewsItem[] = [
      { sourceId: 'a', guid: null, link: null },
      { sourceId: 'a', guid: undefined, link: undefined },
      { sourceId: 'a', guid: '', link: '' },
      { sourceId: 'a', guid: '   ', link: '\t' },
    ];
    const upsertCapturedItem = jest.fn().mockResolvedValue(undefined);
    const repository: NewsRepositoryPort = { findAll: jest.fn(), upsertCapturedItem };
    const service = new NewsService(repository);

    await expect(service.saveCapturedItems(items)).resolves.toBeUndefined();

    expect(upsertCapturedItem).not.toHaveBeenCalled();
  });

  it('descarta un ítem sin identidad y continúa con el siguiente identificable', async () => {
    const upsertCapturedItem = jest.fn().mockResolvedValue(undefined);
    const repository: NewsRepositoryPort = { findAll: jest.fn(), upsertCapturedItem };
    const service = new NewsService(repository);

    await service.saveCapturedItems([
      { sourceId: 'a', title: 'Sin identidad' },
      { sourceId: 'a', guid: ' siguiente ', title: 'Identificable' },
    ]);

    expect(upsertCapturedItem).toHaveBeenCalledTimes(1);
    expect(upsertCapturedItem).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: 'guid:siguiente', title: 'Identificable' }),
    );
  });

  it('aísla un fallo real de persistencia y continúa con el siguiente ítem', async () => {
    const upsertCapturedItem = jest
      .fn()
      .mockRejectedValueOnce(new Error('fallo de persistencia'))
      .mockResolvedValueOnce(undefined);
    const repository: NewsRepositoryPort = { findAll: jest.fn(), upsertCapturedItem };
    const service = new NewsService(repository);

    await expect(
      service.saveCapturedItems([
        { sourceId: 'a', guid: 'guid-1', title: 'Falla' },
        { sourceId: 'a', guid: 'guid-2', title: 'Correcto' },
      ]),
    ).resolves.toBeUndefined();

    expect(upsertCapturedItem).toHaveBeenCalledTimes(2);
    expect(upsertCapturedItem).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ dedupeKey: 'guid:guid-2', title: 'Correcto' }),
    );
  });
});
