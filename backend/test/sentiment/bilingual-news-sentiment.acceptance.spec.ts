import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  NewsForSentimentReadError,
  SentimentDictionaryReadError,
} from '../../src/sentiment/errors/sentiment-analysis.error';
import { SentimentModule } from '../../src/sentiment/sentiment.module';
import { NewsSentimentAnalysisService } from '../../src/sentiment/services/news-sentiment-analysis.service';

describe('HU-07 análisis bilingüe de noticias (aceptación, PostgreSQL real)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let newsAnalysis: NewsSentimentAnalysisService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [SentimentModule] }).compile();
    prisma = moduleRef.get(PrismaService);
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

  it('produce resultados positivos y negativos para noticias ES/EN, asociados y deterministas', async () => {
    await prisma.dictionaryEntry.createMany({
      data: [
        { term: 'excelente', language: 'es', weight: 5 },
        { term: 'pésimo', language: 'es', weight: -5 },
        { term: 'excellent', language: 'en', weight: 5 },
        { term: 'awful', language: 'en', weight: -5 },
      ],
    });
    const spanishPositive = await createNews('Un resultado excelente', null, 'es-positive');
    const spanishNegative = await createNews('Un resultado pésimo', null, 'es-negative');
    const englishPositive = await createNews('An excellent result', null, 'en-positive');
    const englishNegative = await createNews('An awful result', null, 'en-negative');
    const before = await prisma.news.findMany({ orderBy: { id: 'asc' } });

    await expect(
      newsAnalysis.analyzeNews({ newsId: spanishPositive.id, language: 'es' }),
    ).resolves.toEqual({ newsId: spanishPositive.id, score: 1, matchedTerms: 1 });
    await expect(
      newsAnalysis.analyzeNews({ newsId: spanishNegative.id, language: 'es' }),
    ).resolves.toEqual({ newsId: spanishNegative.id, score: -1, matchedTerms: 1 });
    const firstEnglish = await newsAnalysis.analyzeNews({
      newsId: englishPositive.id,
      language: 'en',
    });
    const repeatedEnglish = await newsAnalysis.analyzeNews({
      newsId: englishPositive.id,
      language: 'en',
    });
    expect(firstEnglish).toEqual({ newsId: englishPositive.id, score: 1, matchedTerms: 1 });
    expect(repeatedEnglish).toEqual(firstEnglish);
    await expect(
      newsAnalysis.analyzeNews({ newsId: englishNegative.id, language: 'en' }),
    ).resolves.toEqual({ newsId: englishNegative.id, score: -1, matchedTerms: 1 });

    await expect(prisma.news.findMany({ orderBy: { id: 'asc' } })).resolves.toEqual(before);
  });

  it('aísla por idioma la misma forma con pesos distintos y términos exclusivos', async () => {
    await prisma.dictionaryEntry.createMany({
      data: [
        { term: 'actual', language: 'es', weight: 5 },
        { term: 'actual', language: 'en', weight: -5 },
        { term: 'solo español', language: 'es', weight: 5 },
        { term: 'english only', language: 'en', weight: 5 },
      ],
    });
    const sharedForm = await createNews('actual', null, 'shared-form');
    const oppositeTerms = await createNews(
      'english only',
      'solo español',
      'opposite-terms',
    );

    await expect(
      newsAnalysis.analyzeNews({ newsId: sharedForm.id, language: 'es' }),
    ).resolves.toEqual({ newsId: sharedForm.id, score: 1, matchedTerms: 1 });
    await expect(
      newsAnalysis.analyzeNews({ newsId: sharedForm.id, language: 'en' }),
    ).resolves.toEqual({ newsId: sharedForm.id, score: -1, matchedTerms: 1 });
    await expect(
      newsAnalysis.analyzeNews({ newsId: oppositeTerms.id, language: 'es' }),
    ).resolves.toEqual({ newsId: oppositeTerms.id, score: 1, matchedTerms: 1 });
    await expect(
      newsAnalysis.analyzeNews({ newsId: oppositeTerms.id, language: 'en' }),
    ).resolves.toEqual({ newsId: oppositeTerms.id, score: 1, matchedTerms: 1 });
  });

  it('propaga un fallo real de lectura de News en lugar de informar neutralidad', async () => {
    await prisma.$executeRawUnsafe('ALTER TABLE "news" RENAME TO "news_unavailable"');
    try {
      await expect(
        newsAnalysis.analyzeNews({
          newsId: '11111111-1111-4111-8111-111111111111',
          language: 'es',
        }),
      ).rejects.toBeInstanceOf(NewsForSentimentReadError);
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "news_unavailable" RENAME TO "news"');
    }
  });

  it('propaga un fallo real del diccionario en lugar de informar neutralidad', async () => {
    const news = await createNews('texto analizable', null, 'dictionary-failure');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "dictionary_entries" RENAME TO "dictionary_entries_unavailable"',
    );
    try {
      await expect(
        newsAnalysis.analyzeNews({ newsId: news.id, language: 'en' }),
      ).rejects.toBeInstanceOf(SentimentDictionaryReadError);
    } finally {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "dictionary_entries_unavailable" RENAME TO "dictionary_entries"',
      );
    }
  });

  async function createNews(
    title: string | null,
    description: string | null,
    guid: string,
  ): Promise<{ id: string }> {
    const source = await prisma.rssSource.upsert({
      where: { url: 'https://hu07.example/feed' },
      update: {},
      create: { url: 'https://hu07.example/feed', active: true },
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
