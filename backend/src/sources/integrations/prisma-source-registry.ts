import { Inject, Injectable } from '@nestjs/common';
import {
  SOURCE_REPOSITORY_PORT,
  SourceRepositoryPort,
} from '../ports/source-repository.port';
import { EligibleSource, SourceRegistryPort } from '../ports/source-registry.port';

@Injectable()
export class PrismaSourceRegistry implements SourceRegistryPort {
  constructor(
    @Inject(SOURCE_REPOSITORY_PORT) private readonly repository: SourceRepositoryPort,
  ) {}

  async getEligibleSources(): Promise<readonly EligibleSource[]> {
    const activeSources = await this.repository.list(true);
    const snapshot = activeSources.map(({ id, url }) => Object.freeze({ id, url }));
    return Object.freeze(snapshot);
  }
}
