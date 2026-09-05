import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaNewsRepository } from '../../src/news/repositories/prisma-news.repository';
import { IdentifiedCapturedNewsItem } from '../../src/news/types/identified-captured-news-item';

const SOURCE_A_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_B_ID = '22222222-2222-4222-8222-222222222222';

describe('PrismaNewsRepository (integración, PostgreSQL real)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaNewsRepository(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await prisma.rssSource.createMany({
      data: [
        { id: SOURCE_A_ID, url: 'https://source-a.example/rss' },
        { id: SOURCE_B_ID, url: 'https://source-b.example/rss' },
      ],
    });
  });

  it('persiste un ítem identificado con sus metadatos RSS', async () => {
    const item: IdentifiedCapturedNewsItem = {
      sourceId: SOURCE_A_ID,
      dedupeKey: 'guid:guid-1',
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
      sourceId: SOURCE_A_ID,
      title: 'Noticia de prueba',
      link: 'https://example.com/noticia',
      guid: 'guid-1',
      description: 'Descripción de prueba',
    });
    await expect(
      prisma.news.findUnique({
        where: {
          sourceId_dedupeKey: { sourceId: SOURCE_A_ID, dedupeKey: 'guid:guid-1' },
        },
      }),
    ).resolves.toMatchObject({ dedupeKey: 'guid:guid-1' });
  });

  it('conserva los metadatos disponibles aunque falten enlace y título', async () => {
    const item: IdentifiedCapturedNewsItem = {
      sourceId: SOURCE_A_ID,
      dedupeKey: 'guid:guid-solo',
      guid: 'guid-solo',
    };

    await repository.upsertCapturedItem(item);
    const all = await repository.findAll();

    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      sourceId: SOURCE_A_ID,
      guid: 'guid-solo',
      title: null,
      link: null,
      description: null,
      pubDate: null,
    });
  });

  it('hace cumplir dedupeKey NOT NULL en PostgreSQL', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "news" ("id", "sourceId", "capturedAt")
        VALUES ('news-without-dedupe', ${SOURCE_A_ID}, CURRENT_TIMESTAMP)
      `,
    ).rejects.toThrow();

    await expect(prisma.news.count()).resolves.toBe(0);
  });

  it('no duplica la misma clave GUID dentro de una fuente', async () => {
    const item: IdentifiedCapturedNewsItem = {
      sourceId: SOURCE_A_ID,
      dedupeKey: 'guid:repetido',
      guid: 'repetido',
      title: 'Primera versión',
    };

    await repository.upsertCapturedItem(item);
    await repository.upsertCapturedItem({ ...item, title: 'Segunda versión' });

    await expect(prisma.news.count()).resolves.toBe(1);
  });

  it('no duplica la misma clave de enlace dentro de una fuente', async () => {
    const item: IdentifiedCapturedNewsItem = {
      sourceId: SOURCE_A_ID,
      dedupeKey: 'link:https://example.com/mismo-enlace',
      link: 'https://example.com/mismo-enlace',
    };

    await repository.upsertCapturedItem(item);
    await repository.upsertCapturedItem(item);

    await expect(prisma.news.count()).resolves.toBe(1);
  });

  it('trata guid:abc y link:abc como identidades distintas', async () => {
    await repository.upsertCapturedItem({
      sourceId: SOURCE_A_ID,
      dedupeKey: 'guid:abc',
      guid: 'abc',
    });
    await repository.upsertCapturedItem({
      sourceId: SOURCE_A_ID,
      dedupeKey: 'link:abc',
      link: 'abc',
    });

    await expect(prisma.news.count()).resolves.toBe(2);
  });

  it('mantiene independiente la misma identidad en fuentes distintas', async () => {
    await repository.upsertCapturedItem({
      sourceId: SOURCE_A_ID,
      dedupeKey: 'guid:compartido',
      guid: 'compartido',
    });
    await repository.upsertCapturedItem({
      sourceId: SOURCE_B_ID,
      dedupeKey: 'guid:compartido',
      guid: 'compartido',
    });

    await expect(prisma.news.count()).resolves.toBe(2);
  });

  it('rechaza mediante FK un sourceId inexistente', async () => {
    await expect(
      repository.upsertCapturedItem({
        sourceId: '33333333-3333-4333-8333-333333333333',
        dedupeKey: 'guid:sin-fuente',
        guid: 'sin-fuente',
      }),
    ).rejects.toThrow();

    await expect(prisma.news.count()).resolves.toBe(0);
  });

  it('permite persistir cuando la fuente existe', async () => {
    await expect(
      repository.upsertCapturedItem({
        sourceId: SOURCE_A_ID,
        dedupeKey: 'guid:con-fuente',
        guid: 'con-fuente',
      }),
    ).resolves.toBeUndefined();

    await expect(prisma.news.count()).resolves.toBe(1);
  });

  it.each([undefined, null, 'otra:identidad', 'guid:   ', 'link:\t'])(
    'rechaza defensivamente la dedupeKey inválida %p sin escribir',
    async (dedupeKey) => {
      const invalidItem = {
        sourceId: SOURCE_A_ID,
        dedupeKey,
      } as unknown as IdentifiedCapturedNewsItem;

      await expect(repository.upsertCapturedItem(invalidItem)).resolves.toBeUndefined();
      await expect(prisma.news.count()).resolves.toBe(0);
    },
  );

  it('impide borrar físicamente una fuente que conserva noticias asociadas', async () => {
    await repository.upsertCapturedItem({
      sourceId: SOURCE_A_ID,
      dedupeKey: 'guid:protegida',
      guid: 'protegida',
    });

    await expect(prisma.rssSource.delete({ where: { id: SOURCE_A_ID } })).rejects.toThrow();
    await expect(prisma.news.count()).resolves.toBe(1);
  });

  it('devuelve una lista vacía cuando no hay noticias almacenadas', async () => {
    await expect(repository.findAll()).resolves.toEqual([]);
  });
});
