import { Inject, Injectable } from '@nestjs/common';
import {
  SOURCE_REPOSITORY_PORT,
  SourceRepositoryPort,
} from '../ports/source-repository.port';
import {
  CaptureSourceSelection,
  EligibleSource,
  SourceRegistryPort,
} from '../ports/source-registry.port';

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

  async findForCapture(sourceId: string): Promise<CaptureSourceSelection> {
    const source = await this.repository.findById(sourceId);

    if (!source) {
      return Object.freeze({ kind: 'missing' });
    }

    if (!source.active) {
      return Object.freeze({ kind: 'inactive', sourceId: source.id });
    }

    return Object.freeze({
      kind: 'eligible',
      source: Object.freeze({ id: source.id, url: source.url }),
    });
  }
}
