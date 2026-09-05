import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const SOURCE_ID = '44444444-4444-4444-8444-444444444444';

describe('GET /api/v1/news (e2e, PostgreSQL real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await prisma.rssSource.create({
      data: {
        id: SOURCE_ID,
        url: 'https://source-e2e.example/rss',
      },
    });
  });

  it('responde 200 con una lista vacía cuando no hay noticias almacenadas', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/news');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('responde 200 con las noticias almacenadas y sus metadatos', async () => {
    await prisma.news.create({
      data: {
        sourceId: SOURCE_ID,
        title: 'Noticia end-to-end',
        link: 'https://example.com/e2e',
        guid: 'guid-e2e',
        description: 'Descripción e2e',
        dedupeKey: 'guid:guid-e2e',
      },
    });

    const response = await request(app.getHttpServer()).get('/api/v1/news');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      source: SOURCE_ID,
      title: 'Noticia end-to-end',
      link: 'https://example.com/e2e',
      guid: 'guid-e2e',
      description: 'Descripción e2e',
    });
  });
});
