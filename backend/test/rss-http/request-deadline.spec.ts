import {
  DeadlineExceededError,
  RequestDeadline,
} from '../../src/rss-http/request-deadline';

describe('RequestDeadline', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza un presupuesto inválido: %p',
    (timeout) => {
      expect(() => new RequestDeadline(timeout)).toThrow(RangeError);
    },
  );

  it('informa el presupuesto restante sin reiniciarlo', () => {
    let now = 1_000;
    const deadline = new RequestDeadline(10_000, () => now);

    expect(deadline.remainingMs()).toBe(10_000);
    now += 2_750;
    expect(deadline.remainingMs()).toBe(7_250);
    expect(deadline.expired).toBe(false);

    deadline.dispose();
  });

  it('resuelve y propaga rechazos de la operación', async () => {
    const deadline = new RequestDeadline(1_000);

    await expect(deadline.run(() => Promise.resolve('ok'))).resolves.toBe('ok');
    await expect(deadline.run(() => Promise.reject(new Error('fallo')))).rejects.toThrow('fallo');

    deadline.dispose();
  });

  it('propaga una excepción síncrona de la operación', async () => {
    const deadline = new RequestDeadline(1_000);

    await expect(
      deadline.run(() => {
        throw new Error('fallo síncrono');
      }),
    ).rejects.toThrow('fallo síncrono');

    deadline.dispose();
  });

  it('rechaza una operación pendiente al vencer el deadline', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    const deadline = new RequestDeadline(100);
    const result = deadline.run(() => new Promise<string>(() => undefined));
    const expectation = expect(result).rejects.toBeInstanceOf(DeadlineExceededError);

    await jest.advanceTimersByTimeAsync(100);
    await expectation;
    expect(deadline.signal.aborted).toBe(true);
    expect(deadline.remainingMs()).toBe(0);

    deadline.dispose();
  });

  it('rechaza un resultado que llega después del plazo aunque el timer aún no se procese', async () => {
    let now = 0;
    let resolveOperation!: (value: string) => void;
    const deadline = new RequestDeadline(100, () => now);
    const result = deadline.run(
      () => new Promise<string>((resolve) => (resolveOperation = resolve)),
    );

    now = 101;
    resolveOperation('tarde');

    await expect(result).rejects.toBeInstanceOf(DeadlineExceededError);
    expect(deadline.expired).toBe(true);
    expect(() => deadline.remainingOrThrow()).toThrow(DeadlineExceededError);
    deadline.dispose();
  });

  it('limpia su timer una sola vez', () => {
    jest.useFakeTimers();
    const deadline = new RequestDeadline(100);

    expect(jest.getTimerCount()).toBe(1);
    deadline.dispose();
    deadline.dispose();
    expect(jest.getTimerCount()).toBe(0);
  });
});
