import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ALLOWED_PERIODICITY_MINUTES } from '../../src/capture-config/domain/periodicity';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('/api/v1/config (e2e, PostgreSQL real)', () => {
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
    await prisma.captureConfig.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.captureConfig.deleteMany();
  });

  it('GET sin fila devuelve null sin inventar un valor funcional', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/config');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ capturePeriodicityMinutes: null });
    await expect(prisma.captureConfig.count()).resolves.toBe(0);
  });

  it('PUT acepta los seis valores y GET devuelve cada valor persistido', async () => {
    for (const minutes of ALLOWED_PERIODICITY_MINUTES) {
      const put = await request(app.getHttpServer())
        .put('/api/v1/config')
        .send({ capturePeriodicityMinutes: minutes });
      const get = await request(app.getHttpServer()).get('/api/v1/config');

      expect(put.status).toBe(200);
      expect(put.body).toEqual({ capturePeriodicityMinutes: minutes });
      expect(get.status).toBe(200);
      expect(get.body).toEqual({ capturePeriodicityMinutes: minutes });
      await expect(prisma.captureConfig.count()).resolves.toBe(1);
    }
  });

  it.each([
    ['campo ausente', {}],
    ['null', { capturePeriodicityMinutes: null }],
    ['string', { capturePeriodicityMinutes: '30' }],
    ['boolean', { capturePeriodicityMinutes: true }],
    ['decimal', { capturePeriodicityMinutes: 30.5 }],
    ['fuera del catálogo', { capturePeriodicityMinutes: 31 }],
  ])('PUT rechaza %s con 400 y conserva el estado anterior', async (_case, body) => {
    await request(app.getHttpServer())
      .put('/api/v1/config')
      .send({ capturePeriodicityMinutes: 30 })
      .expect(200);
    const before = await prisma.captureConfig.findUniqueOrThrow({ where: { id: 'global' } });

    const rejected = await request(app.getHttpServer()).put('/api/v1/config').send(body);
    const after = await prisma.captureConfig.findUniqueOrThrow({ where: { id: 'global' } });

    expect(rejected.status).toBe(400);
    expect(after).toEqual(before);
  });

  it('PUT idéntico responde 200 sin cambiar updatedAt ni crear otra fila', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/config')
      .send({ capturePeriodicityMinutes: 60 })
      .expect(200);
    const before = await prisma.captureConfig.findUniqueOrThrow({ where: { id: 'global' } });

    const response = await request(app.getHttpServer())
      .put('/api/v1/config')
      .send({ capturePeriodicityMinutes: 60 });
    const after = await prisma.captureConfig.findUniqueOrThrow({ where: { id: 'global' } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ capturePeriodicityMinutes: 60 });
    expect(after).toEqual(before);
    await expect(prisma.captureConfig.count()).resolves.toBe(1);
  });

  it('publica GET/PUT, catálogo, schemas y respuestas principales en OpenAPI', () => {
    const path = openApi.paths['/api/v1/config'];

    expect(Object.keys(path ?? {}).sort()).toEqual(['get', 'put']);
    expect(path?.get?.responses).toEqual(
      expect.objectContaining({ '200': expect.any(Object) }),
    );
    expect(path?.put?.responses).toEqual(
      expect.objectContaining({ '200': expect.any(Object), '400': expect.any(Object) }),
    );
    expect(openApi.components?.schemas).toEqual(
      expect.objectContaining({
        UpdateCaptureConfigDto: expect.objectContaining({
          properties: expect.objectContaining({
            capturePeriodicityMinutes: expect.objectContaining({
              enum: [...ALLOWED_PERIODICITY_MINUTES],
            }),
          }),
        }),
        CaptureConfigResponseDto: expect.any(Object),
      }),
    );
  });
});
