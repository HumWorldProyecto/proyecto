import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NewsRepositoryPort } from '../ports/news-repository.port';
import { News } from '../types/news';
import { CapturedNewsItem } from '../types/captured-news-item';

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

  async upsertCapturedItem(item: CapturedNewsItem): Promise<void> {
    const dedupeKey = item.guid ?? item.link ?? null;
    const pubDate = item.pubDate ? new Date(item.pubDate) : null;
    const data = {
      sourceId: item.sourceId,
      title: item.title ?? null,
      link: item.link ?? null,
      guid: item.guid ?? null,
      description: item.description ?? null,
      pubDate,
      dedupeKey,
    };

    if (dedupeKey === null) {
      // Prisma no admite `null` en un where de clave única compuesta: un
      // ítem sin GUID ni enlace no puede identificarse, así que se crea
      // siempre como noticia nueva (caso borde documentado en design.md).
      await this.prisma.news.create({ data });
      return;
    }

    await this.prisma.news.upsert({
      where: {
        sourceId_dedupeKey: { sourceId: item.sourceId, dedupeKey },
      },
      update: {},
      create: data,
    });
  }
}
