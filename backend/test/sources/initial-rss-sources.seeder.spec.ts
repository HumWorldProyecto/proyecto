import { Continent, type Prisma } from '@prisma/client';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { SourceUrlNormalizer } from '../../src/sources/domain/source-url-normalizer';
import {
  INITIAL_RSS_SOURCES_MANIFEST,
  type InitialRssSourceManifestEntry,
} from '../../src/sources/seed/initial-rss-sources.manifest';
import {
  InitialRssSourceContinentConflictError,
  type InitialRssSourcesPrismaClient,
  InitialRssSourcesSeeder,
} from '../../src/sources/seed/initial-rss-sources.seeder';
import {
  InitialRssSourcesValidationError,
  InitialRssSourcesValidator,
} from '../../src/sources/seed/initial-rss-sources.validator';

describe('InitialRssSourcesSeeder', () => {
  it('crea una fuente inexistente como activa usando la URL normalizada y el continente', async () => {
    const entry = frozenEntry('https://example.com/rss', Continent.AFRICA);
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockResolvedValue(null);
    const { seeder } = seederWith([entry], transaction);

    await expect(seeder.seed(INITIAL_RSS_SOURCES_MANIFEST)).resolves.toEqual({
      created: 1,
      enriched: 0,
      unchanged: 0,
    });
    expect(transaction.rssSource.create).toHaveBeenCalledWith({
      data: {
        url: 'https://example.com/rss',
        continent: Continent.AFRICA,
        active: true,
      },
    });
    expect(transaction.rssSource.update).not.toHaveBeenCalled();
  });

  it.each([
    ['activa', true],
    ['inactiva', false],
  ])('enriquece una fuente %s sin continente y preserva su estado', async (_label, active) => {
    const entry = frozenEntry('https://example.com/rss', Continent.ASIA);
    const stored = {
      id: 'source-existing',
      url: entry.url,
      active,
      continent: null as Continent | null,
    };
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockResolvedValue({
      id: stored.id,
      continent: stored.continent,
    });
    transaction.rssSource.update.mockImplementation(
      async (args: { data: { continent: Continent } }) => {
        stored.continent = args.data.continent;
        return stored;
      },
    );
    const { seeder } = seederWith([entry], transaction);

    await expect(seeder.seed(INITIAL_RSS_SOURCES_MANIFEST)).resolves.toEqual({
      created: 0,
      enriched: 1,
      unchanged: 0,
    });
    expect(transaction.rssSource.update).toHaveBeenCalledWith({
      where: { id: 'source-existing' },
      data: { continent: Continent.ASIA },
    });
    expect(stored.active).toBe(active);
    expect(transaction.rssSource.create).not.toHaveBeenCalled();
  });

  it('no escribe cuando la fuente ya tiene el mismo continente', async () => {
    const entry = frozenEntry('https://example.com/rss', Continent.EUROPE);
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockResolvedValue({
      id: 'source-existing',
      continent: Continent.EUROPE,
    });
    const { seeder } = seederWith([entry], transaction);

    await expect(seeder.seed(INITIAL_RSS_SOURCES_MANIFEST)).resolves.toEqual({
      created: 0,
      enriched: 0,
      unchanged: 1,
    });
    expect(transaction.rssSource.create).not.toHaveBeenCalled();
    expect(transaction.rssSource.update).not.toHaveBeenCalled();
  });

  it('es idempotente en una segunda ejecución sobre el mismo estado', async () => {
    const entry = frozenEntry('https://example.com/rss', Continent.NORTH_AMERICA);
    let stored: { id: string; url: string; active: boolean; continent: Continent } | null = null;
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockImplementation(async () =>
      stored ? { id: stored.id, continent: stored.continent } : null,
    );
    transaction.rssSource.create.mockImplementation(
      async (args: { data: { url: string; active: boolean; continent: Continent } }) => {
        stored = { id: 'created-once', ...args.data };
        return stored;
      },
    );
    const { seeder } = seederWith([entry], transaction);

    await expect(seeder.seed(INITIAL_RSS_SOURCES_MANIFEST)).resolves.toEqual({
      created: 1,
      enriched: 0,
      unchanged: 0,
    });
    await expect(seeder.seed(INITIAL_RSS_SOURCES_MANIFEST)).resolves.toEqual({
      created: 0,
      enriched: 0,
      unchanged: 1,
    });
    expect(transaction.rssSource.create).toHaveBeenCalledTimes(1);
    expect(transaction.rssSource.update).not.toHaveBeenCalled();
    expect(stored).toEqual({
      id: 'created-once',
      url: entry.url,
      active: true,
      continent: entry.continent,
    });
  });

  it('rechaza un continente diferente con un error específico y sin reasignarlo', async () => {
    const entry = frozenEntry('https://example.com/rss', Continent.SOUTH_AMERICA);
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockResolvedValue({
      id: 'source-existing',
      continent: Continent.OCEANIA,
    });
    const { seeder } = seederWith([entry], transaction);

    await expect(seeder.seed(INITIAL_RSS_SOURCES_MANIFEST)).rejects.toMatchObject({
      name: 'InitialRssSourceContinentConflictError',
      code: 'INITIAL_RSS_SOURCE_CONTINENT_CONFLICT',
      existingContinent: Continent.OCEANIA,
      manifestContinent: Continent.SOUTH_AMERICA,
    });
    expect(transaction.rssSource.update).not.toHaveBeenCalled();
    expect(transaction.rssSource.create).not.toHaveBeenCalled();
  });

  it('propaga un conflicto tardío desde la transacción sin devolver resumen', async () => {
    const entries = [
      frozenEntry('https://a.example/rss', Continent.AFRICA),
      frozenEntry('https://z.example/rss', Continent.ASIA),
    ];
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockImplementation(
      async (args: { where: { url: string } }) =>
        args.where.url === entries[0].url
          ? null
          : { id: 'conflicting-source', continent: Continent.EUROPE },
    );
    const { seeder } = seederWith(entries, transaction);

    await expect(seeder.seed(INITIAL_RSS_SOURCES_MANIFEST)).rejects.toBeInstanceOf(
      InitialRssSourceContinentConflictError,
    );
    expect(transaction.rssSource.create).toHaveBeenCalledTimes(1);
    expect(transaction.rssSource.update).not.toHaveBeenCalled();
  });

  it('propaga un fallo de persistencia tardío sin devolver un resumen parcial', async () => {
    const entries = [
      frozenEntry('https://a.example/rss', Continent.AFRICA),
      frozenEntry('https://z.example/rss', Continent.ASIA),
    ];
    const persistenceError = new Error('simulated persistence failure');
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockResolvedValue(null);
    transaction.rssSource.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(persistenceError);
    const { seeder } = seederWith(entries, transaction);

    await expect(seeder.seed(INITIAL_RSS_SOURCES_MANIFEST)).rejects.toBe(persistenceError);
    expect(transaction.rssSource.create).toHaveBeenCalledTimes(2);
  });

  it('valida el manifiesto completo antes de abrir la transacción', async () => {
    const validator = new InitialRssSourcesValidator(new SourceUrlNormalizer());
    const transaction = transactionMock();
    const $transaction = jest.fn();
    const prisma = { $transaction } as unknown as InitialRssSourcesPrismaClient;
    const seeder = new InitialRssSourcesSeeder(prisma, validator);

    await expect(seeder.seed([])).rejects.toBeInstanceOf(InitialRssSourcesValidationError);
    expect($transaction).not.toHaveBeenCalled();
    expect(transaction.rssSource.create).not.toHaveBeenCalled();
    expect(transaction.rssSource.update).not.toHaveBeenCalled();
  });

  it('no usa HTTP, HTTPS, DNS ni fetch durante la carga', async () => {
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockImplementation(
      async (args: { where: { url: string } }) => {
        const entry = INITIAL_RSS_SOURCES_MANIFEST.find(({ url }) => url === args.where.url);
        return { id: `existing-${entry?.continent}`, continent: entry?.continent };
      },
    );
    const validator = new InitialRssSourcesValidator(new SourceUrlNormalizer());
    const { prisma } = prismaMock(transaction);
    const seeder = new InitialRssSourcesSeeder(prisma, validator);
    const dnsLookup = jest.spyOn(dns.promises, 'lookup');
    const httpRequest = jest.spyOn(http, 'request');
    const httpsRequest = jest.spyOn(https, 'request');
    const fetchRequest = jest.spyOn(globalThis, 'fetch');

    try {
      await expect(seeder.seed(INITIAL_RSS_SOURCES_MANIFEST)).resolves.toEqual({
        created: 0,
        enriched: 0,
        unchanged: 6,
      });
      expect(dnsLookup).not.toHaveBeenCalled();
      expect(httpRequest).not.toHaveBeenCalled();
      expect(httpsRequest).not.toHaveBeenCalled();
      expect(fetchRequest).not.toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('produce contadores coherentes para created, enriched y unchanged', async () => {
    const entries = [
      frozenEntry('https://created.example/rss', Continent.AFRICA),
      frozenEntry('https://enriched.example/rss', Continent.ASIA),
      frozenEntry('https://unchanged.example/rss', Continent.EUROPE),
    ];
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockImplementation(
      async (args: { where: { url: string } }) => {
        if (args.where.url === entries[0].url) {
          return null;
        }
        if (args.where.url === entries[1].url) {
          return { id: 'enriched', continent: null };
        }
        return { id: 'unchanged', continent: Continent.EUROPE };
      },
    );
    const { seeder } = seederWith(entries, transaction);

    const result = await seeder.seed(INITIAL_RSS_SOURCES_MANIFEST);

    expect(result).toEqual({ created: 1, enriched: 1, unchanged: 1 });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('procesa las entradas normalizadas en un orden determinista por URL', async () => {
    const entries = [
      frozenEntry('https://z.example/rss', Continent.AFRICA),
      frozenEntry('https://a.example/rss', Continent.ASIA),
      frozenEntry('https://m.example/rss', Continent.EUROPE),
    ];
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockResolvedValue(null);
    const { seeder } = seederWith(entries, transaction);

    await seeder.seed(INITIAL_RSS_SOURCES_MANIFEST);

    expect(
      transaction.rssSource.findUnique.mock.calls.map(([args]) => args.where.url),
    ).toEqual([
      'https://a.example/rss',
      'https://m.example/rss',
      'https://z.example/rss',
    ]);
  });
});

function frozenEntry(url: string, continent: Continent): InitialRssSourceManifestEntry {
  return Object.freeze({ url, continent });
}

function transactionMock() {
  return {
    rssSource: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function prismaMock(transaction: ReturnType<typeof transactionMock>) {
  const $transaction = jest.fn(
    async (operation: (client: Prisma.TransactionClient) => Promise<unknown>) =>
      operation(transaction as unknown as Prisma.TransactionClient),
  );
  return {
    prisma: { $transaction } as unknown as InitialRssSourcesPrismaClient,
    $transaction,
  };
}

function seederWith(
  entries: readonly InitialRssSourceManifestEntry[],
  transaction: ReturnType<typeof transactionMock>,
) {
  const validate = jest.fn().mockReturnValue(Object.freeze(entries));
  const validator = { validate } as unknown as Pick<InitialRssSourcesValidator, 'validate'>;
  const { prisma, $transaction } = prismaMock(transaction);
  return {
    seeder: new InitialRssSourcesSeeder(prisma, validator),
    validate,
    $transaction,
  };
}
