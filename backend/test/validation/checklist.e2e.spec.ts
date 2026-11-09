import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SourceAccessibilityChecker } from '../../src/sources/integrations/source-accessibility-checker';
import { RSS_FETCHER_PORT } from '../../src/capture/ports/rss-fetcher.port';

describe('Checklist de evaluación: compatibilidad, metadatos, filtros y borrado seguro', () => {
  let app: INestApplication; let prisma: PrismaService;
  const write = () => request.agent(app.getHttpServer()).set('X-API-Key', process.env.HUMWORLD_API_KEY_WRITE!);
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SourceAccessibilityChecker).useValue({ assertAccessible: jest.fn() })
      .overrideProvider(RSS_FETCHER_PORT).useValue({ fetchRaw: jest.fn(async () => `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><title>RSS controlado</title><item>
        <title>Excelente avance hospital</title><guid>checklist-controlado</guid>
        <link>https://checklist.example/noticia</link><pubDate>Mon, 09 Nov 2026 12:00:00 GMT</pubDate>
        <description>Investigación hospitalaria</description></item></channel></rss>`) }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init(); prisma = module.get(PrismaService);
  });
  beforeEach(async () => {
    delete process.env.HUMWORLD_EVALUATION_MODE; delete process.env.HUMWORLD_VALIDATION_MODE;
    await prisma.news.deleteMany(); await prisma.rssSource.deleteMany(); await prisma.channel.deleteMany();
    await prisma.dictionaryEntry.deleteMany(); await prisma.newsRetentionPolicy.deleteMany();
  });
  afterAll(async () => {
    delete process.env.HUMWORLD_EVALUATION_MODE; delete process.env.HUMWORLD_VALIDATION_MODE;
    await prisma.news.deleteMany(); await prisma.rssSource.deleteMany(); await prisma.channel.deleteMany();
    await app.close();
  });
  async function source() {
    const medium = await prisma.channel.create({ data: { name: 'Medio de evaluación' } });
    const response = await write().post('/api/v1/sources').send({ url: 'https://checklist.example/rss',
      channelId: medium.id, countryCode: 'CL', language: 'es', mediaTopicQcode: 'medtop:07000000' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ channelId: medium.id, continent: 'SOUTH_AMERICA', countryCode: 'CL', language: 'es', mediaTopicQcode: 'medtop:07000000' });
    return response.body.id as string;
  }
  async function news(sourceId: string, fields: Record<string, unknown> = {}) {
    return prisma.news.create({ data: { sourceId, title: 'Excelente avance hospital', dedupeKey: `guid:${randomUUID()}`,
      mediaTopicQcodes: ['medtop:07000000'], pubDate: new Date('2026-11-09T12:00:00Z'), ...fields } });
  }
  it('P12 conserva 401/403 y DELETE lógico en modo normal, incluso con una sola bandera', async () => {
    process.env.HUMWORLD_EVALUATION_MODE = '1';
    expect((await request(app.getHttpServer()).get('/api/v1/sources')).status).toBe(401);
    const id = await source(); const item = await news(id);
    expect((await request(app.getHttpServer()).delete(`/api/v1/sources/${id}`).set('X-API-Key', process.env.HUMWORLD_API_KEY_READ!)).status).toBe(403);
    expect((await write().delete(`/api/v1/sources/${id}`)).status).toBe(204);
    expect(await prisma.news.findUnique({ where: { id: item.id } })).not.toBeNull();
    expect(await prisma.rssSource.findUnique({ where: { id } })).toMatchObject({ active: false });
    expect((await request(app.getHttpServer()).get('/api/v1/config')).body.evaluationMode).toBe(false);
  });
  it('permite gestión anónima solo con ambas banderas y borra exclusivamente la fuente y sus noticias', async () => {
    const id = await source(); const item = await news(id);
    const other = await prisma.rssSource.create({ data: { url: 'https://preservada.example/rss' } });
    const kept = await news(other.id);
    process.env.HUMWORLD_EVALUATION_MODE = '1'; process.env.HUMWORLD_VALIDATION_MODE = '1';
    expect((await request(app.getHttpServer()).get('/api/v1/sources')).status).toBe(200);
    expect((await request(app.getHttpServer()).delete(`/api/v1/sources/${id}`)).status).toBe(204);
    expect(await prisma.rssSource.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.news.findUnique({ where: { id: item.id } })).toBeNull();
    expect(await prisma.news.findUnique({ where: { id: kept.id } })).not.toBeNull();
    expect((await request(app.getHttpServer()).delete(`/api/v1/sources/${id}`)).status).toBe(404);
  });
  it('actualiza metadatos, rechaza país/categoría/idioma/medio inválidos y publica la caducidad coherente', async () => {
    const id = await source();
    expect((await write().patch(`/api/v1/sources/${id}`).send({ countryCode: 'US', language: 'en' })).body).toMatchObject({ countryCode: 'US', continent: 'NORTH_AMERICA', language: 'en' });
    for (const body of [{ countryCode: 'ZZ' }, { language: 'fr' }, { mediaTopicQcode: 'incorrecta' }, { channelId: randomUUID() }]) {
      expect((await write().patch(`/api/v1/sources/${id}`).send(body)).status).toBe(400);
    }
    await write().put('/api/v1/config/retention').send({ retentionDays: 31 }).expect(200);
    expect((await request(app.getHttpServer()).get('/api/v1/config')).body).toMatchObject({ retentionDays: 31, evaluationMode: false });
    // The new detail route cannot shadow the pre-existing static purge-preview route.
    await write().get('/api/v1/news/purge-preview').expect(200);
  });
  it('analiza por ambas rutas POST y hace coincidir consultas globales, geográficas, fuente/categoría y detalle', async () => {
    const id = await source();
    await write().post(`/api/v1/sources/${id}/capture`).expect(200);
    const item = await prisma.news.findFirstOrThrow({ where: { sourceId: id } });
    await prisma.dictionaryEntry.createMany({ data: [{ term: 'excelente', language: 'es', weight: 5 }, { term: 'avance', language: 'es', weight: 2 }] });
    for (const path of ['/api/v1/sentiment', '/api/v1/sentiment/analyze']) {
      const result = await request(app.getHttpServer()).post(path).send({ text: 'excelente avance', language: 'es' });
      expect(result.status).toBe(200); expect(result.body).toMatchObject({ score: 0.7, matchedTerms: 2 });
    }
    await request(app.getHttpServer()).post(`/api/v1/news/${item.id}/sentiment`).send({ language: 'es' }).expect(200);
    const detail = await request(app.getHttpServer()).get(`/api/v1/news/${item.id}`).expect(200);
    expect(detail.body).toMatchObject({ source: id, countryCode: 'CL', continent: 'SOUTH_AMERICA', sourceMediaTopicQcode: 'medtop:07000000', sentiment: { score: 0.7 } });
    for (const query of ['', '?country=CL', '?continent=SOUTH_AMERICA', `?source=${id}&category=medtop:07000000&from=2026-11-09&to=2026-11-09`]) {
      const alias = await request(app.getHttpServer()).get('/api/v1/sentiment' + query).expect(200);
      const canonical = await request(app.getHttpServer()).get('/api/v1/dashboards/humor' + query).expect(200);
      expect(alias.body).toEqual(canonical.body); expect(alias.body.summary.average).toBe(0.7);
      expect(alias.body.words).toHaveLength(2);
    }
    expect((await request(app.getHttpServer()).get('/api/v1/sentiment?country=US')).body.summary.total).toBe(0);
    expect((await request(app.getHttpServer()).get('/api/v1/sentiment?category=medtop:15000000')).body.summary.total).toBe(0);
    const list = await request(app.getHttpServer()).get(`/api/v1/news?country=CL&source=${id}&category=medtop:07000000&from=2026-11-09&to=2026-11-09`).expect(200);
    expect(list.body.map((row: { id: string }) => row.id)).toEqual([item.id]);
    for (const query of ['country=US', 'category=medtop:15000000', 'from=2026-11-10', 'to=2026-11-08']) {
      expect((await request(app.getHttpServer()).get('/api/v1/news?' + query)).body).toEqual([]);
    }
    for (const query of ['from=2026-02-30', 'from=2026-11-10&to=2026-11-01', 'country=ZZ', 'country=CL&continent=EUROPE', 'category=incorrecta', 'source=bad']) {
      await request(app.getHttpServer()).get('/api/v1/news?' + query).expect(400);
    }
  });
  it('borra noticias por body o por ruta; conserva la fuente, controla permisos y responde 404/400', async () => {
    const id = await source(); const first = await news(id); const second = await news(id);
    await request(app.getHttpServer()).delete('/api/v1/news').send({ id: first.id }).expect(401);
    await write().delete('/api/v1/news').send({ id: first.id }).expect(204);
    await request(app.getHttpServer()).get(`/api/v1/news/${first.id}`).expect(404);
    await write().delete(`/api/v1/news/${second.id}`).expect(204);
    await write().delete(`/api/v1/news/${second.id}`).expect(404);
    await write().delete('/api/v1/news').send({ id: 'inválido' }).expect(400);
    expect(await prisma.rssSource.count()).toBe(1);
  });
});
