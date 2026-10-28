import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Continent, DictionaryLanguage } from '@prisma/client';
import request from '../helpers/authorized-request';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SourceAccessibilityChecker } from '../../src/sources/integrations/source-accessibility-checker';
import { SourcesModule } from '../../src/sources/sources.module';

jest.setTimeout(30_000);

describe('P11: API de fuentes y regresión con PostgreSQL 16', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const assertAccessible = jest.fn(async (url: string) => url);
  const endpoint = '/api/v1/sources';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), SourcesModule],
    }).overrideProvider(SourceAccessibilityChecker).useValue({ assertAccessible }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  async function clean() {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    await clean();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await clean();
  });
  afterAll(async () => { await app?.close(); });

  it('P11-A01: normaliza host/puerto, recupera y rechaza duplicado canónico', async () => {
    // Arrange
    const canonical = 'https://p11.example/feed';
    // Act
    const created = await request(app.getHttpServer()).post(endpoint)
      .send({ url: 'https://P11.EXAMPLE:443/feed' });
    // Assert
    expect(created.status).toBe(201);
    expect(created.body.url).toBe(canonical);
    const detail = await request(app.getHttpServer()).get(`${endpoint}/${created.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toEqual(created.body);
    const duplicate = await request(app.getHttpServer()).post(endpoint).send({ url: canonical });
    expect(duplicate.status).toBe(409);
    expect(await prisma.rssSource.findMany()).toEqual([
      expect.objectContaining({ id: created.body.id, url: canonical }),
    ]);
  });

  it('P11-A02: ordena por fecha de creación y filtra ambos estados exactamente', async () => {
    // Arrange: inserción desordenada y fechas distintas, sin depender del reloj.
    const last = await prisma.rssSource.create({ data: {
      url: 'https://last.p11.example/feed', createdAt: new Date('2026-01-03T00:00:00Z'),
    } });
    const first = await prisma.rssSource.create({ data: {
      url: 'https://first.p11.example/feed', createdAt: new Date('2026-01-01T00:00:00Z'),
    } });
    const middle = await prisma.rssSource.create({ data: {
      url: 'https://middle.p11.example/feed', active: false,
      createdAt: new Date('2026-01-02T00:00:00Z'),
    } });
    // Act
    const all = await request(app.getHttpServer()).get(endpoint);
    const active = await request(app.getHttpServer()).get(`${endpoint}?active=true`);
    const inactive = await request(app.getHttpServer()).get(`${endpoint}?active=false`);
    // Assert: esta única aserción se altera temporalmente en la demostración rojo/verde.
    expect(all.status).toBe(200); // P11-RED-GREEN
    expect(all.body.map((item: { id: string }) => item.id)).toEqual([first.id, middle.id, last.id]);
    expect(active.status).toBe(200);
    expect(active.body.map((item: { id: string }) => item.id)).toEqual([first.id, last.id]);
    expect(inactive.status).toBe(200);
    expect(inactive.body.map((item: { id: string }) => item.id)).toEqual([middle.id]);
  });

  it('P11-A03: PATCH conserva ID, noticia, metadatos, IPTC y análisis de sentimiento', async () => {
    // Arrange: una noticia ya analizada con todos sus datos persistidos.
    const source = await prisma.rssSource.create({ data: {
      url: 'https://before.p11.example/feed', continent: Continent.EUROPE,
    } });
    const news = await prisma.news.create({ data: {
      sourceId: source.id, title: 'Noticia P11', description: 'Contenido conservado',
      link: 'https://before.p11.example/article', guid: 'p11-guid', dedupeKey: 'p11-key',
      pubDate: new Date('2026-01-01T12:00:00Z'), capturedAt: new Date('2026-01-01T13:00:00Z'),
      mediaTopicQcodes: ['medtop:13000000'], sentimentScore: '0.8000', sentimentMatchedTerms: 2,
      sentimentLanguage: DictionaryLanguage.es, sentimentAnalyzedAt: new Date('2026-01-01T14:00:00Z'),
    } });
    // Act
    const response = await request(app.getHttpServer()).patch(`${endpoint}/${source.id}`)
      .send({ url: 'https://after.p11.example/feed' });
    // Assert: igualdad completa, no solo que la noticia todavía existe.
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: source.id, url: 'https://after.p11.example/feed' });
    expect(await prisma.news.findUnique({ where: { id: news.id } })).toEqual(news);
    expect(await prisma.news.count()).toBe(1);
    expect(await prisma.rssSource.findUnique({ where: { id: source.id } })).toMatchObject({
      continent: Continent.EUROPE, active: source.active, createdAt: source.createdAt,
    });
  });

  it('P11-A04: oculta un fallo de escritura inesperado y no crea filas', async () => {
    // Arrange: fallo inyectado solo en escritura; no se presenta como unitaria.
    const internal = 'P11_SYNTHETIC_INTERNAL host=database.invalid detail=private';
    const create = jest.spyOn(prisma.rssSource, 'create').mockRejectedValueOnce(new Error(internal));
    // Act
    const response = await request(app.getHttpServer()).post(endpoint)
      .send({ url: 'https://failure.p11.example/feed' });
    // Assert
    expect(create).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ statusCode: 500, message: 'Internal Server Error' });
    expect(response.text).not.toContain(internal);
    expect(await prisma.rssSource.count()).toBe(0);
  });
});
