import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from '../helpers/authorized-request';
import { Prisma } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  AnalyticsRepositoryPort,
  ANALYTICS_REPOSITORY_PORT,
} from '../../src/analytics/ports/analytics-repository.port';
import {
  PrismaAnalyticsRepository,
  readTermEvidence,
} from '../../src/analytics/repositories/prisma-analytics.repository';
import { AnalyticsUnavailableError } from '../../src/analytics/types/analytics';

describe('Sprint 4 API + PostgreSQL 16', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: AnalyticsRepositoryPort;
  const sid = '10000000-0000-4000-8000-000000000001';
  const unknown = '10000000-0000-4000-8000-000000000002';
  const missing = '10000000-0000-4000-8000-000000000099';
  const api = '/api/v1/dashboards';
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = module.get(PrismaService);
    repository = module.get(ANALYTICS_REPOSITORY_PORT);
  });
  const clear = async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await prisma.dictionaryEntry.deleteMany();
    await prisma.captureConfig.deleteMany();
  };
  beforeEach(async () => {
    await clear();
    await prisma.rssSource.createMany({
      data: [
        { id: sid, url: 'https://s4.example/cl', continent: 'EUROPE' },
        { id: unknown, url: 'https://s4.example/unknown' },
      ],
    });
  });
  afterAll(async () => {
    await clear();
    await app.close();
  });

  async function news(key: string, data: Partial<Prisma.NewsUncheckedCreateInput> = {}) {
    return prisma.news.create({
      data: {
        sourceId: sid,
        dedupeKey: key,
        title: key,
        pubDate: new Date('2026-10-19T23:59:59.999Z'),
        capturedAt: new Date('2026-10-20T10:00:00Z'),
        mediaTopicQcodes: ['medtop:13000000'],
        ...data,
      },
    });
  }
  it('asigna país explícito, deriva continente, preserva HU-14/17 y mantiene contratos previos', async () => {
    const item = await news('preserved');
    const assigned = await request(app.getHttpServer())
      .put(`${api}/sources/${sid}/geography`)
      .send({ countryCode: 'CL' });
    expect(assigned.status).toBe(200);
    expect(assigned.body).toMatchObject({ id: sid, countryCode: 'CL', continent: 'SOUTH_AMERICA' });
    expect(
      (await prisma.news.findUniqueOrThrow({ where: { id: item.id } })).mediaTopicQcodes,
    ).toEqual(['medtop:13000000']);
    const old = await request(app.getHttpServer()).get(`/api/v1/sources/${sid}`);
    expect(old.body).not.toHaveProperty('countryCode');
    const removed = await request(app.getHttpServer())
      .put(`${api}/sources/${sid}/geography`)
      .send({ countryCode: null });
    expect(removed.body).toMatchObject({ countryCode: null, continent: 'SOUTH_AMERICA' });
    const geography = await request(app.getHttpServer()).get(`${api}/geography`);
    expect(geography.status).toBe(200);
    expect(geography.body.countries.length).toBe(247);
    expect(geography.body.sources).toHaveLength(2);
  });

  it('media, filtros inclusivos, captura fallback y evidencia estable ante cambio de diccionario', async () => {
    await request(app.getHttpServer())
      .put(`${api}/sources/${sid}/geography`)
      .send({ countryCode: 'CL' });
    await prisma.dictionaryEntry.create({ data: { term: 'bueno', language: 'es', weight: 5 } });
    const first = await news('bueno bueno');
    await request(app.getHttpServer())
      .post(`/api/v1/news/${first.id}/sentiment`)
      .send({ language: 'es' })
      .expect(200);
    await prisma.dictionaryEntry.updateMany({ data: { weight: -5 } });
    await news('legacy', {
      sentimentScore: -0.5,
      sentimentMatchedTerms: 1,
      sentimentLanguage: 'en',
      sentimentAnalyzedAt: new Date(),
    });
    await news('no match', {
      pubDate: null,
      sentimentScore: 0,
      sentimentMatchedTerms: 0,
      sentimentLanguage: 'es',
      sentimentAnalyzedAt: new Date(),
      sentimentTerms: [],
    });
    await news('raw', { sourceId: unknown });
    await news('outside', { pubDate: new Date('2026-10-21T00:00:00Z') });
    const all = await request(app.getHttpServer())
      .get(`${api}/humor?from=2026-10-19&to=2026-10-20`)
      .expect(200);
    expect(all.body.summary).toEqual({
      total: 4,
      analyzed: 3,
      withEvidence: 2,
      withoutEvidence: 1,
      unanalyzed: 1,
      unknownCountry: 1,
      missingTermEvidence: 1,
      average: 0.25,
    });
    expect(all.body.words).toEqual([
      {
        term: 'bueno',
        language: 'es',
        occurrences: 2,
        newsCount: 1,
        contribution: 0.5,
        influence: 0.5,
      },
    ]);
    expect(
      all.body.timeline.map((t: { date: string; total: number }) => [t.date, t.total]),
    ).toEqual([
      ['2026-10-19', 3],
      ['2026-10-20', 1],
    ]);
    const country = await request(app.getHttpServer())
      .get(`${api}/humor?country=CL&from=2026-10-19&to=2026-10-20`)
      .expect(200);
    expect(country.body.summary.total).toBe(3);
    expect(country.body.news[0]).toMatchObject({ id: first.id, contribution: 0.5, score: 1 });
    const continent = await request(app.getHttpServer())
      .get(`${api}/humor?continent=EUROPE`)
      .expect(200);
    expect(continent.body.summary.total).toBe(0);
    expect(continent.body.summary.average).toBeNull();
    const fallback = await request(app.getHttpServer())
      .get(`${api}/humor?from=2026-10-20&to=2026-10-20`)
      .expect(200);
    expect(fallback.body.news).toHaveLength(1);
    expect(fallback.body.news[0].dateSource).toBe('capture');
    await request(app.getHttpServer())
      .post(`/api/v1/news/${first.id}/sentiment`)
      .send({ language: 'es' })
      .expect(200);
    const reanalyzed = await request(app.getHttpServer())
      .get(`${api}/humor?country=CL&to=2026-10-19`)
      .expect(200);
    expect(reanalyzed.body.news.find((n: { id: string }) => n.id === first.id)).toMatchObject({
      score: -1,
      terms: [{ term: 'bueno', language: 'es', weight: -5, occurrences: 2 }],
    });
  });

  it.each([
    'from=2026-02-30',
    'to=foo',
    'country=ZZ',
    'country=cl',
    'country=CL&continent=EUROPE',
    'from=2026-10-20&to=2026-10-19',
    'continent=INVALID',
    'from=',
    'country=CL&country=AR',
  ])('rechaza %s', async (query) => {
    await request(app.getHttpServer()).get(`${api}/humor?${query}`).expect(400);
  });
  it.each([
    {},
    { countryCode: undefined },
    { countryCode: '' },
    { countryCode: 'ZZ' },
    { countryCode: 1 },
    { countryCode: 'cl' },
  ])('rechaza asignación inválida %#', async (body) => {
    await request(app.getHttpServer())
      .put(`${api}/sources/${sid}/geography`)
      .send(body)
      .expect(400);
    expect(
      (await prisma.rssSource.findUniqueOrThrow({ where: { id: sid } })).countryCode,
    ).toBeNull();
  });
  it('404, UUID inválido y errores sanitizados de lectura/escritura', async () => {
    await request(app.getHttpServer())
      .put(`${api}/sources/${missing}/geography`)
      .send({ countryCode: 'CL' })
      .expect(404);
    await request(app.getHttpServer())
      .put(`${api}/sources/nope/geography`)
      .send({ countryCode: 'CL' })
      .expect(400);
    const read = jest.spyOn(repository, 'readNews').mockRejectedValueOnce(new Error('secret sql'));
    const failed = await request(app.getHttpServer()).get(`${api}/humor`).expect(503);
    expect(JSON.stringify(failed.body)).not.toContain('secret');
    read.mockRestore();
    const sources = jest
      .spyOn(prisma.rssSource, 'findMany')
      .mockRejectedValueOnce(new Error('secret sql'));
    await request(app.getHttpServer()).get(`${api}/geography`).expect(503);
    sources.mockRestore();
    const write = jest
      .spyOn(prisma.rssSource, 'update')
      .mockRejectedValueOnce(new Error('secret sql'));
    await request(app.getHttpServer())
      .put(`${api}/sources/${sid}/geography`)
      .send({ countryCode: 'CL' })
      .expect(503);
    write.mockRestore();
    const readDb = jest
      .spyOn(prisma.news, 'findMany')
      .mockRejectedValueOnce(new Error('secret sql'));
    await expect(repository.readNews({})).rejects.toBeInstanceOf(AnalyticsUnavailableError);
    readDb.mockRestore();
  });
  it('restricciones aditivas rechazan país y evidencia inválidos sin afectar valores anteriores', async () => {
    const item = await news('constraints');
    await expect(
      prisma.$executeRaw`UPDATE rss_sources SET "countryCode" = 'xx' WHERE id = ${sid}`,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`UPDATE news SET "sentimentTerms" = '{}'::jsonb WHERE id = ${item.id}`,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`UPDATE news SET "sentimentTerms" = '[]'::jsonb WHERE id = ${item.id}`,
    ).rejects.toThrow();
  });
});

describe('lector de evidencia guardada', () => {
  it.each([
    {},
    [null],
    ['word'],
    [{ term: '', language: 'es', weight: 1, occurrences: 1 }],
    [{ term: 'a', language: 'fr', weight: 1, occurrences: 1 }],
    [{ term: 'a', language: 'es', weight: 6, occurrences: 1 }],
    [{ term: 'a', language: 'es', weight: 1, occurrences: 0 }],
  ])('rechaza evidencia corrupta %#', (value) => {
    expect(() => readTermEvidence(value as Prisma.JsonValue)).toThrow(AnalyticsUnavailableError);
  });
});
