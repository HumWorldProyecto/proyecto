import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RssFetchError } from '../../src/capture/errors/rss-fetch.error';
import { RSS_FETCHER_PORT } from '../../src/capture/ports/rss-fetcher.port';
import { PrismaService } from '../../src/prisma/prisma.service';

const RSS_WITH_ITEM = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>HumWorld manual</title>
  <item><title>Noticia manual</title><guid>manual-guid</guid>
    <link>https://example.com/manual</link><description>Captura HU-02</description></item>
</channel></rss>`;

const EMPTY_RSS =
  '<rss version="2.0"><channel><title>Sin noticias</title></channel></rss>';

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('POST /api/v1/sources/:id/capture (e2e, PostgreSQL real)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let openApi: OpenAPIObject;
  const fetchRaw = jest.fn();

  beforeAll(async () => {
    const preparation = new PrismaService();
    await preparation.$connect();
    await preparation.news.deleteMany();
    await preparation.captureConfig.deleteMany();
    await preparation.rssSource.deleteMany();
    await preparation.$disconnect();

    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RSS_FETCHER_PORT)
      .useValue({ fetchRaw })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
    openApi = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('HumWorld API').setVersion('1.0').build(),
    );
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
  });

  afterAll(async () => {
    await prisma.news.deleteMany();
    await prisma.captureConfig.deleteMany();
    await prisma.rssSource.deleteMany();
    await app.close();
  });

  it('captura solo la fuente seleccionada y persiste sus noticias mediante HU-04', async () => {
    const selected = await createSource('https://selected.example/rss');
    await createSource('https://other.example/rss');
    fetchRaw.mockResolvedValue(RSS_WITH_ITEM);

    const capture = await request(app.getHttpServer()).post(
      `/api/v1/sources/${selected.id}/capture`,
    );

    expect(capture.status).toBe(200);
    expect(capture.body).toEqual({
      sourceId: selected.id,
      status: 'completed',
      itemsParsed: 1,
    });
    expect(fetchRaw).toHaveBeenCalledTimes(1);
    expect(fetchRaw).toHaveBeenCalledWith(selected.url);

    const news = await request(app.getHttpServer()).get('/api/v1/news');
    expect(news.status).toBe(200);
    expect(news.body).toEqual([
      expect.objectContaining({
        source: selected.id,
        title: 'Noticia manual',
        guid: 'manual-guid',
        link: 'https://example.com/manual',
        description: 'Captura HU-02',
      }),
    ]);
  });

  it('completa un RSS válido vacío con itemsParsed cero', async () => {
    const source = await createSource('https://empty.example/rss');
    fetchRaw.mockResolvedValue(EMPTY_RSS);

    const response = await request(app.getHttpServer()).post(
      `/api/v1/sources/${source.id}/capture`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      sourceId: source.id,
      status: 'completed',
      itemsParsed: 0,
    });
    await expect(prisma.news.count()).resolves.toBe(0);
  });

  it('mantiene itemsParsed al repetir el RSS y HU-04 evita filas duplicadas', async () => {
    const source = await createSource('https://dedupe.example/rss');
    fetchRaw.mockResolvedValue(RSS_WITH_ITEM);

    const first = await request(app.getHttpServer()).post(
      `/api/v1/sources/${source.id}/capture`,
    );
    const second = await request(app.getHttpServer()).post(
      `/api/v1/sources/${source.id}/capture`,
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.itemsParsed).toBe(1);
    expect(second.body.itemsParsed).toBe(1);
    await expect(prisma.news.count()).resolves.toBe(1);
  });

  it('rechaza fuentes inexistentes o inactivas antes del fetch', async () => {
    const inactive = await createSource('https://inactive.example/rss', false);

    const missing = await request(app.getHttpServer()).post(
      '/api/v1/sources/00000000-0000-0000-0000-000000000000/capture',
    );
    const inactiveResponse = await request(app.getHttpServer()).post(
      `/api/v1/sources/${inactive.id}/capture`,
    );

    expect(missing.status).toBe(404);
    expect(inactiveResponse.status).toBe(409);
    expect(fetchRaw).not.toHaveBeenCalled();
  });

  it.each([
    ['Atom', '<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title></feed>'],
    ['HTML', '<html><body>página</body></html>'],
    ['RSS inválido', '<rss><channel><item></rss>'],
  ])('responde 502 para %s sin exponer el contenido', async (_case, content) => {
    const source = await createSource('https://invalid.example/rss');
    fetchRaw.mockResolvedValue(content);

    const response = await request(app.getHttpServer()).post(
      `/api/v1/sources/${source.id}/capture`,
    );

    expect(response.status).toBe(502);
    expect(JSON.stringify(response.body)).not.toMatch(/<feed|<html|<rss|invalid\.example/);
    await expect(prisma.news.count()).resolves.toBe(0);
  });

  it.each([
    ['fetch/upstream' as const, 502],
    ['timeout' as const, 504],
  ])('mapea %s sin revelar la causa interna', async (code, status) => {
    const source = await createSource('https://failure.example/rss');
    fetchRaw.mockRejectedValue(
      new RssFetchError(code, 'upstream.internal', new Error('10.0.0.8 secreto')),
    );

    const response = await request(app.getHttpServer()).post(
      `/api/v1/sources/${source.id}/capture`,
    );

    expect(response.status).toBe(status);
    expect(JSON.stringify(response.body)).not.toMatch(
      /upstream\.internal|10\.0\.0\.8|secreto|failure\.example/,
    );
  });

  it('rechaza solapamiento sin segundo fetch ni cola y permite una captura posterior', async () => {
    const source = await createSource('https://concurrent.example/rss');
    const pending = deferred<string>();
    const started = deferred<void>();
    fetchRaw
      .mockImplementationOnce(() => {
        started.resolve();
        return pending.promise;
      })
      .mockResolvedValue(EMPTY_RSS);

    const firstRequest = request(app.getHttpServer())
      .post(`/api/v1/sources/${source.id}/capture`)
      .then((response) => response);
    await started.promise;

    const overlapping = await request(app.getHttpServer()).post(
      `/api/v1/sources/${source.id}/capture`,
    );
    expect(overlapping.status).toBe(409);
    expect(fetchRaw).toHaveBeenCalledTimes(1);

    pending.resolve(EMPTY_RSS);
    const first = await firstRequest;
    expect(first.status).toBe(200);

    const later = await request(app.getHttpServer()).post(
      `/api/v1/sources/${source.id}/capture`,
    );
    expect(later.status).toBe(200);
    expect(fetchRaw).toHaveBeenCalledTimes(2);
  });

  it('documenta ruta, parámetro, respuestas y DTO sin requestBody en OpenAPI', () => {
    const operation = openApi.paths['/api/v1/sources/{id}/capture']?.post;

    expect(operation).toBeDefined();
    expect(operation?.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'id', in: 'path' })]),
    );
    expect(operation?.responses).toEqual(
      expect.objectContaining({
        '200': expect.any(Object),
        '404': expect.any(Object),
        '409': expect.any(Object),
        '500': expect.any(Object),
        '502': expect.any(Object),
        '504': expect.any(Object),
      }),
    );
    expect(operation?.requestBody).toBeUndefined();
    expect(operation?.responses['200']).toEqual(
      expect.objectContaining({
        content: expect.objectContaining({
          'application/json': expect.objectContaining({
            schema: { $ref: '#/components/schemas/ManualSourceCaptureResponseDto' },
          }),
        }),
      }),
    );
    expect(openApi.components?.schemas?.ManualSourceCaptureResponseDto).toEqual(
      expect.objectContaining({
        required: ['sourceId', 'status', 'itemsParsed'],
        properties: expect.objectContaining({
          sourceId: expect.any(Object),
          status: expect.objectContaining({ enum: ['completed'] }),
          itemsParsed: expect.objectContaining({ minimum: 0 }),
        }),
      }),
    );
  });

  async function createSource(url: string, active = true) {
    return prisma.rssSource.create({ data: { url, active } });
  }
});
