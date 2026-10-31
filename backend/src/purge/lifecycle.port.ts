export type RetentionPolicy = Readonly<{ retentionDays: number | null }>;
export interface LifecycleRepository {
  getPolicy(): Promise<RetentionPolicy>;
  savePolicy(days: number | null): Promise<RetentionPolicy>;
  count(cutoff: Date | null): Promise<{ totalCount: number; expiredCount: number }>;
  deleteBefore(cutoff: Date): Promise<number>;
}
export const LIFECYCLE_REPOSITORY = Symbol('LIFECYCLE_REPOSITORY');
export const LIFECYCLE_CLOCK = Symbol('LIFECYCLE_CLOCK');
export interface LifecycleClock { now(): Date; }
