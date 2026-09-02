import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { CaptureTriggerPort } from '../ports/capture-trigger.port';
import { PERIODICITY_PROVIDER_PORT, PeriodicityProviderPort } from '../ports/periodicity-provider.port';

/**
 * Disparador mínimo basado en temporizadores nativos. La tecnología concreta
 * de scheduling permanece pendiente (ver design.md); este adaptador solo
 * traduce la periodicidad de HU-18 en un disparo automático finito y
 * sustituible.
 */
@Injectable()
export class IntervalCaptureTrigger implements CaptureTriggerPort, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private stopped = true;

  constructor(
    @Inject(PERIODICITY_PROVIDER_PORT) private readonly periodicityProvider: PeriodicityProviderPort,
  ) {}

  start(onTrigger: () => Promise<void> | void): void {
    this.stopped = false;
    void this.scheduleNext(onTrigger);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  onModuleDestroy(): void {
    this.stop();
  }

  private async scheduleNext(onTrigger: () => Promise<void> | void): Promise<void> {
    if (this.stopped) {
      return;
    }

    const periodicityMs = await this.periodicityProvider.getPeriodicityMs();

    this.timer = setTimeout(() => {
      void (async () => {
        if (this.stopped) {
          return;
        }
        await onTrigger();
        await this.scheduleNext(onTrigger);
      })();
    }, periodicityMs);
  }
}
