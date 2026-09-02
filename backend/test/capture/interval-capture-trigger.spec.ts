import { IntervalCaptureTrigger } from '../../src/capture/jobs/interval-capture-trigger';
import { PeriodicityProviderPort } from '../../src/capture/ports/periodicity-provider.port';

describe('IntervalCaptureTrigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('usa la periodicidad suministrada para determinar el siguiente instante y dispara la ejecución al alcanzarlo', async () => {
    const periodicityProvider: PeriodicityProviderPort = {
      getPeriodicityMs: jest.fn().mockResolvedValue(1000),
    };
    const trigger = new IntervalCaptureTrigger(periodicityProvider);
    const onTrigger = jest.fn().mockResolvedValue(undefined);

    trigger.start(onTrigger);
    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(999);
    expect(onTrigger).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();

    expect(onTrigger).toHaveBeenCalledTimes(1);

    trigger.stop();
  });

  it('detiene el disparo cuando se invoca stop()', async () => {
    const periodicityProvider: PeriodicityProviderPort = {
      getPeriodicityMs: jest.fn().mockResolvedValue(100),
    };
    const trigger = new IntervalCaptureTrigger(periodicityProvider);
    const onTrigger = jest.fn().mockResolvedValue(undefined);

    trigger.start(onTrigger);
    await Promise.resolve();
    await Promise.resolve();
    trigger.stop();

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('detiene el disparo mediante onModuleDestroy()', async () => {
    const periodicityProvider: PeriodicityProviderPort = {
      getPeriodicityMs: jest.fn().mockResolvedValue(100),
    };
    const trigger = new IntervalCaptureTrigger(periodicityProvider);
    const onTrigger = jest.fn().mockResolvedValue(undefined);

    trigger.start(onTrigger);
    await Promise.resolve();
    await Promise.resolve();
    trigger.onModuleDestroy();

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('no reprograma una nueva ejecución si se detiene mientras la ejecución en curso todavía se está resolviendo', async () => {
    const periodicityProvider: PeriodicityProviderPort = {
      getPeriodicityMs: jest.fn().mockResolvedValue(100),
    };
    const trigger = new IntervalCaptureTrigger(periodicityProvider);
    const onTrigger = jest.fn().mockImplementation(async () => {
      trigger.stop();
    });

    trigger.start(onTrigger);
    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(periodicityProvider.getPeriodicityMs).toHaveBeenCalledTimes(1);
  });
});
