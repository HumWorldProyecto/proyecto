import { Inject, Injectable } from '@nestjs/common';
import { PeriodicityState } from '../domain/periodicity';
import {
  PERIODICITY_PROVIDER_PORT,
  PeriodicityProviderPort,
} from '../ports/periodicity-provider.port';
import {
  PERIODICITY_REPOSITORY_PORT,
  PeriodicityRepositoryPort,
} from '../ports/periodicity-repository.port';

@Injectable()
export class RepositoryPeriodicityProvider implements PeriodicityProviderPort {
  constructor(
    @Inject(PERIODICITY_REPOSITORY_PORT)
    private readonly repository: PeriodicityRepositoryPort,
  ) {}

  async getCurrentState(): Promise<PeriodicityState> {
    return (await this.repository.getCurrent()).state;
  }
}

export const PERIODICITY_PROVIDER = {
  provide: PERIODICITY_PROVIDER_PORT,
  useExisting: RepositoryPeriodicityProvider,
};
