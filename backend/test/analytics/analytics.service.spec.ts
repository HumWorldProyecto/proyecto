import { AnalyticsService } from '../../src/analytics/services/analytics.service';
import { AnalyticsRepositoryPort } from '../../src/analytics/ports/analytics-repository.port';
import { AnalyticsInputError, AnalyticsRecord } from '../../src/analytics/types/analytics';

const row = (id: string, changes: Partial<AnalyticsRecord> = {}): AnalyticsRecord => ({
  id,
  title: id,
  description: null,
  link: null,
  pubDate: new Date('2026-10-19T21:00:00Z'),
  capturedAt: new Date('2026-10-20T10:00:00Z'),
  sourceId: 'source',
  sourceUrl: 'https://example.org/rss',
  countryCode: 'CL',
  continent: 'SOUTH_AMERICA',
  score: 1,
  matchedTerms: 1,
  language: 'es',
  analyzedAt: new Date('2026-10-20T12:00:00Z'),
  terms: [{ term: 'bueno', language: 'es', weight: 5, occurrences: 1 }],
  ...changes,
});

describe('HU-08/09/12/13 AnalyticsService', () => {
  let repository: jest.Mocked<AnalyticsRepositoryPort>;
  let service: AnalyticsService;
  beforeEach(() => {
    repository = { readNews: jest.fn(), listSources: jest.fn(), assignCountry: jest.fn() };
    service = new AnalyticsService(repository);
  });

  it('distingue sin análisis, sin evidencia y cero neutral; usa N elegibles', async () => {
    repository.readNews.mockResolvedValue([
      row('p'),
      row('n', { score: -0.5, terms: null }),
      row('zero', { score: 0, terms: [] }),
      row('none', { score: 0, matchedTerms: 0, terms: [] }),
      row('raw', {
        score: null,
        matchedTerms: null,
        language: null,
        analyzedAt: null,
        terms: null,
        countryCode: null,
      }),
    ]);
    const result = await service.query({});
    expect(result.summary).toEqual({
      total: 5,
      analyzed: 4,
      withEvidence: 3,
      withoutEvidence: 1,
      unanalyzed: 1,
      unknownCountry: 1,
      missingTermEvidence: 1,
      average: 1 / 6,
    });
    expect(result.news.map((n) => n.id)).toEqual(['p', 'n', 'zero', 'none', 'raw']);
    expect(result.news.find((n) => n.id === 'p')?.contribution).toBeCloseTo(1 / 3);
    expect(result.news.find((n) => n.id === 'none')?.contribution).toBeNull();
    expect(result.countries.find((c) => c.code === 'CL')?.total).toBe(4);
    expect(result.countries.find((c) => c.code === 'AR')?.average).toBeNull();
  });

  it('no convierte ausencia en neutralidad y conserva filtros explícitos', async () => {
    repository.readNews.mockResolvedValue([]);
    const filter = {
      country: 'CL',
      continent: 'SOUTH_AMERICA' as const,
      from: '2026-10-01',
      to: '2026-10-20',
    };
    const result = await service.query(filter);
    expect(repository.readNews).toHaveBeenCalledWith(filter);
    expect(result.summary.average).toBeNull();
    expect(result.words).toEqual([]);
    expect(result.timeline).toEqual([]);
    expect(result.countries).toHaveLength(1);
    expect(result.filters).toEqual(filter);
  });

  it('agrupa por publicación UTC o captura, no por fecha del análisis', async () => {
    repository.readNews.mockResolvedValue([
      row('b', { pubDate: null }),
      row('a'),
      row('c', { pubDate: new Date('2026-10-18T23:00:00-02:00') }),
    ]);
    const result = await service.query({});
    expect(result.timeline.map((t) => [t.date, t.total])).toEqual([
      ['2026-10-19', 2],
      ['2026-10-20', 1],
    ]);
    expect(result.news.find((n) => n.id === 'b')).toMatchObject({
      date: '2026-10-20T10:00:00.000Z',
      dateSource: 'capture',
    });
    expect(result.news.find((n) => n.id === 'a')?.dateSource).toBe('publication');
  });

  it('agrega contribuciones guardadas, frecuencia y magnitud sin cancelar influencias opuestas', async () => {
    repository.readNews.mockResolvedValue([
      row('a'),
      row('b', {
        score: -1,
        terms: [{ term: 'bueno', language: 'es', weight: -5, occurrences: 1 }],
      }),
      row('c', {
        matchedTerms: 2,
        score: 0.5,
        terms: [
          { term: 'good', language: 'en', weight: 5, occurrences: 1 },
          { term: 'estable', language: 'es', weight: 0, occurrences: 1 },
        ],
      }),
    ]);
    const result = await service.query({});
    expect(result.words[0]).toEqual({
      term: 'bueno',
      language: 'es',
      occurrences: 2,
      newsCount: 2,
      contribution: 0,
      influence: 2 / 3,
    });
    expect(result.words[1]).toMatchObject({ term: 'good', influence: 1 / 6, contribution: 1 / 6 });
    expect(result.words[2]).toMatchObject({ term: 'estable', influence: 0 });
  });

  it.each([
    { from: '2026-02-30' },
    { to: 'wrong' },
    { from: '2026-10-20', to: '2026-10-01' },
    { country: 'ZZ' },
    { country: 'CL', continent: 'EUROPE' as const },
  ])('rechaza filtros inválidos %# antes de leer', async (filter) => {
    await expect(service.query(filter)).rejects.toBeInstanceOf(AnalyticsInputError);
    expect(repository.readNews).not.toHaveBeenCalled();
  });

  it('entrega catálogo versionado y delega país explícito o retirada', async () => {
    repository.listSources.mockResolvedValue([]);
    const geography = await service.geography();
    expect(geography.countries.length).toBeGreaterThan(240);
    expect(geography.countries.find((c) => c.code === 'CL')?.continent).toBe('SOUTH_AMERICA');
    await service.assignCountry('s', 'CL');
    expect(repository.assignCountry).toHaveBeenLastCalledWith(
      's',
      expect.objectContaining({ code: 'CL', continent: 'SOUTH_AMERICA' }),
    );
    await service.assignCountry('s', null);
    expect(repository.assignCountry).toHaveBeenLastCalledWith('s', null);
    expect(() => service.assignCountry('s', 'ZZ')).toThrow(AnalyticsInputError);
  });
});
