export class DeadlineExceededError extends Error {
  constructor() {
    super('El plazo total de la solicitud RSS se agotó');
    this.name = 'DeadlineExceededError';
  }
}

type Now = () => number;

export class RequestDeadline {
  private readonly expiresAt: number;
  private readonly controller = new AbortController();
  private readonly timer: ReturnType<typeof setTimeout>;
  private disposed = false;

  constructor(
    timeoutMs: number,
    private readonly now: Now = Date.now,
  ) {
    if (!Number.isFinite(timeoutMs) || !Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new RangeError('El deadline debe ser un entero positivo y finito');
    }

    this.expiresAt = this.now() + timeoutMs;
    this.timer = setTimeout(() => this.controller.abort(), timeoutMs);
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get expired(): boolean {
    return this.signal.aborted || this.remainingMs() <= 0;
  }

  remainingMs(): number {
    if (this.signal.aborted) {
      return 0;
    }

    return Math.max(0, Math.ceil(this.expiresAt - this.now()));
  }

  remainingOrThrow(): number {
    const remaining = this.remainingMs();
    if (remaining <= 0) {
      throw new DeadlineExceededError();
    }

    return remaining;
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    this.remainingOrThrow();

    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const finish = (callback: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        this.signal.removeEventListener('abort', onAbort);
        callback();
      };

      const onAbort = (): void => finish(() => reject(new DeadlineExceededError()));
      this.signal.addEventListener('abort', onAbort, { once: true });

      let promise: Promise<T>;
      try {
        promise = operation();
      } catch (error) {
        finish(() => reject(error));
        return;
      }

      promise.then(
        (value) => {
          if (this.expired) {
            finish(() => reject(new DeadlineExceededError()));
            return;
          }
          finish(() => resolve(value));
        },
        (error: unknown) => finish(() => reject(error)),
      );
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    clearTimeout(this.timer);
  }
}
