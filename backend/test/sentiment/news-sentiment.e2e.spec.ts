import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import publishedOpenApi from '../../../docs/openapi.json';
import { AppModule } from '../../src/app.module';
import { PrismaNewsRepository } from '../../src/news/repositories/prisma-news.repository';
import { PrismaService } from '../../src/prisma/prisma.service';

const SOURCE_ID = '66666666-6666-4666-8666-666666666666';
const MISSING_NEWS_ID = '77777777-7777-4777-8777-777777777777';

describe('POST /api/v1/news/:id/sentiment (e2e, PostgreSQL real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let openApi: OpenAPIObject;
  let sequence = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    openApi = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('HumWorld API')
        .setDescription('API REST de HumWorld')
        .setVersion('1.0')
        .build(),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await clearDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase();
    await prisma.rssSource.create({
      data: { id: SOURCE_ID, url: 'https://hu06.example/rss' },
    });
  });

  it('expone null para una noticia nunca analizada', async () => {
    await createNews('Sin análisis', 'Texto original');

    const response = await request(app.getHttpServer()).get('/api/v1/news');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].sentiment).toBeNull();
  });

  it.each([
    { label: 'positivo', term: 'excelente', weight: 5, text: 'Resultado excelente', score: 1 },
    { label: 'negativo', term: 'terrible', weight: -5, text: 'Resultado terrible', score: -1 },
    { label: 'neutral con evidencia', term: 'estable', weight: 0, text: 'Resultado estable', score: 0 },
  ])('persiste y recupera un resultado $label como números JSON', async (example) => {
    await prisma.dictionaryEntry.create({
      data: { term: example.term, language: 'es', weight: example.weight },
    });
    const news = await createNews(example.text, null);

    const post = await request(app.getHttpServer())
      .post(`/api/v1/news/${news.id}/sentiment`)
      .send({ language: 'es' });

    expect(post.status).toBe(200);
    expect(post.body).toMatchObject({
      newsId: news.id,
      sentiment: {
        score: example.score,
        matchedTerms: 1,
        language: 'es',
      },
    });
    expect(post.body.sentiment.analyzedAt).toEqual(expect.any(String));
    expect(typeof post.body.sentiment.score).toBe('number');

    const get = await request(app.getHttpServer()).get('/api/v1/news');
    expect(get.status).toBe(200);
    expect(get.body[0].sentiment).toEqual(post.body.sentiment);
  });

  it('persiste cero sin evidencia y lo distingue de null', async () => {
    const news = await createNews('Sin términos conocidos', null);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/news/${news.id}/sentiment`)
      .send({ language: 'en' });

    expect(response.status).toBe(200);
    expect(response.body.sentiment).toMatchObject({
      score: 0,
      matchedTerms: 0,
      language: 'en',
    });
    expect(response.body.sentiment.analyzedAt).toEqual(expect.any(String));
  });

  it('reanálisis explícito reemplaza score, coincidencias, idioma y fecha completos', async () => {
    await prisma.dictionaryEntry.createMany({
      data: [
        { term: 'balance', language: 'es', weight: 5 },
        { term: 'balance', language: 'en', weight: -5 },
      ],
    });
    const news = await createNews('balance', null);
    const first = await request(app.getHttpServer())
      .post(`/api/v1/news/${news.id}/sentiment`)
      .send({ language: 'es' });
    await prisma.dictionaryEntry.updateMany({
      where: { term: 'balance', language: 'es' },
      data: { weight: 0 },
    });

    const unchanged = await request(app.getHttpServer()).get('/api/v1/news');
    expect(unchanged.body[0].sentiment).toEqual(first.body.sentiment);

    const second = await request(app.getHttpServer())
      .post(`/api/v1/news/${news.id}/sentiment`)
      .send({ language: 'en' });
    expect(second.status).toBe(200);
    expect(second.body.sentiment).toMatchObject({ score: -1, matchedTerms: 1, language: 'en' });
    expect(second.body.sentiment).not.toEqual(first.body.sentiment);

    const stored = await request(app.getHttpServer()).get('/api/v1/news');
    expect(stored.body[0].sentiment).toEqual(second.body.sentiment);
  });

  it('rechaza UUID e idioma inválidos y devuelve 404 sin crear noticias', async () => {
    const invalidUuid = await request(app.getHttpServer())
      .post('/api/v1/news/no-es-uuid/sentiment')
      .send({ language: 'es' });
    expect(invalidUuid.status).toBe(400);

    const invalidLanguage = await request(app.getHttpServer())
      .post(`/api/v1/news/${MISSING_NEWS_ID}/sentiment`)
      .send({ language: 'fr' });
    expect(invalidLanguage.status).toBe(400);

    const missingLanguage = await request(app.getHttpServer())
      .post(`/api/v1/news/${MISSING_NEWS_ID}/sentiment`)
      .send({});
    expect(missingLanguage.status).toBe(400);

    const missing = await request(app.getHttpServer())
      .post(`/api/v1/news/${MISSING_NEWS_ID}/sentiment`)
      .send({ language: 'es' });
    expect(missing.status).toBe(404);
    await expect(prisma.news.count()).resolves.toBe(0);
  });

  it('un fallo real del diccionario devuelve 503 y preserva el análisis anterior', async () => {
    await prisma.dictionaryEntry.create({
      data: { term: 'seguro', language: 'es', weight: 5 },
    });
    const news = await createNews('seguro', null);
    const previous = await request(app.getHttpServer())
      .post(`/api/v1/news/${news.id}/sentiment`)
      .send({ language: 'es' });

    await prisma.$executeRawUnsafe(
      'ALTER TABLE "dictionary_entries" RENAME TO "dictionary_entries_unavailable_hu06"',
    );
    try {
      const failed = await request(app.getHttpServer())
        .post(`/api/v1/news/${news.id}/sentiment`)
        .send({ language: 'es' });
      expect(failed.status).toBe(503);
      expect(JSON.stringify(failed.body)).not.toMatch(/sql|postgresql|password|dictionary_entries/i);
    } finally {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "dictionary_entries_unavailable_hu06" RENAME TO "dictionary_entries"',
      );
    }

    const stored = await request(app.getHttpServer()).get('/api/v1/news');
    expect(stored.body[0].sentiment).toEqual(previous.body.sentiment);
  });

  it('un fallo real de escritura devuelve 500 y no reemplaza el resultado anterior', async () => {
    const entry = await prisma.dictionaryEntry.create({
      data: { term: 'persistir', language: 'es', weight: 5 },
    });
    const news = await createNews('persistir', null);
    const previous = await request(app.getHttpServer())
      .post(`/api/v1/news/${news.id}/sentiment`)
      .send({ language: 'es' });
    await prisma.dictionaryEntry.update({ where: { id: entry.id }, data: { weight: -5 } });

    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION hu06_reject_sentiment_write() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'simulated private database failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER hu06_reject_sentiment_write
      BEFORE UPDATE OF "sentimentScore" ON "news"
      FOR EACH ROW EXECUTE FUNCTION hu06_reject_sentiment_write()
    `);
    try {
      const failed = await request(app.getHttpServer())
        .post(`/api/v1/news/${news.id}/sentiment`)
        .send({ language: 'es' });
      expect(failed.status).toBe(500);
      expect(JSON.stringify(failed.body)).not.toMatch(/sql|postgresql|password|private/i);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER hu06_reject_sentiment_write ON "news"');
      await prisma.$executeRawUnsafe('DROP FUNCTION hu06_reject_sentiment_write()');
    }

    const stored = await request(app.getHttpServer()).get('/api/v1/news');
    expect(stored.body[0].sentiment).toEqual(previous.body.sentiment);
  });

  it('PostgreSQL rechaza tuples parciales, rangos inválidos y score no cero sin evidencia', async () => {
    const news = await createNews('constraints', null);
    await expect(
      prisma.$executeRaw`
        UPDATE "news" SET "sentimentScore" = 0.5 WHERE "id" = ${news.id}
      `,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`
        UPDATE "news" SET
          "sentimentScore" = 2,
          "sentimentMatchedTerms" = 1,
          "sentimentLanguage" = 'es'::"DictionaryLanguage",
          "sentimentAnalyzedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${news.id}
      `,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`
        UPDATE "news" SET
          "sentimentScore" = 0,
          "sentimentMatchedTerms" = -1,
          "sentimentLanguage" = 'es'::"DictionaryLanguage",
          "sentimentAnalyzedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${news.id}
      `,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`
        UPDATE "news" SET
          "sentimentScore" = 0.1,
          "sentimentMatchedTerms" = 0,
          "sentimentLanguage" = 'es'::"DictionaryLanguage",
          "sentimentAnalyzedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${news.id}
      `,
    ).rejects.toThrow();

    await expect(prisma.news.findUniqueOrThrow({ where: { id: news.id } })).resolves.toMatchObject({
      sentimentScore: null,
      sentimentMatchedTerms: null,
      sentimentLanguage: null,
      sentimentAnalyzedAt: null,
    });
  });

  it('recapturar un duplicado preserva sentimiento, identidad, textos y fechas', async () => {
    await prisma.dictionaryEntry.create({
      data: { term: 'conservado', language: 'es', weight: 5 },
    });
    const news = await createNews('conservado', 'Descripción original', 'duplicate-guid');
    await request(app.getHttpServer())
      .post(`/api/v1/news/${news.id}/sentiment`)
      .send({ language: 'es' });
    const before = await prisma.news.findUniqueOrThrow({ where: { id: news.id } });

    const repository = new PrismaNewsRepository(prisma);
    await repository.upsertCapturedItem({
      sourceId: SOURCE_ID,
      dedupeKey: 'guid:duplicate-guid',
      guid: 'duplicate-guid',
      title: 'Título reemplazado',
      description: 'Descripción reemplazada',
    });

    await expect(prisma.news.findUniqueOrThrow({ where: { id: news.id } })).resolves.toEqual(before);
  });

  it('preserva una columna mediaTopicQcodes presente al persistir sentimiento', async () => {
    const column = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'news'
          AND column_name = 'mediaTopicQcodes'
      ) AS "exists"
    `;
    const addedForTest = !column[0].exists;
    if (addedForTest) {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "news" ADD COLUMN "mediaTopicQcodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',
      );
    }
    try {
      await prisma.dictionaryEntry.create({
        data: { term: 'tecnología', language: 'es', weight: 4 },
      });
      const news = await createNews('tecnología', null);
      await prisma.$executeRaw`
        UPDATE "news"
        SET "mediaTopicQcodes" = ARRAY['medtop:13000000']::TEXT[]
        WHERE "id" = ${news.id}
      `;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/news/${news.id}/sentiment`)
        .send({ language: 'es' });
      expect(response.status).toBe(200);

      const rows = await prisma.$queryRaw<Array<{ mediaTopicQcodes: string[] }>>`
        SELECT "mediaTopicQcodes" FROM "news" WHERE "id" = ${news.id}
      `;
      expect(rows[0].mediaTopicQcodes).toEqual(['medtop:13000000']);
    } finally {
      if (addedForTest) {
        await prisma.$executeRawUnsafe('ALTER TABLE "news" DROP COLUMN "mediaTopicQcodes"');
      }
    }
  });

  it('dos reanálisis concurrentes dejan uno de los resultados completos confirmados', async () => {
    await prisma.dictionaryEntry.createMany({
      data: [
        { term: 'shared', language: 'es', weight: 5 },
        { term: 'shared', language: 'en', weight: -5 },
      ],
    });
    const news = await createNews('shared', null);

    const [spanish, english] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/news/${news.id}/sentiment`)
        .send({ language: 'es' }),
      request(app.getHttpServer())
        .post(`/api/v1/news/${news.id}/sentiment`)
        .send({ language: 'en' }),
    ]);
    expect(spanish.status).toBe(200);
    expect(english.status).toBe(200);

    const stored = await request(app.getHttpServer()).get('/api/v1/news');
    expect([spanish.body.sentiment, english.body.sentiment]).toContainEqual(
      stored.body[0].sentiment,
    );
  });

  it('publica en OpenAPI el POST, sus códigos y sentiment nullable en GET', () => {
    const post = openApi.paths['/api/v1/news/{id}/sentiment']?.post;
    expect(post).toBeDefined();
    expect(Object.keys(post?.responses ?? {}).sort()).toEqual(['200', '400', '404', '500', '503']);
    expect(post?.requestBody).toBeDefined();

    const newsSchema = openApi.components?.schemas?.NewsResponseDto as {
      properties?: Record<string, unknown>;
    };
    expect(newsSchema.properties?.sentiment).toMatchObject({ nullable: true });

    const published = publishedOpenApi as OpenAPIObject;
    expect(published.paths['/api/v1/news/{id}/sentiment']?.post).toBeDefined();
    const publishedNewsSchema = published.components?.schemas?.NewsResponseDto as {
      properties?: Record<string, unknown>;
    };
    expect(publishedNewsSchema.properties?.sentiment).toMatchObject({ nullable: true });
  });

  async function createNews(
    title: string | null,
    description: string | null,
    guid?: string,
  ): Promise<{ id: string }> {
    sequence += 1;
    const stableGuid = guid ?? `hu06-${sequence}`;
    return prisma.news.create({
      data: {
        sourceId: SOURCE_ID,
        title,
        description,
        guid: stableGuid,
        link: `https://hu06.example/${stableGuid}`,
        dedupeKey: `guid:${stableGuid}`,
        pubDate: new Date('2026-10-11T12:00:00.000Z'),
      },
      select: { id: true },
    });
  }

  async function clearDatabase(): Promise<void> {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await prisma.dictionaryEntry.deleteMany();
  }
});
