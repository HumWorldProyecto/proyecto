import {
  AllowedPeriodicityMinutes,
  PeriodicityState,
} from '../domain/periodicity';

export type StoredPeriodicity = Readonly<{
  state: PeriodicityState;
  updatedAt: Date | null;
}>;

export type StoredConfiguredPeriodicity = Readonly<{
  state: Readonly<{
    kind: 'configured';
    minutes: AllowedPeriodicityMinutes;
  }>;
  updatedAt: Date;
}>;

export interface PeriodicityRepositoryPort {
  getCurrent(): Promise<StoredPeriodicity>;
  save(minutes: AllowedPeriodicityMinutes): Promise<StoredConfiguredPeriodicity>;
}

export const PERIODICITY_REPOSITORY_PORT = Symbol('PERIODICITY_REPOSITORY_PORT');
