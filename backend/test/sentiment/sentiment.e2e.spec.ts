import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { DIRECT_SENTIMENT_MAX_CODE_POINTS } from '../../src/sentiment/types/direct-sentiment-analysis';

describe('/api/v1/sentiment/analyze (e2e, PostgreSQL real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let openApi: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
    openApi = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('HumWorld API')
        .setDescription('API REST de HumWorld')
        .setVersion('1.0')
        .build(),
    );
  });

  afterAll(async () => {
    await clearDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('analiza español e inglés con el motor y el diccionario reales', async () => {
    await prisma.dictionaryEntry.createMany({
      data: [
        { term: 'excelente', language: 'es', weight: 5 },
        { term: 'terrible', language: 'es', weight: -5 },
        { term: 'excellent', language: 'en', weight: 5 },
        { term: 'excellent', language: 'es', weight: -5 },
      ],
    });

    const spanish = await analyze({ text: 'La recuperación fue excelente', language: 'es' });
    const english = await analyze({ text: 'An excellent recovery', language: 'en' });
    const negative = await analyze({ text: 'Un resultado terrible', language: 'es' });

    expect(spanish.status).toBe(200);
    expect(spanish.body).toEqual({ score: 1, matchedTerms: 1 });
    expect(Object.keys(spanish.body).sort()).toEqual(['matchedTerms', 'score']);
    expect(english.body).toEqual({ score: 1, matchedTerms: 1 });
    expect(negative.body).toEqual({ score: -1, matchedTerms: 1 });
  });

  it('devuelve cero para diccionario vacío, ausencia de coincidencias y texto sin tokens', async () => {
    expect((await analyze({ text: 'sin coincidencias', language: 'es' })).body).toEqual({
      score: 0,
      matchedTerms: 0,
    });

    await prisma.dictionaryEntry.create({
      data: { term: 'excelente', language: 'es', weight: 5 },
    });
    expect((await analyze({ text: 'desconocido', language: 'es' })).body).toEqual({
      score: 0,
      matchedTerms: 0,
    });
    expect((await analyze({ text: '<p>!!!</p>', language: 'es' })).body).toEqual({
      score: 0,
      matchedTerms: 0,
    });
  });

  it.each([
    [{}, 'cuerpo vacío'],
    [{ text: 'contenido' }, 'idioma ausente'],
    [{ language: 'es' }, 'texto ausente'],
    [{ text: '', language: 'es' }, 'texto vacío'],
    [{ text: '   ', language: 'es' }, 'solo espacios'],
    [{ text: null, language: 'es' }, 'texto nulo'],
    [{ text: 42, language: 'es' }, 'texto numérico'],
    [{ text: {}, language: 'es' }, 'texto objeto'],
    [{ text: 'bonjour', language: 'fr' }, 'idioma no admitido'],
  ] as const)('rechaza con 400 %s (%s)', async (body, _caseDescription) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/sentiment/analyze')
      .send(body);
    expect(response.status).toBe(400);
  });

  it('rechaza JSON mal formado con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/sentiment/analyze')
      .set('Content-Type', 'application/json')
      .send('{"text":');
    expect(response.status).toBe(400);
  });

  it('acepta 10.000 puntos Unicode y rechaza 10.001 con 413', async () => {
    const accepted = await analyze({
      text: '😀'.repeat(DIRECT_SENTIMENT_MAX_CODE_POINTS),
      language: 'es',
    });
    const rejected = await analyze({
      text: '😀'.repeat(DIRECT_SENTIMENT_MAX_CODE_POINTS + 1),
      language: 'es',
    });

    expect(accepted.status).toBe(200);
    expect(accepted.body).toEqual({ score: 0, matchedTerms: 0 });
    expect(rejected.status).toBe(413);
  });

  it('es determinista y observa cambios del diccionario solo en solicitudes posteriores', async () => {
    const entry = await prisma.dictionaryEntry.create({
      data: { term: 'estable', language: 'es', weight: 1 },
    });

    const first = await analyze({ text: 'estable estable', language: 'es' });
    const repeated = await analyze({ text: 'estable estable', language: 'es' });
    await prisma.dictionaryEntry.update({ where: { id: entry.id }, data: { weight: 5 } });
    const updated = await analyze({ text: 'estable estable', language: 'es' });

    expect(first.body).toEqual({ score: 0.2, matchedTerms: 2 });
    expect(repeated.body).toEqual(first.body);
    expect(updated.body).toEqual({ score: 1, matchedTerms: 2 });
  });

  it('devuelve 503 sanitizado ante un fallo real de lectura PostgreSQL', async () => {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "dictionary_entries" RENAME TO "dictionary_entries_unavailable"',
    );
    try {
      const response = await analyze({ text: 'texto válido', language: 'es' });
      expect(response.status).toBe(503);
      expect(response.body).not.toHaveProperty('score');
      expect(JSON.stringify(response.body)).not.toMatch(
        /dictionary_entries|postgresql|prisma|secret|database_url/i,
      );
    } finally {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "dictionary_entries_unavailable" RENAME TO "dictionary_entries"',
      );
    }
  });

  it('descarta campos ajenos y no crea noticias ni persiste el texto o el resultado', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/sentiment/analyze')
      .send({ text: 'efímero', language: 'es', newsId: 'no-debe-usarse', score: 1 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ score: 0, matchedTerms: 0 });
    await expect(prisma.news.count()).resolves.toBe(0);
  });

  it('publica exactamente la operación, los DTO y los códigos acordados', () => {
    const endpoint = openApi.paths['/api/v1/sentiment/analyze'];
    const operation = endpoint?.post;

    expect(Object.keys(endpoint ?? {})).toEqual(['post']);
    expect(operation?.requestBody).toEqual(
      expect.objectContaining({ required: true }),
    );
    expect(operation?.responses).toEqual(
      expect.objectContaining({
        '200': expect.any(Object),
        '400': expect.any(Object),
        '413': expect.any(Object),
        '500': expect.any(Object),
        '503': expect.any(Object),
      }),
    );
    expect(openApi.components?.schemas).toEqual(
      expect.objectContaining({
        AnalyzeTextRequestDto: expect.any(Object),
        SentimentAnalysisResponseDto: expect.any(Object),
      }),
    );
    expect(openApi.components?.schemas?.AnalyzeTextRequestDto).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          text: expect.objectContaining({ maxLength: DIRECT_SENTIMENT_MAX_CODE_POINTS }),
        }),
      }),
    );
  });

  function analyze(body: string | object | undefined): request.Test {
    return request(app.getHttpServer()).post('/api/v1/sentiment/analyze').send(body);
  }

  async function clearDatabase(): Promise<void> {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await prisma.dictionaryEntry.deleteMany();
  }
});
