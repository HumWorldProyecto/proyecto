import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const SOURCE_ID = '44444444-4444-4444-8444-444444444444';

describe('GET /api/v1/news (e2e, PostgreSQL real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let openApi: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    openApi = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('HumWorld API').setVersion('1.0').build(),
    );

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
        mediaTopicQcodes: ['medtop:07000000', 'medtop:13000000'],
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
      mediaTopics: [
        {
          qcode: 'medtop:07000000',
          uri: 'http://cv.iptc.org/newscodes/mediatopic/07000000',
          label: 'Salud',
        },
        {
          qcode: 'medtop:13000000',
          uri: 'http://cv.iptc.org/newscodes/mediatopic/13000000',
          label: 'Ciencia y tecnología',
        },
      ],
    });
  });

  it('documenta mediaTopics como colección requerida sin exponer el campo interno', () => {
    const schema = openApi.components?.schemas?.NewsResponseDto as {
      required?: string[];
      properties?: Record<string, unknown>;
    };

    expect(schema.required).toContain('mediaTopics');
    expect(schema.properties?.mediaTopics).toEqual({
      type: 'array',
      description: 'Conceptos raíz oficiales IPTC Media Topics asignados a la noticia',
      items: { $ref: '#/components/schemas/MediaTopicResponseDto' },
    });
    expect(schema.properties).not.toHaveProperty('mediaTopicQcodes');
    expect(schema.properties).not.toHaveProperty('continent');
    expect(openApi.components?.schemas?.MediaTopicResponseDto).toMatchObject({
      required: ['qcode', 'uri', 'label'],
    });
  });

  it('representa de forma exacta noticias con cero, uno y varios temas', async () => {
    await prisma.news.createMany({
      data: [
        {
          sourceId: SOURCE_ID,
          guid: 'sin-tema',
          dedupeKey: 'guid:sin-tema',
          mediaTopicQcodes: [],
        },
        {
          sourceId: SOURCE_ID,
          guid: 'un-tema',
          dedupeKey: 'guid:un-tema',
          mediaTopicQcodes: ['medtop:15000000'],
        },
        {
          sourceId: SOURCE_ID,
          guid: 'varios-temas',
          dedupeKey: 'guid:varios-temas',
          mediaTopicQcodes: ['medtop:04000000', 'medtop:11000000'],
        },
      ],
    });

    const response = await request(app.getHttpServer()).get('/api/v1/news').expect(200);
    const byGuid = new Map(response.body.map((news: { guid: string }) => [news.guid, news]));

    expect(byGuid.get('sin-tema')).toMatchObject({ mediaTopics: [] });
    expect(byGuid.get('un-tema')).toMatchObject({
      mediaTopics: [
        {
          qcode: 'medtop:15000000',
          uri: 'http://cv.iptc.org/newscodes/mediatopic/15000000',
          label: 'Deporte',
        },
      ],
    });
    expect(byGuid.get('varios-temas')).toMatchObject({
      mediaTopics: [
        expect.objectContaining({ qcode: 'medtop:04000000' }),
        expect.objectContaining({ qcode: 'medtop:11000000' }),
      ],
    });
  });
});
