import { Continent } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaSourceRegistry } from '../../src/sources/integrations/prisma-source-registry';
import { PrismaSourceRepository } from '../../src/sources/repositories/prisma-source.repository';

describe('PrismaSourceRegistry (integración, PostgreSQL real)', () => {
  const prisma = new PrismaService();
  const registry = new PrismaSourceRegistry(new PrismaSourceRepository(prisma));

  beforeAll(async () => prisma.$connect());

  beforeEach(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
  });

  afterAll(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await prisma.$disconnect();
  });

  it('distingue por ID una fuente inexistente, inactiva y activa elegible', async () => {
    const inactive = await prisma.rssSource.create({
      data: { url: 'https://inactive.example/feed', active: false },
    });
    const active = await prisma.rssSource.create({
      data: { url: 'https://active.example/feed' },
    });

    await expect(
      registry.findForCapture('00000000-0000-0000-0000-000000000000'),
    ).resolves.toEqual({ kind: 'missing' });
    await expect(registry.findForCapture(inactive.id)).resolves.toEqual({
      kind: 'inactive',
      sourceId: inactive.id,
    });
    await expect(registry.findForCapture(active.id)).resolves.toEqual({
      kind: 'eligible',
      source: { id: active.id, url: active.url },
    });
  });

  it('proyecta solo id y url para fuentes con y sin continente', async () => {
    const withoutContinent = await prisma.rssSource.create({
      data: {
        id: 'registry-without-continent',
        url: 'https://without-continent.example/feed',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const withContinent = await prisma.rssSource.create({
      data: {
        id: 'registry-with-continent',
        url: 'https://with-continent.example/feed',
        continent: Continent.OCEANIA,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    });

    await expect(registry.getEligibleSources()).resolves.toEqual([
      { id: withoutContinent.id, url: withoutContinent.url },
      { id: withContinent.id, url: withContinent.url },
    ]);
    await expect(registry.findForCapture(withContinent.id)).resolves.toEqual({
      kind: 'eligible',
      source: { id: withContinent.id, url: withContinent.url },
    });
  });
});
