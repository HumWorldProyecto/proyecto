import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SentimentTermEvidence } from '../../sentiment/ports/sentiment-evidence-analyzer.port';
import { AnalyticsRepositoryPort } from '../ports/analytics-repository.port';
import {
  AnalyticsRecord,
  AnalyticsUnavailableError,
  Country,
  GeographySourceNotFoundError,
  HumorFilter,
} from '../types/analytics';

const sourceSelect = {
  id: true,
  url: true,
  active: true,
  countryCode: true,
  continent: true,
} as const;

export function readTermEvidence(
  value: Prisma.JsonValue | null,
): readonly SentimentTermEvidence[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) throw new AnalyticsUnavailableError();
  return value.map((term) => {
    if (
      !term ||
      typeof term !== 'object' ||
      Array.isArray(term) ||
      typeof term.term !== 'string' ||
      term.term.length === 0 ||
      !['es', 'en'].includes(String(term.language)) ||
      typeof term.weight !== 'number' ||
      !Number.isInteger(term.weight) ||
      Math.abs(term.weight) > 5 ||
      typeof term.occurrences !== 'number' ||
      !Number.isInteger(term.occurrences) ||
      term.occurrences <= 0
    )
      throw new AnalyticsUnavailableError();
    return {
      term: term.term,
      language: term.language as 'es' | 'en',
      weight: term.weight,
      occurrences: term.occurrences,
    };
  });
}

@Injectable()
export class PrismaAnalyticsRepository implements AnalyticsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async readNews(filter: HumorFilter): Promise<readonly AnalyticsRecord[]> {
    const conditions: Prisma.NewsWhereInput[] = [];
    if (filter.continent || filter.country)
      conditions.push({ source: { continent: filter.continent, countryCode: filter.country } });
    if (filter.from) {
      const gte = new Date(`${filter.from}T00:00:00.000Z`);
      conditions.push({ OR: [{ pubDate: { gte } }, { pubDate: null, capturedAt: { gte } }] });
    }
    if (filter.to) {
      const lt = new Date(`${filter.to}T00:00:00.000Z`);
      lt.setUTCDate(lt.getUTCDate() + 1);
      conditions.push({ OR: [{ pubDate: { lt } }, { pubDate: null, capturedAt: { lt } }] });
    }
    try {
      const rows = await this.prisma.news.findMany({
        where: { AND: conditions },
        select: {
          id: true,
          title: true,
          description: true,
          link: true,
          pubDate: true,
          capturedAt: true,
          sourceId: true,
          sentimentScore: true,
          sentimentMatchedTerms: true,
          sentimentLanguage: true,
          sentimentAnalyzedAt: true,
          sentimentTerms: true,
          source: { select: { url: true, countryCode: true, continent: true } },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        link: row.link,
        pubDate: row.pubDate,
        capturedAt: row.capturedAt,
        sourceId: row.sourceId,
        sourceUrl: row.source.url,
        countryCode: row.source.countryCode,
        continent: row.source.continent,
        score: row.sentimentScore === null ? null : Number(row.sentimentScore),
        matchedTerms: row.sentimentMatchedTerms,
        language: row.sentimentLanguage,
        analyzedAt: row.sentimentAnalyzedAt,
        terms: readTermEvidence(row.sentimentTerms),
      }));
    } catch {
      throw new AnalyticsUnavailableError();
    }
  }

  async listSources() {
    try {
      return await this.prisma.rssSource.findMany({ select: sourceSelect, orderBy: { id: 'asc' } });
    } catch {
      throw new AnalyticsUnavailableError();
    }
  }

  async assignCountry(id: string, country: Country | null) {
    try {
      return await this.prisma.rssSource.update({
        where: { id },
        data: {
          countryCode: country?.code ?? null,
          ...(country ? { continent: country.continent } : {}),
        },
        select: sourceSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
        throw new GeographySourceNotFoundError();
      throw new AnalyticsUnavailableError();
    }
  }
}
