import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NewsRepositoryPort } from '../ports/news-repository.port';
import { News } from '../types/news';
import {
  IdentifiedCapturedNewsItem,
  NewsDedupeKey,
} from '../types/identified-captured-news-item';

function isValidDedupeKey(value: unknown): value is NewsDedupeKey {
  if (typeof value !== 'string') {
    return false;
  }

  const prefix = value.startsWith('guid:') ? 'guid:' : value.startsWith('link:') ? 'link:' : null;
  return prefix !== null && value.slice(prefix.length).trim().length > 0;
}

@Injectable()
export class PrismaNewsRepository implements NewsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<News[]> {
    const rows = await this.prisma.news.findMany({
      orderBy: { capturedAt: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      title: row.title,
      link: row.link,
      guid: row.guid,
      description: row.description,
      pubDate: row.pubDate,
      capturedAt: row.capturedAt,
    }));
  }

  async upsertCapturedItem(item: IdentifiedCapturedNewsItem): Promise<void> {
    if (!isValidDedupeKey(item.dedupeKey)) {
      return;
    }

    const pubDate = item.pubDate ? new Date(item.pubDate) : null;
    const data = {
      sourceId: item.sourceId,
      title: item.title ?? null,
      link: item.link ?? null,
      guid: item.guid ?? null,
      description: item.description ?? null,
      pubDate,
      dedupeKey: item.dedupeKey,
    };

    await this.prisma.news.upsert({
      where: {
        sourceId_dedupeKey: { sourceId: item.sourceId, dedupeKey: item.dedupeKey },
      },
      update: {},
      create: data,
    });
  }
}
