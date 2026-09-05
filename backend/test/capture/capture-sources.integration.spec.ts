import { PrismaService } from '../../src/prisma/prisma.service';
import { CaptureOutputPort } from '../../src/capture/ports/capture-output.port';
import { RssFetcherPort } from '../../src/capture/ports/rss-fetcher.port';
import { RssParserPort } from '../../src/capture/ports/rss-parser.port';
import { CaptureOrchestratorService } from '../../src/capture/services/capture-orchestrator.service';
import { PrismaSourceRegistry } from '../../src/sources/integrations/prisma-source-registry';
import { PrismaSourceRepository } from '../../src/sources/repositories/prisma-source.repository';

describe('HU-15 -> HU-01 (integración PostgreSQL real)', () => {
  const prisma = new PrismaService();

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

  it('procesa solo activas y conserva la snapshot aunque una fuente cambie durante la ejecución', async () => {
    const activeA = await prisma.rssSource.create({
      data: { url: 'https://active-a.example/rss' },
    });
    const activeB = await prisma.rssSource.create({
      data: { url: 'https://active-b.example/rss' },
    });
    const inactive = await prisma.rssSource.create({
      data: { url: 'https://inactive.example/rss', active: false },
    });
    const registry = new PrismaSourceRegistry(new PrismaSourceRepository(prisma));
    const fetchRaw = jest.fn(async (url: string) => {
      if (url === activeA.url) {
        await prisma.rssSource.update({ where: { id: activeB.id }, data: { active: false } });
      }
      return '<rss version="2.0"><channel><title>vacío</title></channel></rss>';
    });
    const fetcher: RssFetcherPort = { fetchRaw };
    const parser: RssParserPort = { parse: jest.fn().mockResolvedValue([]) };
    const output: CaptureOutputPort = { emitItems: jest.fn() };
    const orchestrator = new CaptureOrchestratorService(registry, fetcher, parser, output);

    await orchestrator.runCapture();

    expect(fetchRaw.mock.calls.map(([url]) => url)).toEqual([activeA.url, activeB.url]);
    expect(fetchRaw).not.toHaveBeenCalledWith(inactive.url);

    fetchRaw.mockClear();
    await orchestrator.runCapture();

    expect(fetchRaw.mock.calls.map(([url]) => url)).toEqual([activeA.url]);
  });
});
