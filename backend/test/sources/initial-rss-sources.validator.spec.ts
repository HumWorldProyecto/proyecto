import { Continent } from '@prisma/client';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { SourceUrlNormalizer } from '../../src/sources/domain/source-url-normalizer';
import {
  INITIAL_RSS_SOURCES_MANIFEST,
  type InitialRssSourceManifestEntry,
} from '../../src/sources/seed/initial-rss-sources.manifest';
import {
  InitialRssSourcesValidationError,
  type InitialRssSourcesValidationErrorCode,
  InitialRssSourcesValidator,
} from '../../src/sources/seed/initial-rss-sources.validator';

describe('INITIAL_RSS_SOURCES_MANIFEST', () => {
  it('contiene exactamente las seis asociaciones URL-continente aprobadas', () => {
    expect(INITIAL_RSS_SOURCES_MANIFEST).toEqual([
      { url: 'https://africanews.com/feed/rss', continent: Continent.AFRICA },
      {
        url: 'https://www.straitstimes.com/news/asia/rss.xml',
        continent: Continent.ASIA,
      },
      {
        url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=news',
        continent: Continent.EUROPE,
      },
      {
        url: 'https://moxie.foxnews.com/google-publisher/latest.xml',
        continent: Continent.NORTH_AMERICA,
      },
      {
        url: 'https://en.mercopress.com/rss/',
        continent: Continent.SOUTH_AMERICA,
      },
      {
        url: 'https://www.theguardian.com/australia-news/rss',
        continent: Continent.OCEANIA,
      },
    ]);
  });

  it('cubre la taxonomía exacta, excluye Antártida y es inmutable', () => {
    expect(new Set(INITIAL_RSS_SOURCES_MANIFEST.map(({ continent }) => continent))).toEqual(
      new Set(Object.values(Continent)),
    );
    expect(INITIAL_RSS_SOURCES_MANIFEST).toHaveLength(6);
    expect(Object.values(Continent)).not.toContain('ANTARCTICA');
    expect(Object.isFrozen(INITIAL_RSS_SOURCES_MANIFEST)).toBe(true);
    expect(INITIAL_RSS_SOURCES_MANIFEST.every(Object.isFrozen)).toBe(true);
  });
});

describe('InitialRssSourcesValidator', () => {
  const validator = new InitialRssSourcesValidator(new SourceUrlNormalizer());

  it('acepta la cobertura completa y devuelve una colección normalizada e inmutable', () => {
    const manifest = replaceEntry(0, {
      url: '  https://AFRICANEWS.COM/feed/rss  ',
      continent: Continent.AFRICA,
    });

    const result = validator.validate(manifest);

    expect(result[0]).toEqual({
      url: 'https://africanews.com/feed/rss',
      continent: Continent.AFRICA,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.every(Object.isFrozen)).toBe(true);
  });

  it('rechaza cobertura continental incompleta', () => {
    expectValidationError(
      () => validator.validate(INITIAL_RSS_SOURCES_MANIFEST.slice(1)),
      'MISSING_CONTINENT',
    );
  });

  it('rechaza una URL ausente', () => {
    expectValidationError(
      () => validator.validate(replaceEntry(0, { url: ' ', continent: Continent.AFRICA })),
      'MISSING_URL',
    );
  });

  it('rechaza un continente ausente', () => {
    const invalid = replaceEntry(0, {
      url: INITIAL_RSS_SOURCES_MANIFEST[0].url,
    } as never);
    expectValidationError(() => validator.validate(invalid), 'INVALID_CONTINENT');
  });

  it('rechaza un continente fuera de la taxonomía', () => {
    const invalid = replaceEntry(0, {
      ...INITIAL_RSS_SOURCES_MANIFEST[0],
      continent: 'ANTARCTICA',
    } as never);
    expectValidationError(() => validator.validate(invalid), 'INVALID_CONTINENT');
  });

  it.each([
    ['sintaxis inválida', 'not a URL'],
    ['protocolo no HTTP/S', 'ftp://example.com/feed'],
    ['credenciales embebidas', 'https://user:secret@example.com/feed'],
  ])('rechaza %s', (_case, url) => {
    expectValidationError(
      () => validator.validate(replaceEntry(0, { url, continent: Continent.AFRICA })),
      'INVALID_URL',
    );
  });

  it('rechaza una URL duplicada exactamente', () => {
    const duplicate = [
      ...INITIAL_RSS_SOURCES_MANIFEST,
      INITIAL_RSS_SOURCES_MANIFEST[0],
    ];
    expectValidationError(() => validator.validate(duplicate), 'DUPLICATE_NORMALIZED_URL');
  });

  it('rechaza URLs equivalentes después de normalizar', () => {
    const duplicate = [
      ...INITIAL_RSS_SOURCES_MANIFEST,
      { url: 'https://AFRICANEWS.COM/feed/rss', continent: Continent.AFRICA },
    ];
    expectValidationError(() => validator.validate(duplicate), 'DUPLICATE_NORMALIZED_URL');
  });

  it('no usa HTTP, HTTPS, DNS ni fetch durante la validación', () => {
    const dnsLookup = jest.spyOn(dns.promises, 'lookup');
    const httpRequest = jest.spyOn(http, 'request');
    const httpsRequest = jest.spyOn(https, 'request');
    const fetchRequest = jest.spyOn(globalThis, 'fetch');

    try {
      validator.validate(INITIAL_RSS_SOURCES_MANIFEST);

      expect(dnsLookup).not.toHaveBeenCalled();
      expect(httpRequest).not.toHaveBeenCalled();
      expect(httpsRequest).not.toHaveBeenCalled();
      expect(fetchRequest).not.toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
    }
  });
});

function replaceEntry(
  index: number,
  replacement: InitialRssSourceManifestEntry,
): readonly InitialRssSourceManifestEntry[] {
  return INITIAL_RSS_SOURCES_MANIFEST.map((entry, currentIndex) =>
    currentIndex === index ? replacement : entry,
  );
}

function expectValidationError(
  operation: () => unknown,
  code: InitialRssSourcesValidationErrorCode,
): void {
  try {
    operation();
    throw new Error('Se esperaba InitialRssSourcesValidationError');
  } catch (error) {
    expect(error).toBeInstanceOf(InitialRssSourcesValidationError);
    expect((error as InitialRssSourcesValidationError).code).toBe(code);
  }
}
