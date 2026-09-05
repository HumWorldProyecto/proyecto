import { Inject, Injectable } from '@nestjs/common';
import {
  PeriodicityState,
  requireAllowedPeriodicityMinutes,
} from '../domain/periodicity';
import {
  PERIODICITY_CHANGE_PUBLISHER_PORT,
  PeriodicityChangePublisherPort,
} from '../ports/periodicity-change.port';
import {
  PERIODICITY_REPOSITORY_PORT,
  PeriodicityRepositoryPort,
} from '../ports/periodicity-repository.port';

@Injectable()
export class CaptureConfigService {
  constructor(
    @Inject(PERIODICITY_REPOSITORY_PORT)
    private readonly repository: PeriodicityRepositoryPort,
    @Inject(PERIODICITY_CHANGE_PUBLISHER_PORT)
    private readonly publisher: PeriodicityChangePublisherPort,
  ) {}

  async getCurrentState(): Promise<PeriodicityState> {
    return (await this.repository.getCurrent()).state;
  }

  async configure(value: unknown): Promise<PeriodicityState> {
    const minutes = requireAllowedPeriodicityMinutes(value);
    const current = await this.repository.getCurrent();

    if (current.state.kind === 'configured' && current.state.minutes === minutes) {
      return current.state;
    }

    const persisted = await this.repository.save(minutes);
    await this.publisher.publish({
      state: persisted.state,
      effectiveAt: new Date(persisted.updatedAt),
    });
    return persisted.state;
  }
}
