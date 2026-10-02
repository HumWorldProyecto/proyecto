import type { Continent, Prisma, PrismaClient } from '@prisma/client';
import type { InitialRssSourceManifestEntry } from './initial-rss-sources.manifest';
import type { InitialRssSourcesValidator } from './initial-rss-sources.validator';

export type InitialRssSourcesSeedResult = Readonly<{
  created: number;
  enriched: number;
  unchanged: number;
}>;

export type InitialRssSourcesPrismaClient = Pick<PrismaClient, '$transaction'>;

type InitialRssSourcesManifestValidator = Pick<InitialRssSourcesValidator, 'validate'>;

export class InitialRssSourceContinentConflictError extends Error {
  readonly code = 'INITIAL_RSS_SOURCE_CONTINENT_CONFLICT';

  constructor(
    readonly existingContinent: Continent,
    readonly manifestContinent: Continent,
  ) {
    super('Una fuente existente tiene una asociación continental incompatible con el manifiesto');
    this.name = 'InitialRssSourceContinentConflictError';
  }
}

export class InitialRssSourcesSeeder {
  constructor(
    private readonly prisma: InitialRssSourcesPrismaClient,
    private readonly validator: InitialRssSourcesManifestValidator,
  ) {}

  async seed(
    manifest: readonly InitialRssSourceManifestEntry[],
  ): Promise<InitialRssSourcesSeedResult> {
    const normalizedEntries = this.validator.validate(manifest);
    const orderedEntries = [...normalizedEntries].sort(compareByUrl);

    return this.prisma.$transaction((transaction) =>
      this.persistEntries(transaction, orderedEntries),
    );
  }

  private async persistEntries(
    transaction: Prisma.TransactionClient,
    entries: readonly InitialRssSourceManifestEntry[],
  ): Promise<InitialRssSourcesSeedResult> {
    let created = 0;
    let enriched = 0;
    let unchanged = 0;

    for (const entry of entries) {
      const existing = await transaction.rssSource.findUnique({
        where: { url: entry.url },
        select: { id: true, continent: true },
      });

      if (!existing) {
        await transaction.rssSource.create({
          data: {
            url: entry.url,
            continent: entry.continent,
            active: true,
          },
        });
        created += 1;
        continue;
      }

      if (existing.continent === null) {
        await transaction.rssSource.update({
          where: { id: existing.id },
          data: { continent: entry.continent },
        });
        enriched += 1;
        continue;
      }

      if (existing.continent === entry.continent) {
        unchanged += 1;
        continue;
      }

      throw new InitialRssSourceContinentConflictError(
        existing.continent,
        entry.continent,
      );
    }

    return Object.freeze({ created, enriched, unchanged });
  }
}

function compareByUrl(
  left: InitialRssSourceManifestEntry,
  right: InitialRssSourceManifestEntry,
): number {
  if (left.url < right.url) {
    return -1;
  }
  if (left.url > right.url) {
    return 1;
  }
  return 0;
}
