import type { Prisma } from '@prisma/client';
import { INITIAL_RSS_SOURCES_MANIFEST } from '../../src/sources/seed/initial-rss-sources.manifest';
import {
  type InitialRssSourcesLoaderOutput,
  type InitialRssSourcesLoaderPrismaClient,
  runInitialRssSourcesLoader,
} from '../../src/sources/seed/load-initial-rss-sources';

describe('runInitialRssSourcesLoader', () => {
  const initialExitCode = process.exitCode;

  beforeEach(() => {
    process.exitCode = undefined;
  });

  afterAll(() => {
    process.exitCode = initialExitCode;
  });

  it('informa el resumen y siempre desconecta después de una carga exitosa', async () => {
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockImplementation(
      async (args: { where: { url: string } }) => {
        const entry = INITIAL_RSS_SOURCES_MANIFEST.find(({ url }) => url === args.where.url);
        return { id: `existing-${entry?.continent}`, continent: entry?.continent };
      },
    );
    const { prisma, disconnect } = prismaMock(transaction);
    const output = outputMock();

    await runInitialRssSourcesLoader(prisma, output);

    expect(output.log).toHaveBeenCalledWith(
      'Carga inicial completada: created=0, enriched=0, unchanged=6.',
    );
    expect(output.error).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();
  });

  it('marca exitCode, emite un mensaje controlado y desconecta ante un fallo', async () => {
    const internalError = new Error('database-secret-detail');
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      $transaction: jest.fn().mockRejectedValue(internalError),
      $disconnect: disconnect,
    } as unknown as InitialRssSourcesLoaderPrismaClient;
    const output = outputMock();

    await runInitialRssSourcesLoader(prisma, output);

    expect(output.log).not.toHaveBeenCalled();
    expect(output.error).toHaveBeenCalledWith(
      'No se pudo completar la carga inicial de fuentes RSS.',
    );
    expect(output.error.mock.calls.flat().join(' ')).not.toContain('database-secret-detail');
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
  });

  it('marca exitCode si falla el cierre de Prisma', async () => {
    const transaction = transactionMock();
    transaction.rssSource.findUnique.mockImplementation(
      async (args: { where: { url: string } }) => {
        const entry = INITIAL_RSS_SOURCES_MANIFEST.find(({ url }) => url === args.where.url);
        return { id: `existing-${entry?.continent}`, continent: entry?.continent };
      },
    );
    const { prisma } = prismaMock(transaction, new Error('disconnect detail'));
    const output = outputMock();

    await runInitialRssSourcesLoader(prisma, output);

    expect(output.error).toHaveBeenCalledWith(
      'No se pudo cerrar correctamente la conexión de Prisma.',
    );
    expect(output.error.mock.calls.flat().join(' ')).not.toContain('disconnect detail');
    expect(process.exitCode).toBe(1);
  });
});

function transactionMock() {
  return {
    rssSource: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function prismaMock(
  transaction: ReturnType<typeof transactionMock>,
  disconnectError?: Error,
) {
  const $transaction = jest.fn(
    async (operation: (client: Prisma.TransactionClient) => Promise<unknown>) =>
      operation(transaction as unknown as Prisma.TransactionClient),
  );
  const disconnect = disconnectError
    ? jest.fn().mockRejectedValue(disconnectError)
    : jest.fn().mockResolvedValue(undefined);
  return {
    prisma: {
      $transaction,
      $disconnect: disconnect,
    } as unknown as InitialRssSourcesLoaderPrismaClient,
    disconnect,
  };
}

function outputMock() {
  return {
    log: jest.fn(),
    error: jest.fn(),
  } as unknown as InitialRssSourcesLoaderOutput & {
    log: jest.Mock;
    error: jest.Mock;
  };
}
