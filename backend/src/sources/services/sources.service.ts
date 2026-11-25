import { Inject, Injectable } from '@nestjs/common';
import { SourceUrlNormalizer } from '../domain/source-url-normalizer';
import { SourceInputError, SourceNotFoundError, SourceUrlConflictError } from '../errors/source-domain.error';
import { SourceAccessibilityChecker } from '../integrations/source-accessibility-checker';
import {
  SOURCE_REPOSITORY_PORT,
  SourceChanges,
  SourceRepositoryPort,
} from '../ports/source-repository.port';
import { COUNTRY_BY_CODE } from '../../analytics/data/geography';
import { evaluationMode } from '../../auth/evaluation-mode';
import { SourceMetadata } from '../ports/source-repository.port';
import { RssSource } from '../types/rss-source';

@Injectable()
export class SourcesService {
  constructor(
    @Inject(SOURCE_REPOSITORY_PORT) private readonly repository: SourceRepositoryPort,
    private readonly normalizer: SourceUrlNormalizer,
    private readonly accessibilityChecker: SourceAccessibilityChecker,
  ) {}

  async create(rawUrl: string, metadata?: SourceMetadata): Promise<RssSource> {
    const url = await this.validateNewUrl(rawUrl);
    await this.assertUrlAvailable(url);
    return metadata ? this.repository.create(url, this.metadata(metadata)) : this.repository.create(url);
  }

  async findById(id: string): Promise<RssSource> {
    return this.findRequired(id);
  }

  async list(active?: boolean): Promise<RssSource[]> {
    return this.repository.list(active);
  }

  async replace(id: string, rawUrl: string): Promise<RssSource> {
    const current = await this.findRequired(id);
    const url = this.normalizer.normalize(rawUrl).toString();

    if (url === current.url) {
      return current;
    }

    await this.accessibilityChecker.assertAccessible(url);
    await this.assertUrlAvailable(url, id);
    return this.repository.replace(id, url);
  }

  async update(id: string, changes: SourceChanges): Promise<RssSource> {
    if (Object.values(changes).every(value => value === undefined)) {
      throw new SourceInputError('PATCH requiere al menos una propiedad');
    }

    const current = await this.findRequired(id);
    const persistedChanges: { -readonly [K in keyof SourceChanges]: SourceChanges[K] } = { ...this.metadata(changes) };

    if (changes.url !== undefined) {
      const url = this.normalizer.normalize(changes.url).toString();
      if (url !== current.url) {
        await this.accessibilityChecker.assertAccessible(url);
        await this.assertUrlAvailable(url, id);
        persistedChanges.url = url;
      }
    }

    if (changes.active !== undefined && changes.active !== current.active) {
      persistedChanges.active = changes.active;
    }

    if (Object.keys(persistedChanges).length === 0) {
      return current;
    }

    return this.repository.update(id, persistedChanges);
  }

  async deactivate(id: string): Promise<void> {
    const current = await this.findRequired(id);
    if (evaluationMode()) {
      await this.repository.deleteWithNews!(id);
      return;
    }
    if (current.active) {
      await this.repository.setActive(id, false);
    }
  }

  private metadata(input: SourceMetadata): SourceMetadata {
    const { countryCode, channelId, language, mediaTopicQcode } = input;
    const country = countryCode ? COUNTRY_BY_CODE.get(countryCode) : undefined;
    if (countryCode && !country) throw new SourceInputError('País fuera del catálogo');
    return { ...(countryCode === undefined ? {} : { countryCode }),
      ...(country ? { continent: country.continent } : {}),
      ...(channelId === undefined ? {} : { channelId }),
      ...(language === undefined ? {} : { language }),
      ...(mediaTopicQcode === undefined ? {} : { mediaTopicQcode }) };
  }

  private async validateNewUrl(rawUrl: string): Promise<string> {
    const url = this.normalizer.normalize(rawUrl).toString();
    await this.accessibilityChecker.assertAccessible(url);
    return url;
  }

  private async assertUrlAvailable(url: string, ownId?: string): Promise<void> {
    const existing = await this.repository.findByUrl(url);
    if (existing && existing.id !== ownId) {
      throw new SourceUrlConflictError();
    }
  }

  private async findRequired(id: string): Promise<RssSource> {
    const source = await this.repository.findById(id);
    if (!source) {
      throw new SourceNotFoundError();
    }
    return source;
  }
}
