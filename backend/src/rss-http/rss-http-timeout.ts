import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const RSS_FETCH_TIMEOUT_MS = Symbol('RSS_FETCH_TIMEOUT_MS');
export const DEFAULT_RSS_FETCH_TIMEOUT_MS = 10_000;

export function parseRssFetchTimeoutMs(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_RSS_FETCH_TIMEOUT_MS;
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    throw new Error('RSS_FETCH_TIMEOUT_MS debe ser un entero positivo y finito');
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('RSS_FETCH_TIMEOUT_MS debe ser un entero positivo y finito');
  }

  return parsed;
}

export function rssFetchTimeoutFactory(configService: ConfigService): number {
  return parseRssFetchTimeoutMs(configService.get<unknown>('RSS_FETCH_TIMEOUT_MS'));
}

export const RSS_FETCH_TIMEOUT_PROVIDER: FactoryProvider<number> = {
  provide: RSS_FETCH_TIMEOUT_MS,
  inject: [ConfigService],
  useFactory: rssFetchTimeoutFactory,
};
