import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AutomaticCaptureJob } from '../../src/capture/jobs/automatic-capture.job';
import { RSS_FETCHER_PORT } from '../../src/capture/ports/rss-fetcher.port';
import { PrismaService } from '../../src/prisma/prisma.service';

const CONTROLLED_RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>HumWorld controlado</title>
  <item><title>Sin identidad</title><description>Debe descartarse</description></item>
  <item><title>Noticia persistida</title><guid>controlled-guid</guid>
    <link>https://example.com/article</link><description>Desde RSS</description></item>
</channel></rss>`;

describe('captura RSS -> PostgreSQL -> GET /news (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let job: AutomaticCaptureJob;
  const fetchRaw = jest.fn().mockResolvedValue(CONTROLLED_RSS);

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
    job = moduleRef.get(AutomaticCaptureJob);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
  });

  afterAll(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await app.close();
  });

  it('descarta el primer ítem, persiste el segundo y excluye la fuente tras desactivarla', async () => {
    const source = await prisma.rssSource.create({
      data: { url: 'https://controlled.example/rss', active: true },
    });

    await expect(job.run()).resolves.toBe(true);
    expect(fetchRaw).toHaveBeenCalledTimes(1);
    expect(fetchRaw).toHaveBeenCalledWith(source.url);

    const firstList = await request(app.getHttpServer()).get('/api/v1/news');
    expect(firstList.status).toBe(200);
    expect(firstList.body).toEqual([
      expect.objectContaining({
        source: source.id,
        title: 'Noticia persistida',
        guid: 'controlled-guid',
        link: 'https://example.com/article',
        description: 'Desde RSS',
      }),
    ]);

    await expect(job.run()).resolves.toBe(true);
    await expect(prisma.news.count()).resolves.toBe(1);
    expect(fetchRaw).toHaveBeenCalledTimes(2);

    await request(app.getHttpServer()).delete(`/api/v1/sources/${source.id}`).expect(204);
    await expect(job.run()).resolves.toBe(true);

    expect(fetchRaw).toHaveBeenCalledTimes(2);
    await expect(prisma.news.count()).resolves.toBe(1);
    await expect(prisma.rssSource.findUniqueOrThrow({ where: { id: source.id } })).resolves.toMatchObject({
      active: false,
    });
    const finalList = await request(app.getHttpServer()).get('/api/v1/news');
    expect(finalList.body).toHaveLength(1);
  });
});
