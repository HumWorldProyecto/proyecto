import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaNewsRepository } from '../../src/news/repositories/prisma-news.repository';
import { CapturedNewsItem } from '../../src/news/types/captured-news-item';

describe('PrismaNewsRepository (integración, PostgreSQL real)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaNewsRepository(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.news.deleteMany();
  });

  it('persiste un ítem capturado con sus metadatos RSS', async () => {
    const item: CapturedNewsItem = {
      sourceId: 'source-a',
      title: 'Noticia de prueba',
      link: 'https://example.com/noticia',
      guid: 'guid-1',
      pubDate: '2024-01-01T00:00:00.000Z',
      description: 'Descripción de prueba',
    };

    await repository.upsertCapturedItem(item);
    const all = await repository.findAll();

    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      sourceId: 'source-a',
      title: 'Noticia de prueba',
      link: 'https://example.com/noticia',
      guid: 'guid-1',
      description: 'Descripción de prueba',
    });
  });

  it('conserva los metadatos disponibles cuando faltan metadatos opcionales', async () => {
    const item: CapturedNewsItem = { sourceId: 'source-a', guid: 'guid-solo' };

    await repository.upsertCapturedItem(item);
    const all = await repository.findAll();

    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      sourceId: 'source-a',
      guid: 'guid-solo',
      title: null,
      link: null,
      description: null,
      pubDate: null,
    });
  });

  it('no duplica una noticia ya almacenada de la misma fuente (mismo GUID)', async () => {
    const item: CapturedNewsItem = {
      sourceId: 'source-a',
      guid: 'guid-repetido',
      title: 'Primera versión',
    };

    await repository.upsertCapturedItem(item);
    await repository.upsertCapturedItem({ ...item, title: 'Segunda versión' });

    const all = await repository.findAll();
    expect(all).toHaveLength(1);
  });

  it('no duplica una noticia ya almacenada de la misma fuente identificada solo por enlace (sin GUID)', async () => {
    const item: CapturedNewsItem = { sourceId: 'source-a', link: 'https://example.com/mismo-enlace' };

    await repository.upsertCapturedItem(item);
    await repository.upsertCapturedItem(item);

    const all = await repository.findAll();
    expect(all).toHaveLength(1);
  });

  it('trata como noticias distintas dos ítems de fuentes distintas con el mismo GUID', async () => {
    await repository.upsertCapturedItem({ sourceId: 'source-a', guid: 'guid-compartido' });
    await repository.upsertCapturedItem({ sourceId: 'source-b', guid: 'guid-compartido' });

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
  });

  it('almacena como noticias independientes los ítems sin GUID ni enlace (no identificables de forma fiable)', async () => {
    await repository.upsertCapturedItem({ sourceId: 'source-a', title: 'Sin identificador 1' });
    await repository.upsertCapturedItem({ sourceId: 'source-a', title: 'Sin identificador 2' });

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
  });

  it('devuelve una lista vacía cuando no hay noticias almacenadas', async () => {
    await expect(repository.findAll()).resolves.toEqual([]);
  });
});
