import { InProcessPeriodicityChangeMediator } from '../../src/capture-config/integrations/in-process-periodicity-change-mediator';
import { PrismaPeriodicityRepository } from '../../src/capture-config/repositories/prisma-periodicity.repository';
import { CaptureConfigService } from '../../src/capture-config/services/capture-config.service';
import { PeriodicityConfigurationError } from '../../src/capture-config/errors/periodicity.error';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('PrismaPeriodicityRepository (integración, PostgreSQL real)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaPeriodicityRepository(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.captureConfig.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.captureConfig.deleteMany();
  });

  it('mapea la ausencia de fila y una fila null al estado sin configurar', async () => {
    await expect(repository.getCurrent()).resolves.toEqual({
      state: { kind: 'unconfigured' },
      updatedAt: null,
    });

    const row = await prisma.captureConfig.create({
      data: { id: 'global', capturePeriodicityMinutes: null },
    });
    await expect(repository.getCurrent()).resolves.toEqual({
      state: { kind: 'unconfigured' },
      updatedAt: row.updatedAt,
    });
  });

  it('el primer upsert crea global y los cambios posteriores conservan una sola fila', async () => {
    const first = await repository.save(15);
    await prisma.captureConfig.update({
      where: { id: 'global' },
      data: { updatedAt: new Date('2020-01-01T00:00:00.000Z') },
    });
    const second = await repository.save(30);

    expect(first.state).toEqual({ kind: 'configured', minutes: 15 });
    expect(second.state).toEqual({ kind: 'configured', minutes: 30 });
    expect(second.updatedAt.getTime()).toBeGreaterThan(
      new Date('2020-01-01T00:00:00.000Z').getTime(),
    );
    await expect(prisma.captureConfig.count()).resolves.toBe(1);
    await expect(prisma.captureConfig.findMany()).resolves.toEqual([
      expect.objectContaining({ id: 'global', capturePeriodicityMinutes: 30 }),
    ]);
    await expect(repository.getCurrent()).resolves.toEqual(second);
  });

  it('un PUT idéntico mediante el servicio no escribe, no notifica y conserva updatedAt', async () => {
    await repository.save(360);
    const before = await prisma.captureConfig.findUniqueOrThrow({ where: { id: 'global' } });
    const mediator = new InProcessPeriodicityChangeMediator();
    const listener = jest.fn();
    mediator.subscribe(listener);
    const save = jest.spyOn(repository, 'save');
    const service = new CaptureConfigService(repository, mediator);

    await expect(service.configure(360)).resolves.toEqual({
      kind: 'configured',
      minutes: 360,
    });

    const after = await prisma.captureConfig.findUniqueOrThrow({ where: { id: 'global' } });
    expect(save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(after).toEqual(before);
    await expect(prisma.captureConfig.count()).resolves.toBe(1);
  });

  it('no corrige silenciosamente un valor persistido fuera del catálogo', async () => {
    await prisma.captureConfig.create({
      data: { id: 'global', capturePeriodicityMinutes: 17 },
    });

    await expect(repository.getCurrent()).rejects.toBeInstanceOf(
      PeriodicityConfigurationError,
    );
  });
});
