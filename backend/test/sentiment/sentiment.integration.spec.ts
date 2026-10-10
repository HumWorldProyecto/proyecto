import { TestingModule, Test } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NewsForSentimentNotFoundError } from '../../src/sentiment/errors/sentiment-analysis.error';
import { SENTIMENT_ANALYZER_PORT, SentimentAnalyzerPort } from '../../src/sentiment/ports/sentiment-analyzer.port';
import { SentimentModule } from '../../src/sentiment/sentiment.module';
import { NewsSentimentAnalysisService } from '../../src/sentiment/services/news-sentiment-analysis.service';

describe('SentimentModule (integración, PostgreSQL real)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let analyzer: SentimentAnalyzerPort;
  let newsAnalysis: NewsSentimentAnalysisService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [SentimentModule] }).compile();
    prisma = moduleRef.get(PrismaService);
    analyzer = moduleRef.get(SENTIMENT_ANALYZER_PORT);
    newsAnalysis = moduleRef.get(NewsSentimentAnalysisService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
    await moduleRef.close();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('analiza una noticia real con frases, campos separados y preserva todos sus datos', async () => {
    await prisma.dictionaryEntry.createMany({
      data: [
        { term: 'bueno', language: 'es', weight: 2 },
        { term: 'muy bueno', language: 'es', weight: 5 },
        { term: 'malo', language: 'es', weight: -5 },
      ],
    });
    const news = await createNews('<b>MUY bueno</b>', 'malo, bueno');
    const before = await prisma.news.findUniqueOrThrow({ where: { id: news.id } });

    await expect(newsAnalysis.analyzeNews({ newsId: news.id, language: 'es' })).resolves.toEqual({
      newsId: news.id,
      score: 0.1333,
      matchedTerms: 3,
    });

    await expect(prisma.news.findUniqueOrThrow({ where: { id: news.id } })).resolves.toEqual(before);
  });

  it('selecciona exclusivamente el diccionario del idioma explícito', async () => {
    await prisma.dictionaryEntry.createMany({
      data: [
        { term: 'success', language: 'en', weight: 5 },
        { term: 'success', language: 'es', weight: -5 },
      ],
    });

    await expect(analyzer.analyze({ language: 'en', segments: ['SUCCESS'] })).resolves.toEqual({
      score: 1,
      matchedTerms: 1,
    });
    await expect(analyzer.analyze({ language: 'es', segments: ['SUCCESS'] })).resolves.toEqual({
      score: -1,
      matchedTerms: 1,
    });
  });

  it('refleja create/update/delete del diccionario solo en nuevas invocaciones', async () => {
    const dictionaryEntry = await prisma.dictionaryEntry.create({
      data: { term: 'cambio', language: 'es', weight: 1 },
    });

    const first = await analyzer.analyze({ language: 'es', segments: ['cambio'] });
    await prisma.dictionaryEntry.update({ where: { id: dictionaryEntry.id }, data: { weight: 5 } });
    const second = await analyzer.analyze({ language: 'es', segments: ['cambio'] });
    await prisma.dictionaryEntry.delete({ where: { id: dictionaryEntry.id } });
    const third = await analyzer.analyze({ language: 'es', segments: ['cambio'] });

    expect(first).toEqual({ score: 0.2, matchedTerms: 1 });
    expect(second).toEqual({ score: 1, matchedTerms: 1 });
    expect(third).toEqual({ score: 0, matchedTerms: 0 });
  });

  it('maneja diccionario vacío y noticia existente sin texto analizable', async () => {
    const normal = await createNews('sin coincidencias', null);
    const empty = await createNews(null, '<p>!!!</p>', 'empty-guid');

    await expect(newsAnalysis.analyzeNews({ newsId: normal.id, language: 'es' })).resolves.toEqual({
      newsId: normal.id,
      score: 0,
      matchedTerms: 0,
    });
    await expect(newsAnalysis.analyzeNews({ newsId: empty.id, language: 'es' })).resolves.toEqual({
      newsId: empty.id,
      score: 0,
      matchedTerms: 0,
    });
  });

  it('rechaza un newsId inexistente sin crear ni actualizar noticias', async () => {
    await expect(
      newsAnalysis.analyzeNews({
        newsId: '11111111-1111-4111-8111-111111111111',
        language: 'es',
      }),
    ).rejects.toBeInstanceOf(NewsForSentimentNotFoundError);
    await expect(prisma.news.count()).resolves.toBe(0);
  });

  async function createNews(
    title: string | null,
    description: string | null,
    guid = 'sentiment-guid',
  ): Promise<{ id: string }> {
    const source = await prisma.rssSource.upsert({
      where: { url: 'https://sentiment.example/feed' },
      update: {},
      create: { url: 'https://sentiment.example/feed', active: true },
    });
    return prisma.news.create({
      data: {
        sourceId: source.id,
        title,
        description,
        guid,
        dedupeKey: `guid:${guid}`,
      },
      select: { id: true },
    });
  }

  async function clearDatabase(): Promise<void> {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await prisma.dictionaryEntry.deleteMany();
  }
});
