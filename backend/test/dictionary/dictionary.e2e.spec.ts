import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const MISSING_ID = '11111111-1111-4111-8111-111111111111';

describe('/api/v1/dictionary (e2e, PostgreSQL real)', () => {
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
      new DocumentBuilder().setTitle('HumWorld API').setVersion('1.0').build(),
    );
  });

  afterAll(async () => {
    await prisma.dictionaryEntry.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.dictionaryEntry.deleteMany();
  });

  it('POST crea con 201, normaliza, descarta campos ajenos y admite peso cero', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/dictionary').send({
      term: '  MUY—POSITIVO! ',
      language: 'es',
      weight: 0,
      unauthorizedField: 'discarded',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      term: 'muy positivo',
      language: 'es',
      weight: 0,
    });
    expect(Object.keys(response.body).sort()).toEqual(['id', 'language', 'term', 'weight']);
    await expect(prisma.dictionaryEntry.count()).resolves.toBe(1);
  });

  it.each([
    [{ term: 'valid', language: 'fr', weight: 1 }, 'idioma'],
    [{ term: 'valid', language: 'es', weight: -6 }, 'peso bajo'],
    [{ term: 'valid', language: 'es', weight: 6 }, 'peso alto'],
    [{ term: 'valid', language: 'es', weight: 1.5 }, 'peso decimal'],
    [{ term: '!!!', language: 'es', weight: 1 }, 'término canónico vacío'],
    [{ term: 'a'.repeat(201), language: 'es', weight: 1 }, 'término largo'],
  ])('POST rechaza con 400 %s (%s) sin persistir', async (body) => {
    const response = await request(app.getHttpServer()).post('/api/v1/dictionary').send(body);
    expect(response.status).toBe(400);
    await expect(prisma.dictionaryEntry.count()).resolves.toBe(0);
  });

  it('impone unicidad canónica por idioma y permite la misma forma en otro idioma', async () => {
    await createEntry({ term: 'Muy Bueno', language: 'es', weight: 4 });
    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/dictionary')
      .send({ term: 'muy...bueno', language: 'es', weight: -1 });
    const otherLanguage = await request(app.getHttpServer())
      .post('/api/v1/dictionary')
      .send({ term: 'muy bueno', language: 'en', weight: 2 });

    expect(duplicate.status).toBe(409);
    expect(otherLanguage.status).toBe(201);
    await expect(prisma.dictionaryEntry.count()).resolves.toBe(2);
  });

  it('GET devuelve colección vacía, orden determinista y detalle exacto', async () => {
    expect((await request(app.getHttpServer()).get('/api/v1/dictionary')).body).toEqual([]);
    const zeta = await createEntry({ term: 'zeta', language: 'es', weight: 1 });
    const alphaEn = await createEntry({ term: 'alpha', language: 'en', weight: 2 });
    const alphaEs = await createEntry({ term: 'alpha', language: 'es', weight: 3 });

    const collection = await request(app.getHttpServer()).get('/api/v1/dictionary');
    const detail = await request(app.getHttpServer()).get(`/api/v1/dictionary/${zeta.id}`);

    expect(collection.status).toBe(200);
    expect(collection.body.map(({ id }: { id: string }) => id)).toEqual([
      alphaEs.id,
      zeta.id,
      alphaEn.id,
    ]);
    expect(detail.status).toBe(200);
    expect(detail.body).toEqual(zeta);
  });

  it('GET/PATCH/DELETE distinguen UUID inválido y UUID ausente', async () => {
    for (const method of ['get', 'patch', 'delete'] as const) {
      const invalid = request(app.getHttpServer())[method]('/api/v1/dictionary/not-a-uuid');
      if (method === 'patch') invalid.send({ weight: 0 });
      expect((await invalid).status).toBe(400);

      const missing = request(app.getHttpServer())[method](`/api/v1/dictionary/${MISSING_ID}`);
      if (method === 'patch') missing.send({ weight: 0 });
      expect((await missing).status).toBe(404);
    }
  });

  it('PATCH exige un campo, valida y actualiza la entidad completa en una sola operación', async () => {
    const created = await createEntry({ term: 'Inicial', language: 'es', weight: 1 });

    expect(
      (await request(app.getHttpServer()).patch(`/api/v1/dictionary/${created.id}`).send({})).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/dictionary/${created.id}`)
          .send({ ignored: true })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/dictionary/${created.id}`)
          .send({ weight: 1.5 })
      ).status,
    ).toBe(400);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/dictionary/${created.id}`)
      .send({ term: '  FINAL—TERM ', language: 'en', weight: -5 });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ ...created, term: 'final term', language: 'en', weight: -5 });
  });

  it('PATCH duplicado responde 409 y conserva íntegra la fila anterior', async () => {
    const first = await createEntry({ term: 'primero', language: 'es', weight: 1 });
    await createEntry({ term: 'ocupado', language: 'es', weight: -1 });

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/dictionary/${first.id}`)
      .send({ term: ' OCUPADO! ', weight: 5 });

    expect(response.status).toBe(409);
    await expect(prisma.dictionaryEntry.findUnique({ where: { id: first.id } })).resolves.toMatchObject({
      term: 'primero',
      language: 'es',
      weight: 1,
    });
  });

  it('DELETE responde 204, elimina físicamente y luego responde 404', async () => {
    const created = await createEntry({ term: 'eliminar', language: 'es', weight: 1 });
    const deleted = await request(app.getHttpServer()).delete(`/api/v1/dictionary/${created.id}`);
    const repeated = await request(app.getHttpServer()).delete(`/api/v1/dictionary/${created.id}`);

    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe('');
    expect(repeated.status).toBe(404);
    await expect(prisma.dictionaryEntry.findUnique({ where: { id: created.id } })).resolves.toBeNull();
  });

  it('publica solo las cinco operaciones, errores, DTO y limitación de seguridad', () => {
    const collection = openApi.paths['/api/v1/dictionary'];
    const detail = openApi.paths['/api/v1/dictionary/{id}'];

    expect(Object.keys(collection ?? {}).sort()).toEqual(['get', 'post']);
    expect(Object.keys(detail ?? {}).sort()).toEqual(['delete', 'get', 'patch']);
    expect(collection?.post?.responses).toEqual(
      expect.objectContaining({
        '201': expect.any(Object),
        '400': expect.any(Object),
        '409': expect.any(Object),
        '500': expect.any(Object),
      }),
    );
    expect(detail?.patch?.responses).toEqual(
      expect.objectContaining({
        '200': expect.any(Object),
        '400': expect.any(Object),
        '404': expect.any(Object),
        '409': expect.any(Object),
        '500': expect.any(Object),
      }),
    );
    expect(detail?.delete?.responses).toEqual(
      expect.objectContaining({
        '204': expect.any(Object),
        '400': expect.any(Object),
        '404': expect.any(Object),
        '500': expect.any(Object),
      }),
    );
    expect(openApi.components?.schemas).toEqual(
      expect.objectContaining({
        CreateDictionaryEntryDto: expect.any(Object),
        UpdateDictionaryEntryDto: expect.any(Object),
        DictionaryEntryResponseDto: expect.any(Object),
      }),
    );
    expect(JSON.stringify({ collection, detail })).toMatch(/sin autenticación/i);
    expect(collection?.post?.security).toBeUndefined();
    expect(openApi.components?.securitySchemes).toBeUndefined();
  });

  async function createEntry(input: {
    term: string;
    language: 'es' | 'en';
    weight: number;
  }): Promise<{ id: string; term: string; language: 'es' | 'en'; weight: number }> {
    const response = await request(app.getHttpServer()).post('/api/v1/dictionary').send(input);
    expect(response.status).toBe(201);
    return response.body as { id: string; term: string; language: 'es' | 'en'; weight: number };
  }
});
