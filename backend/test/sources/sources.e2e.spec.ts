import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SourceAccessibilityError } from '../../src/sources/errors/source-accessibility.error';
import { SourceAccessibilityChecker } from '../../src/sources/integrations/source-accessibility-checker';

describe('/api/v1/sources (e2e, PostgreSQL real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let openApi: OpenAPIObject;
  const assertAccessible = jest.fn(async (url: string) => {
    if (url.includes('unreachable.example')) {
      throw new SourceAccessibilityError(
        'NETWORK',
        'detalle de red que no debe exponerse',
        new Error('resolved private address 10.0.0.8'),
      );
    }
    return url;
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SourceAccessibilityChecker)
      .useValue({ assertAccessible })
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

  afterAll(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
  });

  it('POST crea con 201, normaliza la URL y GET recupera colección y detalle', async () => {
    const creation = await request(app.getHttpServer())
      .post('/api/v1/sources')
      .send({ url: '  https://example.com/feed  ' });

    expect(creation.status).toBe(201);
    expect(creation.body).toMatchObject({
      id: expect.any(String),
      url: 'https://example.com/feed',
      active: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const collection = await request(app.getHttpServer()).get('/api/v1/sources');
    const detail = await request(app.getHttpServer()).get(`/api/v1/sources/${creation.body.id}`);

    expect(collection.status).toBe(200);
    expect(collection.body).toEqual([creation.body]);
    expect(detail.status).toBe(200);
    expect(detail.body).toEqual(creation.body);
  });

  it('POST responde 400/409 y no persiste entradas rechazadas', async () => {
    expect(
      (await request(app.getHttpServer()).post('/api/v1/sources').send({ url: 'not a url' })).status,
    ).toBe(400);
    const inaccessible = await request(app.getHttpServer())
      .post('/api/v1/sources')
      .send({ url: 'https://unreachable.example/feed' });
    expect(inaccessible.status).toBe(400);
    expect(JSON.stringify(inaccessible.body)).not.toMatch(/10\.0\.0\.8|detalle de red/);
    await expect(prisma.rssSource.count()).resolves.toBe(0);

    await createSource('https://duplicate.example/feed');
    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/sources')
      .send({ url: 'https://duplicate.example/feed' });
    expect(duplicate.status).toBe(409);
    await expect(prisma.rssSource.count()).resolves.toBe(1);
  });

  it('GET lista todo, filtra true/false estrictamente y responde 400/404', async () => {
    const active = await createSource('https://active.example/feed');
    const inactive = await createSource('https://inactive.example/feed');
    await prisma.rssSource.update({ where: { id: inactive.id }, data: { active: false } });

    const all = await request(app.getHttpServer()).get('/api/v1/sources');
    const activeOnly = await request(app.getHttpServer()).get('/api/v1/sources?active=true');
    const inactiveOnly = await request(app.getHttpServer()).get('/api/v1/sources?active=false');
    const invalid = await request(app.getHttpServer()).get('/api/v1/sources?active=1');
    const missing = await request(app.getHttpServer()).get('/api/v1/sources/missing');

    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(2);
    expect(activeOnly.status).toBe(200);
    expect(activeOnly.body.map((item: { id: string }) => item.id)).toEqual([active.id]);
    expect(inactiveOnly.status).toBe(200);
    expect(inactiveOnly.body.map((item: { id: string }) => item.id)).toEqual([inactive.id]);
    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
  });

  it('PUT reemplaza URL y conserva persistencia ante rechazos 400/409', async () => {
    const first = await createSource('https://first.example/feed');
    await createSource('https://occupied.example/feed');

    const replaced = await request(app.getHttpServer())
      .put(`/api/v1/sources/${first.id}`)
      .send({ url: ' https://replacement.example/feed ' });
    expect(replaced.status).toBe(200);
    expect(replaced.body).toMatchObject({ id: first.id, url: 'https://replacement.example/feed' });

    const inaccessible = await request(app.getHttpServer())
      .put(`/api/v1/sources/${first.id}`)
      .send({ url: 'https://unreachable.example/feed' });
    const duplicate = await request(app.getHttpServer())
      .put(`/api/v1/sources/${first.id}`)
      .send({ url: 'https://occupied.example/feed' });
    const missing = await request(app.getHttpServer())
      .put('/api/v1/sources/missing')
      .send({ url: 'https://valid.example/feed' });

    expect(inaccessible.status).toBe(400);
    expect(duplicate.status).toBe(409);
    expect(missing.status).toBe(404);
    await expect(prisma.rssSource.findUnique({ where: { id: first.id } })).resolves.toMatchObject({
      url: 'https://replacement.example/feed',
      active: true,
    });
  });

  it('PATCH valida cuerpo, cambia URL/estado atómicamente y reactiva sin accesibilidad', async () => {
    const created = await createSource('https://patch.example/feed');
    expect(
      (await request(app.getHttpServer()).patch(`/api/v1/sources/${created.id}`).send({})).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/sources/${created.id}`)
          .send({ url: null, active: null })
      ).status,
    ).toBe(400);

    const rejected = await request(app.getHttpServer())
      .patch(`/api/v1/sources/${created.id}`)
      .send({ url: 'https://unreachable.example/feed', active: false });
    expect(rejected.status).toBe(400);
    await expect(prisma.rssSource.findUnique({ where: { id: created.id } })).resolves.toMatchObject({
      url: 'https://patch.example/feed',
      active: true,
    });

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/sources/${created.id}`)
      .send({ url: 'https://updated.example/feed', active: false });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ url: 'https://updated.example/feed', active: false });

    assertAccessible.mockClear();
    const reactivated = await request(app.getHttpServer())
      .patch(`/api/v1/sources/${created.id}`)
      .send({ active: true });
    expect(reactivated.status).toBe(200);
    expect(reactivated.body.active).toBe(true);
    expect(assertAccessible).not.toHaveBeenCalled();
  });

  it('DELETE desactiva con 204, es idempotente y responde 404 si no existe', async () => {
    const created = await createSource('https://delete.example/feed');

    const first = await request(app.getHttpServer()).delete(`/api/v1/sources/${created.id}`);
    const second = await request(app.getHttpServer()).delete(`/api/v1/sources/${created.id}`);
    const missing = await request(app.getHttpServer()).delete('/api/v1/sources/missing');

    expect(first.status).toBe(204);
    expect(first.text).toBe('');
    expect(second.status).toBe(204);
    expect(second.text).toBe('');
    expect(missing.status).toBe(404);
    await expect(prisma.rssSource.findUnique({ where: { id: created.id } })).resolves.toMatchObject({
      active: false,
    });
  });

  it('publica las seis operaciones y sus respuestas principales en OpenAPI', () => {
    const collection = openApi.paths['/api/v1/sources'];
    const detail = openApi.paths['/api/v1/sources/{id}'];

    expect(Object.keys(collection ?? {}).sort()).toEqual(['get', 'post']);
    expect(Object.keys(detail ?? {}).sort()).toEqual(['delete', 'get', 'patch', 'put']);
    expect(collection?.get?.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'active', in: 'query' })]),
    );
    expect(collection?.post?.responses).toEqual(
      expect.objectContaining({ '201': expect.any(Object), '400': expect.any(Object), '409': expect.any(Object) }),
    );
    expect(detail?.put?.responses).toEqual(
      expect.objectContaining({ '200': expect.any(Object), '400': expect.any(Object), '404': expect.any(Object), '409': expect.any(Object) }),
    );
    expect(detail?.patch?.responses).toEqual(
      expect.objectContaining({ '200': expect.any(Object), '400': expect.any(Object), '404': expect.any(Object), '409': expect.any(Object) }),
    );
    expect(detail?.delete?.responses).toEqual(
      expect.objectContaining({ '204': expect.any(Object), '404': expect.any(Object) }),
    );
    expect(openApi.components?.schemas).toEqual(
      expect.objectContaining({
        CreateSourceDto: expect.any(Object),
        ReplaceSourceDto: expect.any(Object),
        UpdateSourceDto: expect.any(Object),
        SourceResponseDto: expect.any(Object),
      }),
    );
  });

  async function createSource(url: string): Promise<{ id: string; url: string }> {
    const response = await request(app.getHttpServer()).post('/api/v1/sources').send({ url });
    expect(response.status).toBe(201);
    return response.body as { id: string; url: string };
  }
});
