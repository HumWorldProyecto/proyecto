import { Injectable } from '@nestjs/common';
import {
  DictionaryEntry as PrismaDictionaryEntry,
  DictionaryLanguage as PrismaDictionaryLanguage,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DictionaryEntryConflictError,
  DictionaryEntryNotFoundError,
} from '../errors/dictionary-domain.error';
import { DictionaryReaderPort } from '../ports/dictionary-reader.port';
import { DictionaryRepositoryPort } from '../ports/dictionary-repository.port';
import {
  DictionaryEntry,
  DictionaryEntryChanges,
  DictionaryEntryData,
  DictionaryLanguage,
} from '../types/dictionary-entry';

function toDomain(row: PrismaDictionaryEntry): DictionaryEntry {
  return Object.freeze({
    id: row.id,
    term: row.term,
    language: row.language as DictionaryLanguage,
    weight: row.weight,
  });
}

function translateWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new DictionaryEntryConflictError();
    }
    if (error.code === 'P2025') {
      throw new DictionaryEntryNotFoundError();
    }
  }
  throw error;
}

@Injectable()
export class PrismaDictionaryRepository
  implements DictionaryRepositoryPort, DictionaryReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: DictionaryEntryData): Promise<DictionaryEntry> {
    try {
      return toDomain(
        await this.prisma.dictionaryEntry.create({
          data: {
            ...entry,
            language: entry.language as PrismaDictionaryLanguage,
          },
        }),
      );
    } catch (error) {
      return translateWriteError(error);
    }
  }

  async findAll(): Promise<readonly DictionaryEntry[]> {
    const rows = await this.prisma.dictionaryEntry.findMany({
      orderBy: [{ language: 'asc' }, { term: 'asc' }, { id: 'asc' }],
    });
    return Object.freeze(rows.map(toDomain));
  }

  async findById(id: string): Promise<DictionaryEntry | null> {
    const row = await this.prisma.dictionaryEntry.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, changes: DictionaryEntryChanges): Promise<DictionaryEntry> {
    try {
      return toDomain(
        await this.prisma.dictionaryEntry.update({
          where: { id },
          data: {
            ...changes,
            language:
              changes.language === undefined
                ? undefined
                : (changes.language as PrismaDictionaryLanguage),
          },
        }),
      );
    } catch (error) {
      return translateWriteError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.dictionaryEntry.delete({ where: { id } });
    } catch (error) {
      return translateWriteError(error);
    }
  }

  async listByLanguage(language: DictionaryLanguage): Promise<readonly DictionaryEntry[]> {
    const rows = await this.prisma.dictionaryEntry.findMany({
      where: { language: language as PrismaDictionaryLanguage },
      orderBy: [{ term: 'asc' }, { id: 'asc' }],
    });
    return Object.freeze(rows.map(toDomain));
  }
}
