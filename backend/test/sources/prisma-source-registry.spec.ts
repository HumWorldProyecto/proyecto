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
      findById: jest.fn(),
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

  it('distingue fuente inexistente, inactiva y elegible sin exponer el modelo persistente', async () => {
    const inactive = {
      id: 'inactive',
      url: 'https://inactive.example.com/feed',
      active: false,
      createdAt: new Date('2026-09-22T12:00:00.000Z'),
      updatedAt: new Date('2026-09-22T12:00:00.000Z'),
    };
    const active = { ...inactive, id: 'active', active: true };
    const findById = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(inactive)
      .mockResolvedValueOnce(active);
    const repository = { findById } as unknown as SourceRepositoryPort;
    const registry = new PrismaSourceRegistry(repository);

    await expect(registry.findForCapture('missing')).resolves.toEqual({ kind: 'missing' });
    await expect(registry.findForCapture('inactive')).resolves.toEqual({
      kind: 'inactive',
      sourceId: 'inactive',
    });
    const eligible = await registry.findForCapture('active');

    expect(eligible).toEqual({
      kind: 'eligible',
      source: { id: 'active', url: 'https://inactive.example.com/feed' },
    });
    expect(Object.isFrozen(eligible)).toBe(true);
    if (eligible.kind === 'eligible') {
      expect(Object.isFrozen(eligible.source)).toBe(true);
      expect(Object.keys(eligible.source)).toEqual(['id', 'url']);
    }
    expect(findById.mock.calls.map(([id]) => id)).toEqual(['missing', 'inactive', 'active']);
  });
});
