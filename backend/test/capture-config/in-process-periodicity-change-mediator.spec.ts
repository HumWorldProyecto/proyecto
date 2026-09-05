import { InProcessPeriodicityChangeMediator } from '../../src/capture-config/integrations/in-process-periodicity-change-mediator';

const CHANGE = {
  state: { kind: 'configured' as const, minutes: 30 as const },
  effectiveAt: new Date('2026-09-04T12:00:00.000Z'),
};

describe('InProcessPeriodicityChangeMediator', () => {
  it('notifica a múltiples listeners síncronos y asíncronos y espera su finalización', async () => {
    const mediator = new InProcessPeriodicityChangeMediator();
    const sync = jest.fn();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const asyncListener = jest.fn(() => pending);
    mediator.subscribe(sync);
    mediator.subscribe(asyncListener);

    let completed = false;
    const publication = mediator.publish(CHANGE).then(() => {
      completed = true;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(sync).toHaveBeenCalledWith(CHANGE);
    expect(asyncListener).toHaveBeenCalledWith(CHANGE);
    expect(completed).toBe(false);
    release();
    await publication;
    expect(completed).toBe(true);
  });

  it('devuelve una desuscripción real e idempotente', async () => {
    const mediator = new InProcessPeriodicityChangeMediator();
    const listener = jest.fn();
    const unsubscribe = mediator.subscribe(listener);

    await mediator.publish(CHANGE);
    unsubscribe();
    unsubscribe();
    await mediator.publish(CHANGE);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('publica sobre un snapshot aunque un listener desuscriba a otro', async () => {
    const mediator = new InProcessPeriodicityChangeMediator();
    const second = jest.fn();
    let unsubscribeSecond: () => void = () => undefined;
    mediator.subscribe(() => unsubscribeSecond());
    unsubscribeSecond = mediator.subscribe(second);

    await mediator.publish(CHANGE);
    await mediator.publish(CHANGE);

    expect(second).toHaveBeenCalledTimes(1);
  });

  it('no traga errores inesperados de listeners', async () => {
    const mediator = new InProcessPeriodicityChangeMediator();
    mediator.subscribe(() => {
      throw new Error('listener defectuoso');
    });

    await expect(mediator.publish(CHANGE)).rejects.toThrow('listener defectuoso');
  });
});
