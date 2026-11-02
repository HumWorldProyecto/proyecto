import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { LifecycleService, requireDays } from '../../src/purge/lifecycle.service';
import { LifecycleConflictError, LifecycleInputError } from '../../src/purge/lifecycle.errors';
import { AutomaticPurgeJob, AUTOMATIC_PURGE_JOB, PURGE_INTERVAL_MS } from '../../src/purge/automatic-purge.job';
import { ChannelInputError, ChannelNotFoundError, ChannelRepository } from '../../src/channels/channel.port';
import { ChannelsService, requireChannelName } from '../../src/channels/channels.service';

const now = new Date('2026-10-31T12:00:00.000Z');
function fixture(days: number | null = 7) {
  const repository = {
    getPolicy: jest.fn().mockResolvedValue({ retentionDays: days }),
    savePolicy: jest.fn(async (retentionDays) => ({ retentionDays })),
    count: jest.fn().mockResolvedValue({ totalCount: 3, expiredCount: 1 }),
    deleteBefore: jest.fn().mockResolvedValue(1),
  };
  return { repository, service: new LifecycleService(repository, { now: () => new Date(now) }) };
}
describe('Ciclo de vida: unitarias sin HTTP/DB', () => {
  it.each([undefined, -1, 0, 1.2, '7', true, 36501, NaN, Infinity])('rechaza periodo inválido %s', (value) => {
    expect(() => requireDays(value)).toThrow(LifecycleInputError);
  });
  it.each([1, 7, 36500, null])('acepta periodo %s', (value) => expect(requireDays(value)).toBe(value));
  it('configurar conserva idempotencia, permite null y no altera la captura', async () => {
    const { service, repository } = fixture();
    expect(await service.configure(7)).toEqual({ retentionDays: 7 });
    expect(repository.savePolicy).not.toHaveBeenCalled();
    expect(await service.configure(null)).toEqual({ retentionDays: null });
    expect(repository.savePolicy).toHaveBeenCalledWith(null);
  });
  it('preview calcula el umbral desde captura y no borra', async () => {
    const { service, repository } = fixture();
    expect(await service.preview()).toEqual({ retentionDays: 7, cutoff: '2026-10-24T12:00:00.000Z',
      evaluatedAt: now.toISOString(), totalCount: 3, expiredCount: 1 });
    expect(repository.count).toHaveBeenCalledWith(new Date('2026-10-24T12:00:00.000Z'));
    expect(repository.deleteBefore).not.toHaveBeenCalled();
  });
  it('sin configurar el automático omite, manual rechaza y preview no inventa umbral', async () => {
    const { service, repository } = fixture(null);
    expect(await service.purge({ automatic: true })).toMatchObject({ skipped: true, deletedCount: 0, cutoff: null });
    await expect(service.purge({ expectedRetentionDays: 7 })).rejects.toThrow(LifecycleConflictError);
    expect(await service.preview()).toMatchObject({ retentionDays: null, cutoff: null });
    expect(repository.count).toHaveBeenCalledWith(null);
    expect(repository.deleteBefore).not.toHaveBeenCalled();
  });
  it('política desactualizada rechaza y manual/automático reutilizan criterio', async () => {
    const { service, repository } = fixture();
    await expect(service.purge({ expectedRetentionDays: 3 })).rejects.toThrow(LifecycleConflictError);
    expect(repository.deleteBefore).not.toHaveBeenCalled();
    expect(await service.purge({ expectedRetentionDays: 7 })).toMatchObject({ deletedCount: 1, skipped: false });
    await service.purge({ automatic: true });
    expect(repository.deleteBefore).toHaveBeenNthCalledWith(1, new Date('2026-10-24T12:00:00.000Z'));
    expect(repository.deleteBefore).toHaveBeenNthCalledWith(2, new Date('2026-10-24T12:00:00.000Z'));
  });
  it('evita simultaneidad con configurar/purgar y libera al fallar', async () => {
    const { service, repository } = fixture();
    let reject!: (error: Error) => void;
    repository.deleteBefore.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    const first = service.purge({ automatic: true });
    await Promise.resolve(); await Promise.resolve();
    await expect(service.purge({ automatic: true })).rejects.toThrow(LifecycleConflictError);
    await expect(service.configure(10)).rejects.toThrow(LifecycleConflictError);
    reject(new Error('fallo inyectado'));
    await expect(first).rejects.toThrow('fallo inyectado');
    expect(await service.purge({ automatic: true })).toMatchObject({ deletedCount: 1 });
  });
});

describe('Purgado: integración con el scheduler ratificado, reloj simulado y sin DB', () => {
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  it('registra intervalo, ejecuta tras una hora, tolera fallo y cancela al cerrar', async () => {
    jest.useFakeTimers(); jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const purge = jest.fn().mockRejectedValueOnce(new Error('simulado')).mockResolvedValue({ deletedCount: 0 });
    const moduleRef = await Test.createTestingModule({ imports: [ScheduleModule.forRoot()], providers: [
      AutomaticPurgeJob, { provide: LifecycleService, useValue: { purge } },
    ] }).compile();
    const app = moduleRef.createNestApplication(); await app.init();
    expect(moduleRef.get(SchedulerRegistry).getIntervals()).toContain(AUTOMATIC_PURGE_JOB);
    await jest.advanceTimersByTimeAsync(PURGE_INTERVAL_MS);
    expect(purge).toHaveBeenCalledWith({ automatic: true });
    await jest.advanceTimersByTimeAsync(PURGE_INTERVAL_MS);
    expect(purge).toHaveBeenCalledTimes(2);
    await app.close(); await jest.advanceTimersByTimeAsync(PURGE_INTERVAL_MS);
    expect(purge).toHaveBeenCalledTimes(2);
  });
});

describe('Medios: unitarias', () => {
  it.each([undefined, '', '   ', 'x'.repeat(121), 4])('rechaza nombre inválido', (name) => {
    expect(() => requireChannelName(name)).toThrow(ChannelInputError);
  });
  it('normaliza y coordina el puerto sin dependencias HTTP/Prisma', async () => {
    const repository = { list: jest.fn().mockResolvedValue([]), find: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'c' }), rename: jest.fn(), remove: jest.fn(), attach: jest.fn(), detach: jest.fn() };
    const service = new ChannelsService(repository as unknown as ChannelRepository);
    expect(await service.list()).toEqual([]);
    await expect(service.find('missing')).rejects.toThrow(ChannelNotFoundError);
    repository.find.mockResolvedValue({ id: 'c' } as never);
    expect(await service.find('c')).toEqual({ id: 'c' });
    await service.create('  Medio  '); expect(repository.create).toHaveBeenCalledWith('Medio');
    await service.rename('c', ' Nuevo '); expect(repository.rename).toHaveBeenCalledWith('c', 'Nuevo');
    await service.remove('c'); await service.attach('c', 's'); await service.detach('c', 's');
    expect(repository.remove).toHaveBeenCalledWith('c');
    expect(repository.attach).toHaveBeenCalledWith('c', 's'); expect(repository.detach).toHaveBeenCalledWith('c', 's');
  });
});
