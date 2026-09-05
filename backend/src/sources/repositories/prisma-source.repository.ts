import { Injectable } from '@nestjs/common';
import { Prisma, RssSource as PrismaRssSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SourceNotFoundError, SourceUrlConflictError } from '../errors/source-domain.error';
import { SourceChanges, SourceRepositoryPort } from '../ports/source-repository.port';
import { RssSource } from '../types/rss-source';

function toDomain(row: PrismaRssSource): RssSource {
  return {
    id: row.id,
    url: row.url,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function translateWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new SourceUrlConflictError();
    }
    if (error.code === 'P2025') {
      throw new SourceNotFoundError();
    }
  }
  throw error;
}

@Injectable()
export class PrismaSourceRepository implements SourceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(url: string): Promise<RssSource> {
    try {
      return toDomain(await this.prisma.rssSource.create({ data: { url, active: true } }));
    } catch (error) {
      return translateWriteError(error);
    }
  }

  async findById(id: string): Promise<RssSource | null> {
    const row = await this.prisma.rssSource.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByUrl(url: string): Promise<RssSource | null> {
    const row = await this.prisma.rssSource.findUnique({ where: { url } });
    return row ? toDomain(row) : null;
  }

  async list(active?: boolean): Promise<RssSource[]> {
    const rows = await this.prisma.rssSource.findMany({
      where: active === undefined ? undefined : { active },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDomain);
  }

  async replace(id: string, url: string): Promise<RssSource> {
    return this.writeUpdate(id, { url });
  }

  async update(id: string, changes: SourceChanges): Promise<RssSource> {
    return this.writeUpdate(id, changes);
  }

  async setActive(id: string, active: boolean): Promise<RssSource> {
    return this.writeUpdate(id, { active });
  }

  private async writeUpdate(id: string, changes: SourceChanges): Promise<RssSource> {
    try {
      return toDomain(
        await this.prisma.rssSource.update({
          where: { id },
          data: changes,
        }),
      );
    } catch (error) {
      return translateWriteError(error);
    }
  }
}
