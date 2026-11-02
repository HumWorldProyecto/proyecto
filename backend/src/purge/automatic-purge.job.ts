import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { LifecycleService } from './lifecycle.service';

export const PURGE_INTERVAL_MS = 60 * 60 * 1000;
export const AUTOMATIC_PURGE_JOB = 'automatic-news-purge';
@Injectable()
export class AutomaticPurgeJob {
  private readonly logger = new Logger(AutomaticPurgeJob.name);
  constructor(private readonly lifecycle: LifecycleService) {}
  @Interval(AUTOMATIC_PURGE_JOB, PURGE_INTERVAL_MS)
  async run(): Promise<void> {
    try { await this.lifecycle.purge({ automatic: true }); }
    catch { this.logger.warn('La revisión automática de caducidad no se completó; se reintentará en la próxima revisión'); }
  }
}
