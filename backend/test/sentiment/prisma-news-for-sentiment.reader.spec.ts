import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaNewsForSentimentReader } from '../../src/sentiment/adapters/prisma-news-for-sentiment.reader';
import { NewsForSentimentReadError } from '../../src/sentiment/errors/sentiment-analysis.error';

describe('PrismaNewsForSentimentReader', () => {
  const findUnique = jest.fn();
  const prisma = { news: { findUnique } } as unknown as PrismaService;
  const reader = new PrismaNewsForSentimentReader(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selecciona únicamente id, title y description y devuelve una proyección inmutable', async () => {
    findUnique.mockResolvedValue({ id: 'news-a', title: 'Título', description: 'Descripción' });

    const result = await reader.findById('news-a');

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'news-a' },
      select: { id: true, title: true, description: true },
    });
    expect(result).toEqual({ id: 'news-a', title: 'Título', description: 'Descripción' });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('devuelve null cuando la noticia no existe', async () => {
    findUnique.mockResolvedValue(null);
    await expect(reader.findById('missing')).resolves.toBeNull();
  });

  it('sanea un fallo de consulta Prisma', async () => {
    findUnique.mockRejectedValue(new Error('SQL password=secret host=10.0.0.2'));

    try {
      await reader.findById('news-a');
      throw new Error('Se esperaba NewsForSentimentReadError');
    } catch (error) {
      expect(error).toBeInstanceOf(NewsForSentimentReadError);
      expect(JSON.stringify(error)).not.toMatch(/password|secret|10\.0\.0\.2|SQL/);
    }
  });
});
