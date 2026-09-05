import { PrismaSourceRegistry } from '../../src/sources/integrations/prisma-source-registry';
import { SourceRepositoryPort } from '../../src/sources/ports/source-repository.port';

describe('PrismaSourceRegistry', () => {
  it('devuelve una instantánea nueva, inmutable y limitada a id/url de fuentes activas', async () => {
    const row = {
      id: 'source-a',
      url: 'https://example.com/feed',
      active: true,
      createdAt: new Date('2026-09-04T12:00:00.000Z'),
      updatedAt: new Date('2026-09-04T12:00:00.000Z'),
    };
    const repository = {
      list: jest.fn().mockResolvedValue([row]),
    } as unknown as SourceRepositoryPort;
    const registry = new PrismaSourceRegistry(repository);

    const first = await registry.getEligibleSources();
    const second = await registry.getEligibleSources();

    expect(repository.list).toHaveBeenNthCalledWith(1, true);
    expect(repository.list).toHaveBeenNthCalledWith(2, true);
    expect(first).toEqual([{ id: 'source-a', url: 'https://example.com/feed' }]);
    expect(Object.keys(first[0])).toEqual(['id', 'url']);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(row);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
  });
});
