import { PrismaClient } from '@prisma/client';
import { SourceUrlNormalizer } from '../domain/source-url-normalizer';
import { INITIAL_RSS_SOURCES_MANIFEST } from './initial-rss-sources.manifest';
import {
  InitialRssSourceContinentConflictError,
  type InitialRssSourcesPrismaClient,
  InitialRssSourcesSeeder,
} from './initial-rss-sources.seeder';
import {
  InitialRssSourcesValidationError,
  InitialRssSourcesValidator,
} from './initial-rss-sources.validator';

export type InitialRssSourcesLoaderPrismaClient = InitialRssSourcesPrismaClient &
  Pick<PrismaClient, '$disconnect'>;

export type InitialRssSourcesLoaderOutput = Pick<Console, 'log' | 'error'>;

export async function runInitialRssSourcesLoader(
  prisma: InitialRssSourcesLoaderPrismaClient = new PrismaClient(),
  output: InitialRssSourcesLoaderOutput = console,
): Promise<void> {
  try {
    const normalizer = new SourceUrlNormalizer();
    const validator = new InitialRssSourcesValidator(normalizer);
    const seeder = new InitialRssSourcesSeeder(prisma, validator);
    const result = await seeder.seed(INITIAL_RSS_SOURCES_MANIFEST);

    output.log(
      `Carga inicial completada: created=${result.created}, enriched=${result.enriched}, unchanged=${result.unchanged}.`,
    );
  } catch (error) {
    output.error(operatorMessage(error));
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      output.error('No se pudo cerrar correctamente la conexión de Prisma.');
      process.exitCode = 1;
    }
  }
}

function operatorMessage(error: unknown): string {
  if (error instanceof InitialRssSourcesValidationError) {
    return `El manifiesto inicial no es válido (${error.code}).`;
  }

  if (error instanceof InitialRssSourceContinentConflictError) {
    return `La carga inicial se detuvo por un conflicto continental (${error.code}).`;
  }

  return 'No se pudo completar la carga inicial de fuentes RSS.';
}

if (require.main === module) {
  void runInitialRssSourcesLoader();
}
