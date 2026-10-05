import { PeriodicityInputError } from '../errors/periodicity.error';

export const ALLOWED_PERIODICITY_MINUTES = [15, 30, 60, 360, 720, 1440] as const;

export type AllowedPeriodicityMinutes = (typeof ALLOWED_PERIODICITY_MINUTES)[number];

export type PeriodicityState =
  | Readonly<{ kind: 'configured'; minutes: AllowedPeriodicityMinutes }>
  | Readonly<{ kind: 'unconfigured' }>;

export function isAllowedPeriodicityMinutes(value: unknown): value is AllowedPeriodicityMinutes {
  return (
    typeof value === 'number' &&
    ALLOWED_PERIODICITY_MINUTES.some((allowed) => allowed === value)
  );
}

export function requireAllowedPeriodicityMinutes(value: unknown): AllowedPeriodicityMinutes {
  if (!isAllowedPeriodicityMinutes(value)) {
    throw new PeriodicityInputError();
  }
  return value;
}

export function configuredPeriodicity(
  minutes: AllowedPeriodicityMinutes,
): PeriodicityState {
  return Object.freeze({ kind: 'configured', minutes });
}

export function unconfiguredPeriodicity(): PeriodicityState {
  return Object.freeze({ kind: 'unconfigured' });
}
