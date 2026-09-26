import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RssFetchError } from '../../src/capture/errors/rss-fetch.error';
import { RSS_FETCHER_PORT } from '../../src/capture/ports/rss-fetcher.port';
import { PrismaService } from '../../src/prisma/prisma.service';

const EMPTY_RSS =
  '<rss version="2.0"><channel><title>Sin noticias</title></channel></rss>';

function rssWithItem(title: string, guid: string, link: string): string {
  return `<?xml version="1.0"?>
<rss version="2.0"><channel><title>HumWorld HU-03</title>
  <item><title>${title}</title><guid>${guid}</guid>
    <link>${link}</link><description>Captura múltiple</description></item>
</channel></rss>`;
}

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

describe('POST /api/v1/sources/capture (e2e, PostgreSQL real)', () => {
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

  it('captura dos fuentes seleccionadas con parser/output reales y no descarga la no seleccionada', async () => {
    const sourceA = await createSource('https://source-a.example/rss');
    const sourceB = await createSource('https://source-b.example/rss');
    const notSelected = await createSource('https://not-selected.example/rss');
    fetchRaw.mockImplementation(async (url: string) => {
      if (url === sourceA.url) {
        return rssWithItem(
          'Noticia A',
          'guid-a',
          'https://articles.example/noticia-a',
        );
      }
      if (url === sourceB.url) {
        return rssWithItem(
          'Noticia B',
          'guid-b',
          'https://articles.example/noticia-b',
        );
      }
      throw new Error('Se descargó una fuente no seleccionada');
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/sources/capture')
      .send({ sourceIds: [sourceA.id, sourceB.id] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      results: [
        { sourceId: sourceA.id, status: 'completed', itemsParsed: 1 },
        { sourceId: sourceB.id, status: 'completed', itemsParsed: 1 },
      ],
    });
    expect(fetchRaw.mock.calls).toEqual([[sourceA.url], [sourceB.url]]);
    expect(fetchRaw).not.toHaveBeenCalledWith(notSelected.url);
    expect(fetchRaw).not.toHaveBeenCalledWith(
      'https://articles.example/noticia-a',
    );
    expect(fetchRaw).not.toHaveBeenCalledWith(
      'https://articles.example/noticia-b',
    );

    const news = await request(app.getHttpServer()).get('/api/v1/news');
    expect(news.status).toBe(200);
    expect(news.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: sourceA.id,
          title: 'Noticia A',
          guid: 'guid-a',
        }),
        expect.objectContaining({
          source: sourceB.id,
          title: 'Noticia B',
          guid: 'guid-b',
        }),
      ]),
    );
    expect(news.body).toHaveLength(2);
  });

  it('deduplica IDs por request y HU-04 mantiene deduplicadas las noticias al repetir', async () => {
    const sourceA = await createSource('https://dedupe-a.example/rss');
    const sourceB = await createSource('https://dedupe-b.example/rss');
    fetchRaw.mockImplementation(async (url: string) =>
      url === sourceA.url
        ? rssWithItem('Noticia A', 'dedupe-a', 'https://example.com/a')
        : rssWithItem('Noticia B', 'dedupe-b', 'https://example.com/b'),
    );

    const first = await request(app.getHttpServer())
      .post('/api/v1/sources/capture')
      .send({ sourceIds: [sourceA.id, sourceB.id, sourceA.id] });
    const second = await request(app.getHttpServer())
      .post('/api/v1/sources/capture')
      .send({ sourceIds: [sourceA.id, sourceB.id, sourceA.id] });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.results.map(({ sourceId }: { sourceId: string }) => sourceId)).toEqual([
      sourceA.id,
      sourceB.id,
    ]);
    expect(fetchRaw.mock.calls).toEqual([
      [sourceA.url],
      [sourceB.url],
      [sourceA.url],
      [sourceB.url],
    ]);
    await expect(prisma.news.count()).resolves.toBe(2);
  });

  it('responde 400 y realiza cero fetch con menos de dos IDs efectivos', async () => {
    const source = await createSource('https://minimum.example/rss');

    const duplicated = await request(app.getHttpServer())
      .post('/api/v1/sources/capture')
      .send({ sourceIds: [source.id, source.id] });
    const single = await request(app.getHttpServer())
      .post('/api/v1/sources/capture')
      .send({ sourceIds: [source.id] });

    expect(duplicated.status).toBe(400);
    expect(single.status).toBe(400);
    expect(fetchRaw).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { sourceIds: 'source-a' },
    { sourceIds: ['', 'source-b'] },
    { sourceIds: [1, 'source-b'] },
  ])('responde 400 y realiza cero fetch para body inválido %#', async (body) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/sources/capture')
      .send(body);

    expect(response.status).toBe(400);
    expect(fetchRaw).not.toHaveBeenCalled();
  });

  it('aísla fuente inexistente e inactiva y continúa con la fuente posterior', async () => {
    const sourceA = await createSource('https://isolation-a.example/rss');
    const inactive = await createSource('https://inactive.example/rss', false);
    const sourceC = await createSource('https://isolation-c.example/rss');
    const missing = '00000000-0000-0000-0000-000000000000';
    fetchRaw.mockResolvedValue(EMPTY_RSS);

    const response = await request(app.getHttpServer())
      .post('/api/v1/sources/capture')
      .send({ sourceIds: [sourceA.id, missing, inactive.id, sourceC.id] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      results: [
        { sourceId: sourceA.id, status: 'completed', itemsParsed: 0 },
        {
          sourceId: missing,
          status: 'failed',
          errorCode: 'source-not-found',
        },
        {
          sourceId: inactive.id,
          status: 'failed',
          errorCode: 'source-inactive',
        },
        { sourceId: sourceC.id, status: 'completed', itemsParsed: 0 },
      ],
    });
    expect(fetchRaw.mock.calls).toEqual([[sourceA.url], [sourceC.url]]);
  });

  it.each([
    {
      name: 'upstream',
      failure: new RssFetchError(
        'fetch/upstream',
        'upstream.internal',
        new Error('10.0.0.8 secreto'),
      ),
      errorCode: 'fetch/upstream',
    },
    {
      name: 'timeout',
      failure: new RssFetchError(
        'timeout',
        'deadline.internal',
        new Error('10.0.0.9 secreto'),
      ),
      errorCode: 'timeout',
    },
    {
      name: 'RSS inválido',
      failure: '<html><body>contenido interno</body></html>',
      errorCode: 'parse/invalid-rss',
    },
    {
      name: 'error desconocido',
      failure: new Error('fetch.internal 10.0.0.10 secreto'),
      errorCode: 'unexpected',
    },
  ])('aísla $name y procesa la fuente posterior', async ({ failure, errorCode }) => {
    const sourceA = await createSource('https://partial-a.example/rss');
    const sourceB = await createSource('https://partial-b.example/rss');
    const sourceC = await createSource('https://partial-c.example/rss');
    fetchRaw.mockImplementation(async (url: string) => {
      if (url === sourceB.url) {
        if (failure instanceof Error) {
          throw failure;
        }
        return failure;
      }
      return EMPTY_RSS;
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/sources/capture')
      .send({ sourceIds: [sourceA.id, sourceB.id, sourceC.id] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      results: [
        { sourceId: sourceA.id, status: 'completed', itemsParsed: 0 },
        { sourceId: sourceB.id, status: 'failed', errorCode },
        { sourceId: sourceC.id, status: 'completed', itemsParsed: 0 },
      ],
    });
    expect(fetchRaw.mock.calls).toEqual([
      [sourceA.url],
      [sourceB.url],
      [sourceC.url],
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /internal|10\.0\.0\.|secreto|<html/,
    );
  });

  it('representa source-busy dentro de results y continúa mediante el guard compartido', async () => {
    const busy = await createSource('https://busy.example/rss');
    const next = await createSource('https://after-busy.example/rss');
    const pending = deferred<string>();
    const started = deferred<void>();
    fetchRaw.mockImplementation((url: string) => {
      if (url === busy.url) {
        started.resolve();
        return pending.promise;
      }
      return Promise.resolve(EMPTY_RSS);
    });

    const activeSingleCapture = request(app.getHttpServer())
      .post(`/api/v1/sources/${busy.id}/capture`)
      .then((response) => response);
    await started.promise;

    const batch = await request(app.getHttpServer())
      .post('/api/v1/sources/capture')
      .send({ sourceIds: [busy.id, next.id] });

    expect(batch.status).toBe(200);
    expect(batch.body).toEqual({
      results: [
        {
          sourceId: busy.id,
          status: 'failed',
          errorCode: 'source-busy',
        },
        { sourceId: next.id, status: 'completed', itemsParsed: 0 },
      ],
    });
    expect(fetchRaw.mock.calls).toEqual([[busy.url], [next.url]]);

    pending.resolve(EMPTY_RSS);
    await expect(activeSingleCapture).resolves.toMatchObject({ status: 200 });
  });

  it('documenta el contrato batch discriminado y conserva OpenAPI de HU-02', () => {
    const operation = openApi.paths['/api/v1/sources/capture']?.post;
    const singleOperation =
      openApi.paths['/api/v1/sources/{id}/capture']?.post;

    expect(operation).toBeDefined();
    expect(operation?.requestBody).toEqual(
      expect.objectContaining({
        required: true,
        content: expect.objectContaining({
          'application/json': expect.objectContaining({
            schema: {
              $ref: '#/components/schemas/MultipleSourceCaptureRequestDto',
            },
          }),
        }),
      }),
    );
    expect(operation?.responses).toEqual(
      expect.objectContaining({
        '200': expect.any(Object),
        '400': expect.any(Object),
        '500': expect.any(Object),
      }),
    );
    expect(operation?.responses['200']).toEqual(
      expect.objectContaining({
        content: expect.objectContaining({
          'application/json': expect.objectContaining({
            schema: {
              $ref: '#/components/schemas/MultipleSourceCaptureResponseDto',
            },
          }),
        }),
      }),
    );

    const requestSchema =
      openApi.components?.schemas?.MultipleSourceCaptureRequestDto;
    expect(requestSchema).toEqual(
      expect.objectContaining({
        required: ['sourceIds'],
        properties: expect.objectContaining({
          sourceIds: expect.objectContaining({
            type: 'array',
            items: { type: 'string' },
          }),
        }),
      }),
    );

    const responseSchema =
      openApi.components?.schemas?.MultipleSourceCaptureResponseDto;
    expect(responseSchema).toEqual(
      expect.objectContaining({
        required: ['results'],
        properties: expect.objectContaining({
          results: expect.objectContaining({
            type: 'array',
            items: expect.objectContaining({
              oneOf: [
                {
                  $ref: '#/components/schemas/CompletedMultipleSourceCaptureResultDto',
                },
                {
                  $ref: '#/components/schemas/FailedMultipleSourceCaptureResultDto',
                },
              ],
              discriminator: expect.objectContaining({
                propertyName: 'status',
              }),
            }),
          }),
        }),
      }),
    );
    expect(
      openApi.components?.schemas?.CompletedMultipleSourceCaptureResultDto,
    ).toEqual(
      expect.objectContaining({
        required: ['sourceId', 'status', 'itemsParsed'],
      }),
    );
    expect(
      openApi.components?.schemas?.FailedMultipleSourceCaptureResultDto,
    ).toEqual(
      expect.objectContaining({
        required: ['sourceId', 'status', 'errorCode'],
        properties: expect.objectContaining({
          errorCode: expect.objectContaining({
            enum: [
              'source-not-found',
              'source-inactive',
              'source-busy',
              'fetch/upstream',
              'parse/invalid-rss',
              'timeout',
              'unexpected',
            ],
          }),
        }),
      }),
    );
    expect(singleOperation).toBeDefined();
    expect(singleOperation?.requestBody).toBeUndefined();
    expect(singleOperation?.responses).toEqual(
      expect.objectContaining({
        '200': expect.any(Object),
        '404': expect.any(Object),
        '409': expect.any(Object),
        '502': expect.any(Object),
        '504': expect.any(Object),
      }),
    );
  });

  async function createSource(url: string, active = true) {
    return prisma.rssSource.create({ data: { url, active } });
  }
});
