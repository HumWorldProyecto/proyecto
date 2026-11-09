import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HumorQueryDto } from '../../analytics/dto/analytics.dto';
import { COUNTRY_BY_CODE } from '../../analytics/data/geography';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveOfficialMediaTopics } from '../../classification/catalog/iptc-media-topics';

@Injectable()
export class NewsRecordsService {
  constructor(private readonly prisma: PrismaService) {}
  async detail(id: string) {
    const row = await this.prisma.news.findUnique({ where: { id }, include: { source: true } });
    if (!row) throw new NotFoundException('Noticia no encontrada');
    return this.present(row);
  }
  async filtered(input: HumorQueryDto) {
    for (const value of [input.from, input.to]) {
      if (value && (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new BadRequestException('Fecha inválida');
    }
    if (input.from && input.to && input.from > input.to) throw new BadRequestException('Rango inválido');
    if (input.country && (!COUNTRY_BY_CODE.has(input.country) || (input.continent && COUNTRY_BY_CODE.get(input.country)!.continent !== input.continent))) throw new BadRequestException('País incompatible');
    const conditions: Prisma.NewsWhereInput[] = [];
    if (input.source) conditions.push({ sourceId: input.source });
    if (input.category) conditions.push({ mediaTopicQcodes: { has: input.category } });
    if (input.country || input.continent) conditions.push({ source: { countryCode: input.country, continent: input.continent } });
    if (input.from) { const gte = new Date(`${input.from}T00:00:00Z`); conditions.push({ OR: [{ pubDate: { gte } }, { pubDate: null, capturedAt: { gte } }] }); }
    if (input.to) { const lt = new Date(`${input.to}T00:00:00Z`); lt.setUTCDate(lt.getUTCDate() + 1); conditions.push({ OR: [{ pubDate: { lt } }, { pubDate: null, capturedAt: { lt } }] }); }
    const rows = await this.prisma.news.findMany({ where: { AND: conditions }, orderBy: { capturedAt: 'desc' }, include: { source: true } });
    return rows.map(row => this.present(row));
  }

  private present(row: Prisma.NewsGetPayload<{ include: { source: true } }>) {
    return { id: row.id, source: row.sourceId, sourceUrl: row.source.url,
      title: row.title, description: row.description, link: row.link, guid: row.guid,
      capturedAt: row.capturedAt, pubDate: row.pubDate,
      countryCode: row.source.countryCode, continent: row.source.continent,
      sourceMediaTopicQcode: row.source.mediaTopicQcode,
      mediaTopics: resolveOfficialMediaTopics(row.mediaTopicQcodes),
      sentiment: row.sentimentAnalyzedAt === null ? null : { score: Number(row.sentimentScore),
        matchedTerms: row.sentimentMatchedTerms, language: row.sentimentLanguage,
        analyzedAt: row.sentimentAnalyzedAt, terms: row.sentimentTerms } };
  }

  async delete(id: string): Promise<void> {
    const result = await this.prisma.news.deleteMany({ where: { id } });
    if (result.count === 0) throw new NotFoundException('Noticia no encontrada');
  }
}
