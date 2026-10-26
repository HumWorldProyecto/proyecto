import { Inject, Injectable } from '@nestjs/common';
import { COUNTRIES, COUNTRY_BY_CODE } from '../data/geography';
import {
  ANALYTICS_REPOSITORY_PORT,
  AnalyticsRepositoryPort,
} from '../ports/analytics-repository.port';
import {
  AnalyticsInputError,
  AnalyticsRecord,
  Coverage,
  HumorDashboard,
  HumorFilter,
  WordInfluence,
} from '../types/analytics';

const effectiveDate = (row: AnalyticsRecord): Date => row.pubDate ?? row.capturedAt;
const eligible = (row: AnalyticsRecord): boolean =>
  row.score !== null && (row.matchedTerms ?? 0) > 0;

function coverage(rows: readonly AnalyticsRecord[]): Coverage {
  const analyzed = rows.filter((row) => row.score !== null);
  const evidence = analyzed.filter(eligible);
  return {
    total: rows.length,
    analyzed: analyzed.length,
    withEvidence: evidence.length,
    withoutEvidence: analyzed.length - evidence.length,
    unanalyzed: rows.length - analyzed.length,
    unknownCountry: rows.filter((row) => row.countryCode === null).length,
    missingTermEvidence: evidence.filter((row) => row.terms === null).length,
    average: evidence.length
      ? evidence.reduce((sum, row) => sum + row.score!, 0) / evidence.length
      : null,
  };
}

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY_PORT) private readonly repository: AnalyticsRepositoryPort,
  ) {}

  async geography() {
    return { countries: COUNTRIES, sources: await this.repository.listSources() };
  }

  assignCountry(id: string, code: string | null) {
    const country = code === null ? null : COUNTRY_BY_CODE.get(code);
    if (country === undefined) throw new AnalyticsInputError('País desconocido');
    return this.repository.assignCountry(id, country);
  }

  async query(filter: HumorFilter): Promise<HumorDashboard> {
    this.validate(filter);
    const rows = await this.repository.readNews(filter);
    const summary = coverage(rows);
    const byDay = new Map<string, AnalyticsRecord[]>();
    const byCountry = new Map<string, AnalyticsRecord[]>();
    for (const row of rows) {
      const day = effectiveDate(row).toISOString().slice(0, 10);
      const daily = byDay.get(day) ?? [];
      daily.push(row);
      byDay.set(day, daily);
      if (row.countryCode) {
        const country = byCountry.get(row.countryCode) ?? [];
        country.push(row);
        byCountry.set(row.countryCode, country);
      }
    }
    const news = rows
      .map((row) => {
        const { pubDate, capturedAt, analyzedAt, ...rest } = row;
        return {
          ...rest,
          date: (pubDate ?? capturedAt).toISOString(),
          dateSource: pubDate ? ('publication' as const) : ('capture' as const),
          analyzedAt: analyzedAt?.toISOString() ?? null,
          contribution: eligible(row) ? row.score! / summary.withEvidence : null,
        };
      })
      .sort(
        (a, b) =>
          Number(b.contribution !== null) - Number(a.contribution !== null) ||
          Math.abs(b.contribution ?? 0) - Math.abs(a.contribution ?? 0) ||
          b.date.localeCompare(a.date) ||
          a.id.localeCompare(b.id),
      );

    const words = new Map<string, WordInfluence>();
    for (const row of rows.filter(eligible)) {
      for (const term of row.terms ?? []) {
        const key = `${term.language}:${term.term}`;
        const contribution =
          (term.weight * term.occurrences) / (5 * row.matchedTerms! * summary.withEvidence);
        const current = words.get(key) ?? {
          term: term.term,
          language: term.language,
          occurrences: 0,
          newsCount: 0,
          contribution: 0,
          influence: 0,
        };
        current.occurrences += term.occurrences;
        current.newsCount += 1;
        current.contribution += contribution;
        current.influence += Math.abs(contribution);
        words.set(key, current);
      }
    }
    return {
      filters: {
        continent: filter.continent ?? null,
        country: filter.country ?? null,
        from: filter.from ?? null,
        to: filter.to ?? null,
      },
      summary,
      timeline: [...byDay]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, daily]) => ({ date, ...coverage(daily) })),
      countries: COUNTRIES.filter(
        (country) =>
          (!filter.country || country.code === filter.country) &&
          (!filter.continent || country.continent === filter.continent),
      ).map((country) => ({ ...country, ...coverage(byCountry.get(country.code) ?? []) })),
      words: [...words.values()].sort(
        (a, b) =>
          b.influence - a.influence ||
          a.language.localeCompare(b.language) ||
          a.term.localeCompare(b.term),
      ),
      news,
    };
  }

  private validate(filter: HumorFilter) {
    for (const date of [filter.from, filter.to]) {
      if (
        date !== undefined &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date)
      ) {
        throw new AnalyticsInputError('Fecha inválida; usa YYYY-MM-DD');
      }
    }
    if (filter.from && filter.to && filter.from > filter.to)
      throw new AnalyticsInputError('El inicio debe preceder al fin');
    if (filter.country) {
      const country = COUNTRY_BY_CODE.get(filter.country);
      if (!country || (filter.continent && country.continent !== filter.continent))
        throw new AnalyticsInputError('País y continente inválidos o incompatibles');
    }
  }
}
