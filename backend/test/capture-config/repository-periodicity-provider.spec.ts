import { RepositoryPeriodicityProvider } from '../../src/capture-config/integrations/repository-periodicity-provider';
import { PeriodicityRepositoryPort } from '../../src/capture-config/ports/periodicity-repository.port';

describe('RepositoryPeriodicityProvider', () => {
  it.each([
    { kind: 'unconfigured' as const },
    { kind: 'configured' as const, minutes: 720 as const },
  ])('expone el estado tipado $kind', async (state) => {
    const repository = {
      getCurrent: jest.fn().mockResolvedValue({ state, updatedAt: null }),
    } as unknown as PeriodicityRepositoryPort;
    const provider = new RepositoryPeriodicityProvider(repository);

    await expect(provider.getCurrentState()).resolves.toBe(state);
  });
});
