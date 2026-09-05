import { Injectable } from '@nestjs/common';
import { CaptureConfig } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AllowedPeriodicityMinutes,
  configuredPeriodicity,
  isAllowedPeriodicityMinutes,
  unconfiguredPeriodicity,
} from '../domain/periodicity';
import { PeriodicityConfigurationError } from '../errors/periodicity.error';
import {
  PeriodicityRepositoryPort,
  StoredConfiguredPeriodicity,
  StoredPeriodicity,
} from '../ports/periodicity-repository.port';

const SINGLETON_ID = 'global';

function toStored(row: CaptureConfig | null): StoredPeriodicity {
  if (!row || row.capturePeriodicityMinutes === null) {
    return {
      state: unconfiguredPeriodicity(),
      updatedAt: row?.updatedAt ?? null,
    };
  }

  if (!isAllowedPeriodicityMinutes(row.capturePeriodicityMinutes)) {
    throw new PeriodicityConfigurationError(row.capturePeriodicityMinutes);
  }

  return {
    state: configuredPeriodicity(row.capturePeriodicityMinutes),
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaPeriodicityRepository implements PeriodicityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(): Promise<StoredPeriodicity> {
    const row = await this.prisma.captureConfig.findUnique({
      where: { id: SINGLETON_ID },
    });
    return toStored(row);
  }

  async save(minutes: AllowedPeriodicityMinutes): Promise<StoredConfiguredPeriodicity> {
    const row = await this.prisma.captureConfig.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        capturePeriodicityMinutes: minutes,
      },
      update: { capturePeriodicityMinutes: minutes },
    });
    const stored = toStored(row);

    if (stored.state.kind !== 'configured' || stored.updatedAt === null) {
      throw new PeriodicityConfigurationError(row.capturePeriodicityMinutes);
    }

    return { state: stored.state, updatedAt: stored.updatedAt };
  }
}
