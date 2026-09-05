import { SchedulerRegistry } from '@nestjs/schedule';
import {
  configuredPeriodicity,
  PeriodicityState,
  unconfiguredPeriodicity,
} from '../../src/capture-config/domain/periodicity';
import { InProcessPeriodicityChangeMediator } from '../../src/capture-config/integrations/in-process-periodicity-change-mediator';
import { PeriodicityProviderPort } from '../../src/capture-config/ports/periodicity-provider.port';
import { AutomaticCaptureJob } from '../../src/capture/jobs/automatic-capture.job';
import {
  AUTOMATIC_CAPTURE_TIMEOUT,
  CaptureScheduler,
} from '../../src/capture/jobs/capture-scheduler';
import { CaptureOrchestratorService } from '../../src/capture/services/capture-orchestrator.service';

const NOW = new Date('2026-09-04T12:00:00.000Z');

describe('CaptureScheduler', () => {
  const schedulers: CaptureScheduler[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    schedulers.splice(0).forEach((scheduler) => scheduler.onModuleDestroy());
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('startup unconfigured deja cero jobs futuros', async () => {
    const { scheduler, registry } = createScheduler(unconfiguredPeriodicity());

    await scheduler.onModuleInit();

    expect(registry.getTimeouts()).toEqual([]);
    expect(scheduler.getNextExecutionAt()).toBeNull();
  });

  it('startup configured registra exactamente un job futuro', async () => {
    const { scheduler, registry } = createScheduler(configuredPeriodicity(15));

    await scheduler.onModuleInit();

    expect(registry.getTimeouts()).toEqual([AUTOMATIC_CAPTURE_TIMEOUT]);
    expect(scheduler.getNextExecutionAt()).toEqual(
      new Date(NOW.getTime() + 15 * 60_000),
    );
  });

  it('configured reemplaza solo el futuro y usa effectiveAt + minutes', async () => {
    const { scheduler, registry, mediator } = createScheduler(configuredPeriodicity(15));
    await scheduler.onModuleInit();
    const previousTimer = registry.getTimeout(AUTOMATIC_CAPTURE_TIMEOUT);
    const effectiveAt = new Date(NOW.getTime() + 5_000);

    await mediator.publish({ state: configuredPeriodicity(30), effectiveAt });

    expect(registry.getTimeouts()).toEqual([AUTOMATIC_CAPTURE_TIMEOUT]);
    expect(registry.getTimeout(AUTOMATIC_CAPTURE_TIMEOUT)).not.toBe(previousTimer);
    expect(scheduler.getNextExecutionAt()).toEqual(
      new Date(effectiveAt.getTime() + 30 * 60_000),
    );
  });

  it('unconfigured elimina el futuro sin crear otro', async () => {
    const { scheduler, registry, mediator } = createScheduler(configuredPeriodicity(15));
    await scheduler.onModuleInit();

    await mediator.publish({ state: unconfiguredPeriodicity(), effectiveAt: NOW });

    expect(registry.getTimeouts()).toEqual([]);
    expect(scheduler.getNextExecutionAt()).toBeNull();
  });

  it('una notificación idéntica no duplica ni mueve el próximo job', async () => {
    const { scheduler, registry, mediator } = createScheduler(unconfiguredPeriodicity());
    await scheduler.onModuleInit();
    const change = { state: configuredPeriodicity(30), effectiveAt: NOW };
    await mediator.publish(change);
    const timer = registry.getTimeout(AUTOMATIC_CAPTURE_TIMEOUT);
    const nextAt = scheduler.getNextExecutionAt();

    await mediator.publish(change);

    expect(registry.getTimeout(AUTOMATIC_CAPTURE_TIMEOUT)).toBe(timer);
    expect(scheduler.getNextExecutionAt()).toEqual(nextAt);
  });

  it('se suscribe antes de leer y no sobrescribe un cambio nuevo con una lectura inicial vieja', async () => {
    let resolveInitial!: (state: PeriodicityState) => void;
    const provider: PeriodicityProviderPort = {
      getCurrentState: jest.fn(
        () => new Promise<PeriodicityState>((resolve) => (resolveInitial = resolve)),
      ),
    };
    const mediator = new InProcessPeriodicityChangeMediator();
    const registry = new SchedulerRegistry();
    const scheduler = track(
      new CaptureScheduler(registry, provider, mediator, mockAutomaticJob()),
    );

    const initialization = scheduler.onModuleInit();
    await Promise.resolve();
    await mediator.publish({ state: configuredPeriodicity(60), effectiveAt: NOW });
    resolveInitial(unconfiguredPeriodicity());
    await initialization;

    expect(scheduler.getNextExecutionAt()).toEqual(
      new Date(NOW.getTime() + 60 * 60_000),
    );
    expect(registry.getTimeouts()).toEqual([AUTOMATIC_CAPTURE_TIMEOUT]);
  });

  it('desuscribe una sola vez, elimina el job y rechaza cambios posteriores al destroy', async () => {
    const unsubscribe = jest.fn();
    let listener:
      | ((change: { state: PeriodicityState; effectiveAt: Date }) => void | Promise<void>)
      | undefined;
    const notifier = {
      subscribe: jest.fn((value: typeof listener) => {
        listener = value;
        return unsubscribe;
      }),
    };
    const registry = new SchedulerRegistry();
    const scheduler = track(
      new CaptureScheduler(
        registry,
        { getCurrentState: jest.fn().mockResolvedValue(configuredPeriodicity(15)) },
        notifier,
        mockAutomaticJob(),
      ),
    );
    await scheduler.onModuleInit();

    scheduler.onModuleDestroy();
    scheduler.onModuleDestroy();
    await listener?.({ state: configuredPeriodicity(30), effectiveAt: NOW });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(registry.getTimeouts()).toEqual([]);
    expect(scheduler.getNextExecutionAt()).toBeNull();
  });

  it('mantiene la cadencia, omite el tick solapado sin cola y permite el posterior', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => (release = resolve));
    const runCapture = jest
      .fn()
      .mockImplementationOnce(() => pending)
      .mockResolvedValueOnce(undefined);
    const job = new AutomaticCaptureJob({ runCapture } as unknown as CaptureOrchestratorService);
    const { scheduler } = createScheduler(configuredPeriodicity(15), job);
    await scheduler.onModuleInit();

    await jest.advanceTimersByTimeAsync(15 * 60_000);
    expect(runCapture).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(15 * 60_000);
    expect(runCapture).toHaveBeenCalledTimes(1);

    release();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(15 * 60_000);
    expect(runCapture).toHaveBeenCalledTimes(2);
  });

  it('reprograma el futuro sin cancelar una captura en curso', async () => {
    let release!: () => void;
    let completed = false;
    const pending = new Promise<void>((resolve) => (release = resolve)).then(() => {
      completed = true;
    });
    const runCapture = jest.fn().mockReturnValue(pending);
    const job = new AutomaticCaptureJob({ runCapture } as unknown as CaptureOrchestratorService);
    const { scheduler, mediator } = createScheduler(configuredPeriodicity(15), job);
    await scheduler.onModuleInit();
    await jest.advanceTimersByTimeAsync(15 * 60_000);

    const effectiveAt = new Date(Date.now());
    await mediator.publish({ state: configuredPeriodicity(30), effectiveAt });

    expect(completed).toBe(false);
    expect(scheduler.getNextExecutionAt()).toEqual(
      new Date(effectiveAt.getTime() + 30 * 60_000),
    );
    release();
    await pending;
  });

  function createScheduler(initial: PeriodicityState, job = mockAutomaticJob()) {
    const registry = new SchedulerRegistry();
    const mediator = new InProcessPeriodicityChangeMediator();
    const provider: PeriodicityProviderPort = {
      getCurrentState: jest.fn().mockResolvedValue(initial),
    };
    const scheduler = track(new CaptureScheduler(registry, provider, mediator, job));
    return { scheduler, registry, mediator, provider };
  }

  function track(scheduler: CaptureScheduler): CaptureScheduler {
    schedulers.push(scheduler);
    return scheduler;
  }
});

function mockAutomaticJob(): AutomaticCaptureJob {
  return { run: jest.fn().mockResolvedValue(true) } as unknown as AutomaticCaptureJob;
}
