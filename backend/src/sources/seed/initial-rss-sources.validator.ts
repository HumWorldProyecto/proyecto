import { Continent } from '@prisma/client';
import { SourceUrlNormalizer } from '../domain/source-url-normalizer';
import type { InitialRssSourceManifestEntry } from './initial-rss-sources.manifest';

export type InitialRssSourcesValidationErrorCode =
  | 'MISSING_URL'
  | 'INVALID_CONTINENT'
  | 'INVALID_URL'
  | 'DUPLICATE_NORMALIZED_URL'
  | 'MISSING_CONTINENT';

export class InitialRssSourcesValidationError extends Error {
  constructor(
    readonly code: InitialRssSourcesValidationErrorCode,
    message: string,
    readonly originalCause?: unknown,
  ) {
    super(message);
    this.name = 'InitialRssSourcesValidationError';
  }
}

const REQUIRED_CONTINENTS = Object.freeze(Object.values(Continent));
const REQUIRED_CONTINENT_SET = new Set<string>(REQUIRED_CONTINENTS);

type UntrustedManifestEntry = Readonly<{
  url?: unknown;
  continent?: unknown;
}>;

export class InitialRssSourcesValidator {
  constructor(private readonly urlNormalizer: SourceUrlNormalizer) {}

  validate(
    manifest: readonly InitialRssSourceManifestEntry[],
  ): readonly InitialRssSourceManifestEntry[] {
    const normalizedEntries: InitialRssSourceManifestEntry[] = [];
    const normalizedUrls = new Set<string>();
    const coveredContinents = new Set<Continent>();

    manifest.forEach((entry, index) => {
      const candidate = entry as UntrustedManifestEntry;

      if (typeof candidate.url !== 'string' || candidate.url.trim().length === 0) {
        throw new InitialRssSourcesValidationError(
          'MISSING_URL',
          `La fuente en la posición ${index + 1} debe incluir una URL`,
        );
      }

      if (
        typeof candidate.continent !== 'string' ||
        !REQUIRED_CONTINENT_SET.has(candidate.continent)
      ) {
        throw new InitialRssSourcesValidationError(
          'INVALID_CONTINENT',
          `La fuente en la posición ${index + 1} debe incluir un continente permitido`,
        );
      }

      let normalizedUrl: string;
      try {
        normalizedUrl = this.urlNormalizer.normalize(candidate.url).toString();
      } catch (error) {
        throw new InitialRssSourcesValidationError(
          'INVALID_URL',
          `La URL de la fuente en la posición ${index + 1} no es válida`,
          error,
        );
      }

      if (normalizedUrls.has(normalizedUrl)) {
        throw new InitialRssSourcesValidationError(
          'DUPLICATE_NORMALIZED_URL',
          `La URL normalizada de la fuente en la posición ${index + 1} está duplicada`,
        );
      }

      const continent = candidate.continent as Continent;
      normalizedUrls.add(normalizedUrl);
      coveredContinents.add(continent);
      normalizedEntries.push(Object.freeze({ url: normalizedUrl, continent }));
    });

    const missingContinents = REQUIRED_CONTINENTS.filter(
      (continent) => !coveredContinents.has(continent),
    );
    if (missingContinents.length > 0) {
      throw new InitialRssSourcesValidationError(
        'MISSING_CONTINENT',
        `Faltan fuentes para los continentes: ${missingContinents.join(', ')}`,
      );
    }

    return Object.freeze(normalizedEntries);
  }
}
