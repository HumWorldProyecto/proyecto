import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  AUTOMATIC_CAPTURE_TIMEOUT,
  CaptureScheduler,
} from '../../src/capture/jobs/capture-scheduler';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('HU-18 -> HU-01 (integración PostgreSQL real)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let scheduler: CaptureScheduler;
  let registry: SchedulerRegistry;

  beforeAll(async () => {
    const preparation = new PrismaService();
    await preparation.$connect();
    await preparation.captureConfig.deleteMany();
    await preparation.$disconnect();

    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
    scheduler = moduleRef.get(CaptureScheduler);
    registry = moduleRef.get(SchedulerRegistry);
  });

  afterAll(async () => {
    await app.close();
    const cleanup = new PrismaService();
    await cleanup.$connect();
    await cleanup.captureConfig.deleteMany();
    await cleanup.$disconnect();
  });

  it('PUT persiste, notifica y reemplaza el futuro; el mismo PUT es no-op', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/config')
      .send({ capturePeriodicityMinutes: 30 })
      .expect(200);
    const firstRow = await prisma.captureConfig.findUniqueOrThrow({ where: { id: 'global' } });
    const firstNextAt = scheduler.getNextExecutionAt();
    const firstTimer = registry.getTimeout(AUTOMATIC_CAPTURE_TIMEOUT);

    expect(firstNextAt).toEqual(
      new Date(firstRow.updatedAt.getTime() + 30 * 60_000),
    );

    await request(app.getHttpServer())
      .put('/api/v1/config')
      .send({ capturePeriodicityMinutes: 30 })
      .expect(200);
    const identicalRow = await prisma.captureConfig.findUniqueOrThrow({ where: { id: 'global' } });

    expect(identicalRow).toEqual(firstRow);
    expect(scheduler.getNextExecutionAt()).toEqual(firstNextAt);
    expect(registry.getTimeout(AUTOMATIC_CAPTURE_TIMEOUT)).toBe(firstTimer);

    await request(app.getHttpServer())
      .put('/api/v1/config')
      .send({ capturePeriodicityMinutes: 60 })
      .expect(200);
    const changedRow = await prisma.captureConfig.findUniqueOrThrow({ where: { id: 'global' } });

    expect(scheduler.getNextExecutionAt()).toEqual(
      new Date(changedRow.updatedAt.getTime() + 60 * 60_000),
    );
    expect(registry.getTimeout(AUTOMATIC_CAPTURE_TIMEOUT)).not.toBe(firstTimer);
  });
});
