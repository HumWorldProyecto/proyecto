import { randomUUID } from 'crypto';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { Continent, PrismaClient } from '@prisma/client';
import { INITIAL_RSS_SOURCES_MANIFEST } from '../../src/sources/seed/initial-rss-sources.manifest';

const BACKEND_ROOT = resolve(__dirname, '../..');
const PRISMA_CLI = resolve(BACKEND_ROOT, 'node_modules/prisma/build/index.js');
const LOADER = resolve(
  BACKEND_ROOT,
  'dist/sources/seed/load-initial-rss-sources.js',
);
const EXPECTED_MIGRATIONS = [
  '20260831150455_init_news',
  '20260904014216_add_sources_config_and_news_identity',
  '20261001000000_add_rss_source_continent',
] as const;
const EXPECTED_CONTINENTS = [
  'AFRICA',
  'ASIA',
  'EUROPE',
  'NORTH_AMERICA',
  'SOUTH_AMERICA',
  'OCEANIA',
] as const;

jest.setTimeout(120_000);

describe('HU-14 (integración, PostgreSQL 16 real)', () => {
  const baseDatabaseUrl = requiredDatabaseUrl();
  const admin = prismaFor(databaseUrlFor('postgres'));
  const databases = new Set<string>();

  beforeAll(async () => admin.$connect());

  afterAll(async () => {
    for (const databaseName of [...databases].reverse()) {
      await admin.$executeRaw`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = ${databaseName} AND pid <> pg_backend_pid()
      `;
      await admin.$executeRawUnsafe(`DROP DATABASE "${databaseName}"`);
    }
    await admin.$disconnect();
  });

  it('aplica todas las migraciones sobre una base vacía', async () => {
    const databaseUrl = await createDatabase('empty');

    runPrisma(['migrate', 'deploy'], databaseUrl);

    const prisma = prismaFor(databaseUrl);
    try {
      const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
        ORDER BY started_at
      `;
      const continents = await prisma.$queryRaw<Array<{ value: string }>>`
        SELECT enumlabel AS value
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = 'Continent'
        ORDER BY enumsortorder
      `;
      const columns = await prisma.$queryRaw<
        Array<{ column_name: string; is_nullable: string; udt_name: string }>
      >`
        SELECT column_name, is_nullable, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'rss_sources'
      `;
      const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'rss_sources'
      `;

      expect(migrations.map(({ migration_name }) => migration_name)).toEqual(
        EXPECTED_MIGRATIONS,
      );
      expect(continents.map(({ value }) => value)).toEqual(EXPECTED_CONTINENTS);
      expect(columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'continent',
            is_nullable: 'YES',
            udt_name: 'Continent',
          }),
        ]),
      );
      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            indexname: 'rss_sources_url_key',
            indexdef: expect.stringContaining('UNIQUE'),
          }),
        ]),
      );
    } finally {
      await prisma.$disconnect();
    }
  });

  it('actualiza el esquema anterior preservando fuentes, estados, noticias y relaciones', async () => {
    const databaseUrl = await createDatabase('upgrade');
    applyHistoricalMigration(databaseUrl, EXPECTED_MIGRATIONS[0]);
    applyHistoricalMigration(databaseUrl, EXPECTED_MIGRATIONS[1]);

    const beforeMigration = prismaFor(databaseUrl);
    try {
      await beforeMigration.$executeRawUnsafe(`
        INSERT INTO "rss_sources" ("id", "url", "active", "createdAt", "updatedAt")
        VALUES
          ('legacy-active', 'https://legacy-active.example/rss', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('legacy-inactive', 'https://legacy-inactive.example/rss', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      await beforeMigration.$executeRawUnsafe(`
        INSERT INTO "news" ("id", "sourceId", "title", "dedupeKey", "capturedAt")
        VALUES
          ('legacy-news-active', 'legacy-active', 'Activa', 'guid:legacy-active', CURRENT_TIMESTAMP),
          ('legacy-news-inactive', 'legacy-inactive', 'Inactiva', 'guid:legacy-inactive', CURRENT_TIMESTAMP)
      `);
    } finally {
      await beforeMigration.$disconnect();
    }

    runPrisma(['migrate', 'deploy'], databaseUrl);

    const afterMigration = prismaFor(databaseUrl);
    try {
      await expect(
        afterMigration.rssSource.findMany({
          orderBy: { id: 'asc' },
          select: { id: true, url: true, active: true, continent: true },
        }),
      ).resolves.toEqual([
        {
          id: 'legacy-active',
          url: 'https://legacy-active.example/rss',
          active: true,
          continent: null,
        },
        {
          id: 'legacy-inactive',
          url: 'https://legacy-inactive.example/rss',
          active: false,
          continent: null,
        },
      ]);
      await expect(
        afterMigration.news.findMany({
          orderBy: { id: 'asc' },
          select: { id: true, sourceId: true, title: true, dedupeKey: true },
        }),
      ).resolves.toEqual([
        {
          id: 'legacy-news-active',
          sourceId: 'legacy-active',
          title: 'Activa',
          dedupeKey: 'guid:legacy-active',
        },
        {
          id: 'legacy-news-inactive',
          sourceId: 'legacy-inactive',
          title: 'Inactiva',
          dedupeKey: 'guid:legacy-inactive',
        },
      ]);

      const newsColumns = await afterMigration.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'news'
        ORDER BY ordinal_position
      `;
      expect(newsColumns.map(({ column_name }) => column_name)).not.toContain('continent');
    } finally {
      await afterMigration.$disconnect();
    }
  });

  it('ejecuta el loader compilado, crea la cobertura completa y es idempotente', async () => {
    const databaseUrl = await migratedDatabase('loader');
    expect(existsSync(LOADER)).toBe(true);

    const firstRun = runLoader(databaseUrl);
    expect(firstRun.status).toBe(0);
    expect(firstRun.stdout).toContain('created=6, enriched=0, unchanged=0');

    const prisma = prismaFor(databaseUrl);
    try {
      const firstSnapshot = await prisma.rssSource.findMany({
        orderBy: { url: 'asc' },
        select: {
          id: true,
          url: true,
          active: true,
          continent: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(firstSnapshot).toHaveLength(6);
      expect(firstSnapshot.every(({ active }) => active)).toBe(true);
      expect(new Set(firstSnapshot.map(({ continent }) => continent))).toEqual(
        new Set(EXPECTED_CONTINENTS),
      );

      await expect(
        prisma.rssSource.create({
          data: {
            url: firstSnapshot[0].url,
            continent: firstSnapshot[0].continent,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });

      const secondRun = runLoader(databaseUrl);
      expect(secondRun.status).toBe(0);
      expect(secondRun.stdout).toContain('created=0, enriched=0, unchanged=6');
      await expect(
        prisma.rssSource.findMany({
          orderBy: { url: 'asc' },
          select: {
            id: true,
            url: true,
            active: true,
            continent: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ).resolves.toEqual(firstSnapshot);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('enriquece fuentes existentes sin cambiar IDs, active ni noticias', async () => {
    const databaseUrl = await migratedDatabase('enrichment');
    const [activeEntry, inactiveEntry] = INITIAL_RSS_SOURCES_MANIFEST;
    const prisma = prismaFor(databaseUrl);

    try {
      await prisma.rssSource.createMany({
        data: [
          {
            id: 'existing-active',
            url: activeEntry.url,
            active: true,
            continent: null,
          },
          {
            id: 'existing-inactive',
            url: inactiveEntry.url,
            active: false,
            continent: null,
          },
        ],
      });
      await prisma.news.create({
        data: {
          id: 'existing-news',
          sourceId: 'existing-inactive',
          title: 'Conservar',
          dedupeKey: 'guid:existing-news',
        },
      });

      const run = runLoader(databaseUrl);
      expect(run.status).toBe(0);
      expect(run.stdout).toContain('created=4, enriched=2, unchanged=0');
      await expect(
        prisma.rssSource.findMany({
          where: { id: { in: ['existing-active', 'existing-inactive'] } },
          orderBy: { id: 'asc' },
          select: { id: true, active: true, continent: true },
        }),
      ).resolves.toEqual([
        {
          id: 'existing-active',
          active: true,
          continent: activeEntry.continent,
        },
        {
          id: 'existing-inactive',
          active: false,
          continent: inactiveEntry.continent,
        },
      ]);
      await expect(
        prisma.news.findUnique({
          where: { id: 'existing-news' },
          select: { id: true, sourceId: true, title: true, dedupeKey: true },
        }),
      ).resolves.toEqual({
        id: 'existing-news',
        sourceId: 'existing-inactive',
        title: 'Conservar',
        dedupeKey: 'guid:existing-news',
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('revierte toda la carga ante un conflicto continental tardío', async () => {
    const databaseUrl = await migratedDatabase('conflict');
    const orderedEntries = [...INITIAL_RSS_SOURCES_MANIFEST].sort((left, right) =>
      left.url.localeCompare(right.url),
    );
    const firstEntry = orderedEntries[0];
    const conflictEntry = orderedEntries[orderedEntries.length - 1];
    const incompatible =
      conflictEntry.continent === Continent.AFRICA ? Continent.ASIA : Continent.AFRICA;
    const prisma = prismaFor(databaseUrl);

    try {
      await prisma.rssSource.createMany({
        data: [
          {
            id: 'rollback-enrichment',
            url: firstEntry.url,
            active: false,
            continent: null,
          },
          {
            id: 'rollback-conflict',
            url: conflictEntry.url,
            active: true,
            continent: incompatible,
          },
        ],
      });

      const run = runLoader(databaseUrl);
      expect(run.status).toBe(1);
      expect(run.stderr).toContain('INITIAL_RSS_SOURCE_CONTINENT_CONFLICT');
      await expect(
        prisma.rssSource.findMany({
          orderBy: { id: 'asc' },
          select: { id: true, active: true, continent: true },
        }),
      ).resolves.toEqual([
        {
          id: 'rollback-conflict',
          active: true,
          continent: incompatible,
        },
        {
          id: 'rollback-enrichment',
          active: false,
          continent: null,
        },
      ]);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('revierte un fallo PostgreSQL tardío y permite repetir después', async () => {
    const databaseUrl = await migratedDatabase('postgres_failure');
    const orderedEntries = [...INITIAL_RSS_SOURCES_MANIFEST].sort((left, right) =>
      left.url.localeCompare(right.url),
    );
    const lastEntry = orderedEntries[orderedEntries.length - 1];
    const prisma = prismaFor(databaseUrl);

    try {
      await prisma.$executeRawUnsafe(`
        CREATE FUNCTION hu14_fail_late_seed() RETURNS trigger AS $$
        BEGIN
          IF NEW.url = '${lastEntry.url}' THEN
            RAISE EXCEPTION 'forced HU-14 late persistence failure';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER hu14_fail_late_seed_trigger
        BEFORE INSERT ON "rss_sources"
        FOR EACH ROW EXECUTE FUNCTION hu14_fail_late_seed()
      `);

      const failedRun = runLoader(databaseUrl);
      expect(failedRun.status).toBe(1);
      expect(failedRun.stderr).toContain(
        'No se pudo completar la carga inicial de fuentes RSS.',
      );
      await expect(prisma.rssSource.count()).resolves.toBe(0);

      await prisma.$executeRawUnsafe(
        'DROP TRIGGER hu14_fail_late_seed_trigger ON "rss_sources"',
      );
      await prisma.$executeRawUnsafe('DROP FUNCTION hu14_fail_late_seed()');

      const retry = runLoader(databaseUrl);
      expect(retry.status).toBe(0);
      expect(retry.stdout).toContain('created=6, enriched=0, unchanged=0');
      await expect(prisma.rssSource.count()).resolves.toBe(6);
    } finally {
      await prisma.$disconnect();
    }
  });

  async function createDatabase(label: string): Promise<string> {
    const databaseName = `hu14_${label}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    databases.add(databaseName);
    return databaseUrlFor(databaseName);
  }

  async function migratedDatabase(label: string): Promise<string> {
    const databaseUrl = await createDatabase(label);
    runPrisma(['migrate', 'deploy'], databaseUrl);
    return databaseUrl;
  }

  function applyHistoricalMigration(databaseUrl: string, migrationName: string): void {
    runPrisma(
      [
        'db',
        'execute',
        '--file',
        resolve(BACKEND_ROOT, 'prisma/migrations', migrationName, 'migration.sql'),
        '--schema',
        resolve(BACKEND_ROOT, 'prisma/schema.prisma'),
      ],
      databaseUrl,
    );
    runPrisma(['migrate', 'resolve', '--applied', migrationName], databaseUrl);
  }

  function databaseUrlFor(databaseName: string): string {
    const url = new URL(baseDatabaseUrl);
    url.pathname = `/${databaseName}`;
    url.search = '';
    url.searchParams.set('schema', 'public');
    return url.toString();
  }
});

function requiredDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error('DATABASE_URL es obligatoria para la integración PostgreSQL de HU-14');
  }
  return value;
}

function prismaFor(databaseUrl: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
}

function runPrisma(args: readonly string[], databaseUrl: string): void {
  const result = spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(
      `Prisma ${args.join(' ')} falló (${result.status}).\n${result.stdout}\n${result.stderr}`,
    );
  }
}

function runLoader(databaseUrl: string): Readonly<{
  status: number | null;
  stdout: string;
  stderr: string;
}> {
  const result = spawnSync(process.execPath, [LOADER], {
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
  });
  return Object.freeze({
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  });
}
