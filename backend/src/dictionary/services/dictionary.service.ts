import { Inject, Injectable } from '@nestjs/common';
import { DictionaryTermNormalizer } from '../domain/dictionary-term-normalizer';
import {
  DictionaryEntryNotFoundError,
  DictionaryInputError,
} from '../errors/dictionary-domain.error';
import {
  DICTIONARY_REPOSITORY_PORT,
  DictionaryRepositoryPort,
} from '../ports/dictionary-repository.port';
import {
  DictionaryEntry,
  DictionaryEntryChanges,
  DictionaryEntryData,
} from '../types/dictionary-entry';

@Injectable()
export class DictionaryService {
  constructor(
    @Inject(DICTIONARY_REPOSITORY_PORT)
    private readonly repository: DictionaryRepositoryPort,
    private readonly normalizer: DictionaryTermNormalizer,
  ) {}

  async create(input: DictionaryEntryData): Promise<DictionaryEntry> {
    this.normalizer.assertLanguage(input.language);
    this.normalizer.assertWeight(input.weight);
    const term = this.normalizer.normalizeAndValidate(input.term, input.language);
    return this.repository.create({ term, language: input.language, weight: input.weight });
  }

  async list(): Promise<readonly DictionaryEntry[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<DictionaryEntry> {
    const entry = await this.repository.findById(id);
    if (!entry) {
      throw new DictionaryEntryNotFoundError();
    }
    return entry;
  }

  async update(id: string, changes: DictionaryEntryChanges): Promise<DictionaryEntry> {
    if (
      changes.term === undefined &&
      changes.language === undefined &&
      changes.weight === undefined
    ) {
      throw new DictionaryInputError('PATCH requiere al menos una propiedad');
    }

    const current = await this.findById(id);
    const language = changes.language ?? current.language;
    const weight = changes.weight ?? current.weight;
    this.normalizer.assertLanguage(language);
    this.normalizer.assertWeight(weight);
    const term = this.normalizer.normalizeAndValidate(changes.term ?? current.term, language);

    return this.repository.update(id, { term, language, weight });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
  }
}
