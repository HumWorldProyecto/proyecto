import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PeriodicityState } from '../../capture-config/domain/periodicity';
import {
  PERIODICITY_CHANGE_NOTIFIER_PORT,
  PeriodicityChange,
  PeriodicityChangeNotifierPort,
} from '../../capture-config/ports/periodicity-change.port';
import {
  PERIODICITY_PROVIDER_PORT,
  PeriodicityProviderPort,
} from '../../capture-config/ports/periodicity-provider.port';
import { AutomaticCaptureJob } from './automatic-capture.job';

export const AUTOMATIC_CAPTURE_TIMEOUT = 'automatic-rss-capture';
const MINUTE_MS = 60_000;

function changeKey(change: PeriodicityChange): string {
  const state =
    change.state.kind === 'configured'
      ? `configured:${change.state.minutes}`
      : 'unconfigured';
  return `${state}:${change.effectiveAt.toISOString()}`;
}

@Injectable()
export class CaptureScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CaptureScheduler.name);
  private unsubscribe?: () => void;
  private destroyed = false;
  private notificationVersion = 0;
  private lastChangeKey?: string;
  private currentState: PeriodicityState = Object.freeze({ kind: 'unconfigured' });
  private nextExecutionAt: Date | null = null;
  private timerGeneration = 0;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(PERIODICITY_PROVIDER_PORT)
    private readonly periodicityProvider: PeriodicityProviderPort,
    @Inject(PERIODICITY_CHANGE_NOTIFIER_PORT)
    private readonly notifier: PeriodicityChangeNotifierPort,
    private readonly automaticCaptureJob: AutomaticCaptureJob,
  ) {}

  async onModuleInit(): Promise<void> {
    this.destroyed = false;
    const versionBeforeInitialRead = this.notificationVersion;

    this.unsubscribe = this.notifier.subscribe((change) => {
      if (this.destroyed) {
        return;
      }
      this.notificationVersion += 1;
      return this.enqueue(() => this.applyChange(change));
    });

    try {
      const initialState = await this.periodicityProvider.getCurrentState();
      await this.enqueue(() => {
        if (this.notificationVersion === versionBeforeInitialRead) {
          this.reconcile(initialState, new Date());
        }
      });
    } catch (error) {
      this.releaseSubscription();
      throw error;
    }
  }

  onModuleDestroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.releaseSubscription();
    this.clearFutureJob();
  }

  getNextExecutionAt(): Date | null {
    return this.nextExecutionAt ? new Date(this.nextExecutionAt) : null;
  }

  private enqueue(operation: () => void | Promise<void>): Promise<void> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.catch(() => undefined);
    return result;
  }

  private applyChange(change: PeriodicityChange): void {
    if (this.destroyed) {
      return;
    }

    const key = changeKey(change);
    if (key === this.lastChangeKey) {
      return;
    }
    this.lastChangeKey = key;
    this.reconcile(change.state, change.effectiveAt);
  }

  private reconcile(state: PeriodicityState, effectiveAt: Date): void {
    this.currentState = state;
    if (state.kind === 'unconfigured') {
      this.clearFutureJob();
      return;
    }

    this.scheduleAt(this.firstFutureAt(effectiveAt, state.minutes));
  }

  private firstFutureAt(base: Date, minutes: number): Date {
    const intervalMs = minutes * MINUTE_MS;
    let timestamp = base.getTime() + intervalMs;
    const now = Date.now();

    if (timestamp <= now) {
      timestamp += (Math.floor((now - timestamp) / intervalMs) + 1) * intervalMs;
    }

    return new Date(timestamp);
  }

  private scheduleAt(nextAt: Date): void {
    this.clearFutureJob();
    const generation = this.timerGeneration;
    const delay = Math.max(0, nextAt.getTime() - Date.now());
    const timeout = setTimeout(() => {
      this.fire(generation, nextAt);
    }, delay);

    this.schedulerRegistry.addTimeout(AUTOMATIC_CAPTURE_TIMEOUT, timeout);
    this.nextExecutionAt = new Date(nextAt);
  }

  private fire(generation: number, scheduledAt: Date): void {
    if (this.destroyed || generation !== this.timerGeneration) {
      return;
    }

    this.removeRegisteredTimeout();
    if (this.currentState.kind === 'configured') {
      this.scheduleAt(this.firstFutureAt(scheduledAt, this.currentState.minutes));
    }

    void this.automaticCaptureJob.run().catch((error: unknown) => {
      this.logger.error('La captura automática terminó con un fallo inesperado', error as Error);
    });
  }

  private clearFutureJob(): void {
    this.timerGeneration += 1;
    this.removeRegisteredTimeout();
  }

  private removeRegisteredTimeout(): void {
    if (this.schedulerRegistry.doesExist('timeout', AUTOMATIC_CAPTURE_TIMEOUT)) {
      this.schedulerRegistry.deleteTimeout(AUTOMATIC_CAPTURE_TIMEOUT);
    }
    this.nextExecutionAt = null;
  }

  private releaseSubscription(): void {
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = undefined;
    unsubscribe?.();
  }
}
