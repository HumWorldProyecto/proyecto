import { ALLOWED_PERIODICITY_MINUTES } from '../../src/capture-config/domain/periodicity';
import { PeriodicityInputError } from '../../src/capture-config/errors/periodicity.error';
import { PeriodicityChangePublisherPort } from '../../src/capture-config/ports/periodicity-change.port';
import { PeriodicityRepositoryPort } from '../../src/capture-config/ports/periodicity-repository.port';
import { CaptureConfigService } from '../../src/capture-config/services/capture-config.service';

const EFFECTIVE_AT = new Date('2026-09-04T12:34:56.789Z');

function repositoryMock(): jest.Mocked<PeriodicityRepositoryPort> {
  return { getCurrent: jest.fn(), save: jest.fn() };
}

describe('CaptureConfigService', () => {
  let repository: jest.Mocked<PeriodicityRepositoryPort>;
  let publisher: jest.Mocked<PeriodicityChangePublisherPort>;
  let service: CaptureConfigService;

  beforeEach(() => {
    repository = repositoryMock();
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new CaptureConfigService(repository, publisher);
  });

  it('devuelve el estado vigente configurado o sin configurar', async () => {
    repository.getCurrent
      .mockResolvedValueOnce({ state: { kind: 'unconfigured' }, updatedAt: null })
      .mockResolvedValueOnce({
        state: { kind: 'configured', minutes: 30 },
        updatedAt: EFFECTIVE_AT,
      });

    await expect(service.getCurrentState()).resolves.toEqual({ kind: 'unconfigured' });
    await expect(service.getCurrentState()).resolves.toEqual({
      kind: 'configured',
      minutes: 30,
    });
  });

  it.each(ALLOWED_PERIODICITY_MINUTES)('configura el valor válido %s', async (minutes) => {
    repository.getCurrent.mockResolvedValue({ state: { kind: 'unconfigured' }, updatedAt: null });
    repository.save.mockResolvedValue({
      state: { kind: 'configured', minutes },
      updatedAt: EFFECTIVE_AT,
    });

    await expect(service.configure(minutes)).resolves.toEqual({
      kind: 'configured',
      minutes,
    });
    expect(repository.save).toHaveBeenCalledWith(minutes);
    expect(publisher.publish).toHaveBeenCalledWith({
      state: { kind: 'configured', minutes },
      effectiveAt: EFFECTIVE_AT,
    });
  });

  it.each([undefined, null, '30', true, 30.5, 0, 31, 1450])(
    'rechaza %p sin leer, escribir ni publicar',
    async (value) => {
      await expect(service.configure(value)).rejects.toBeInstanceOf(PeriodicityInputError);
      expect(repository.getCurrent).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(publisher.publish).not.toHaveBeenCalled();
    },
  );

  it('persiste antes de publicar y usa el updatedAt confirmado como effectiveAt', async () => {
    const events: string[] = [];
    repository.getCurrent.mockResolvedValue({
      state: { kind: 'configured', minutes: 15 },
      updatedAt: new Date('2026-09-04T11:00:00.000Z'),
    });
    repository.save.mockImplementation(async () => {
      events.push('persisted');
      return {
        state: { kind: 'configured', minutes: 30 },
        updatedAt: EFFECTIVE_AT,
      };
    });
    publisher.publish.mockImplementation(async (change) => {
      events.push('published');
      expect(change.effectiveAt).toEqual(EFFECTIVE_AT);
      expect(change.effectiveAt).not.toBe(EFFECTIVE_AT);
    });

    await service.configure(30);

    expect(events).toEqual(['persisted', 'published']);
  });

  it('repetir el valor vigente es un no-op sin escritura, updatedAt nuevo ni notificación', async () => {
    const original = {
      state: { kind: 'configured' as const, minutes: 360 as const },
      updatedAt: EFFECTIVE_AT,
    };
    repository.getCurrent.mockResolvedValue(original);

    await expect(service.configure(360)).resolves.toBe(original.state);
    expect(repository.save).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(original.updatedAt).toBe(EFFECTIVE_AT);
  });

  it('no publica cuando falla la persistencia', async () => {
    repository.getCurrent.mockResolvedValue({ state: { kind: 'unconfigured' }, updatedAt: null });
    repository.save.mockRejectedValue(new Error('detalle Prisma'));

    await expect(service.configure(30)).rejects.toThrow('detalle Prisma');
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('espera a que publish termine antes de devolver', async () => {
    let release!: () => void;
    const listenerPending = new Promise<void>((resolve) => {
      release = resolve;
    });
    repository.getCurrent.mockResolvedValue({ state: { kind: 'unconfigured' }, updatedAt: null });
    repository.save.mockResolvedValue({
      state: { kind: 'configured', minutes: 30 },
      updatedAt: EFFECTIVE_AT,
    });
    publisher.publish.mockReturnValue(listenerPending);

    let completed = false;
    const result = service.configure(30).then(() => {
      completed = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(completed).toBe(false);

    release();
    await result;
    expect(completed).toBe(true);
  });
});
