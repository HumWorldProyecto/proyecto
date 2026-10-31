import { Inject, Injectable } from '@nestjs/common';
import { LifecycleConflictError, LifecycleInputError } from './lifecycle.errors';
import { LIFECYCLE_CLOCK, LIFECYCLE_REPOSITORY, LifecycleClock, LifecycleRepository } from './lifecycle.port';

export const MAX_RETENTION_DAYS = 36500;
const DAY_MS = 86_400_000;
export function requireDays(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_RETENTION_DAYS) {
    throw new LifecycleInputError('El periodo debe ser un número entero entre 1 y 36500 días, o null para desactivar');
  }
  return value;
}

@Injectable()
export class LifecycleService {
  private busy = false;
  constructor(
    @Inject(LIFECYCLE_REPOSITORY) private readonly repository: LifecycleRepository,
    @Inject(LIFECYCLE_CLOCK) private readonly clock: LifecycleClock,
  ) {}
  getPolicy() { return this.repository.getPolicy(); }
  async configure(value: unknown) {
    const days = requireDays(value);
    return this.exclusive(async () => {
      const current = await this.repository.getPolicy();
      return current.retentionDays === days ? current : this.repository.savePolicy(days);
    });
  }
  async preview() {
    const { retentionDays } = await this.getPolicy();
    const evaluatedAt = this.clock.now();
    const cutoff = this.cutoff(evaluatedAt, retentionDays);
    return { retentionDays, evaluatedAt: evaluatedAt.toISOString(), cutoff: cutoff?.toISOString() ?? null,
      ...await this.repository.count(cutoff) };
  }
  async purge(options: { automatic?: boolean; expectedRetentionDays?: number } = {}) {
    return this.exclusive(async () => {
      const { retentionDays } = await this.getPolicy();
      const evaluatedAt = this.clock.now();
      if (retentionDays === null) {
        if (!options.automatic) throw new LifecycleConflictError('Configura la caducidad antes de purgar');
        return { retentionDays, cutoff: null, evaluatedAt: evaluatedAt.toISOString(), deletedCount: 0, skipped: true };
      }
      if (!options.automatic && options.expectedRetentionDays !== retentionDays) {
        throw new LifecycleConflictError('La política cambió; actualiza la vista previa');
      }
      const cutoff = this.cutoff(evaluatedAt, retentionDays)!;
      const deletedCount = await this.repository.deleteBefore(cutoff);
      return { retentionDays, cutoff: cutoff.toISOString(), evaluatedAt: evaluatedAt.toISOString(), deletedCount, skipped: false };
    });
  }
  private cutoff(now: Date, days: number | null) {
    return days === null ? null : new Date(now.getTime() - days * DAY_MS);
  }
  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.busy) throw new LifecycleConflictError('Hay una operación de ciclo de vida en curso');
    this.busy = true;
    try { return await operation(); } finally { this.busy = false; }
  }
}
