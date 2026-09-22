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
});
