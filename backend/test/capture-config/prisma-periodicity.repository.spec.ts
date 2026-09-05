import { CaptureConfig } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PeriodicityConfigurationError } from '../../src/capture-config/errors/periodicity.error';
import { PrismaPeriodicityRepository } from '../../src/capture-config/repositories/prisma-periodicity.repository';

const UPDATED_AT = new Date('2026-09-04T12:00:00.000Z');

function row(value: number | null): CaptureConfig {
  return {
    id: 'global',
    capturePeriodicityMinutes: value,
    updatedAt: UPDATED_AT,
  };
}

describe('PrismaPeriodicityRepository', () => {
  const findUnique = jest.fn();
  const upsert = jest.fn();
  const prisma = { captureConfig: { findUnique, upsert } } as unknown as PrismaService;
  const repository = new PrismaPeriodicityRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['fila ausente', null],
    ['fila con null', row(null)],
  ])('mapea %s a unconfigured', async (_case, stored) => {
    findUnique.mockResolvedValue(stored);

    await expect(repository.getCurrent()).resolves.toEqual({
      state: { kind: 'unconfigured' },
      updatedAt: stored ? UPDATED_AT : null,
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'global' } });
  });

  it('mapea una fila válida a configured', async () => {
    findUnique.mockResolvedValue(row(30));

    await expect(repository.getCurrent()).resolves.toEqual({
      state: { kind: 'configured', minutes: 30 },
      updatedAt: UPDATED_AT,
    });
  });

  it('trata un valor persistido fuera del catálogo como inconsistencia interna', async () => {
    findUnique.mockResolvedValue(row(17));
    await expect(repository.getCurrent()).rejects.toBeInstanceOf(
      PeriodicityConfigurationError,
    );
  });

  it('hace upsert únicamente sobre el singleton global y devuelve updatedAt confirmado', async () => {
    upsert.mockResolvedValue(row(60));

    await expect(repository.save(60)).resolves.toEqual({
      state: { kind: 'configured', minutes: 60 },
      updatedAt: UPDATED_AT,
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'global' },
      create: { id: 'global', capturePeriodicityMinutes: 60 },
      update: { capturePeriodicityMinutes: 60 },
    });
  });

  it('rechaza defensivamente un resultado de escritura inconsistente', async () => {
    upsert.mockResolvedValue(row(null));
    await expect(repository.save(30)).rejects.toBeInstanceOf(PeriodicityConfigurationError);
  });
});
