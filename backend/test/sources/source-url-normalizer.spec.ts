import { SourceUrlNormalizer } from '../../src/sources/domain/source-url-normalizer';
import { SourceAccessibilityError } from '../../src/sources/errors/source-accessibility.error';

describe('SourceUrlNormalizer', () => {
  const normalizer = new SourceUrlNormalizer();

  it.each([
    ['http://example.com/feed', 'http://example.com/feed'],
    ['https://example.com/feed', 'https://example.com/feed'],
    ['  https://example.com/a%20b?x=1&y=2  ', 'https://example.com/a%20b?x=1&y=2'],
    ['https://example.com:8443/feed?format=rss', 'https://example.com:8443/feed?format=rss'],
  ])('normaliza %p como %p', (input, expected) => {
    expect(normalizer.normalize(input).toString()).toBe(expected);
  });

  it.each(['ftp://example.com/feed', 'file:///tmp/feed.xml', 'mailto:rss@example.com'])(
    'rechaza el protocolo de %p',
    (input) => {
      expectErrorCode(() => normalizer.normalize(input), 'INPUT');
    },
  );

  it.each(['http://user@example.com/feed', 'https://:secret@example.com/feed'])(
    'rechaza credenciales embebidas en %p',
    (input) => {
      expectErrorCode(() => normalizer.normalize(input), 'INPUT');
    },
  );

  it.each([
    'http://localhost/feed',
    'http://LOCALHOST/feed',
    'http://localhost./feed',
    'http://foo.localhost/feed',
    'http://FOO.LOCALHOST./feed',
  ])('rechaza el destino local %p', (input) => {
    expectErrorCode(() => normalizer.normalize(input), 'FORBIDDEN_DESTINATION');
  });

  it.each(['', 'not a url', 'http://[::1'])('rechaza la sintaxis inválida %p', (input) => {
    expectErrorCode(() => normalizer.normalize(input), 'INPUT');
  });

  it('mantiene un literal IPv6 con la representación estándar de URL', () => {
    expect(normalizer.normalize('https://[2606:4700:4700::1111]:8443/rss').toString()).toBe(
      'https://[2606:4700:4700::1111]:8443/rss',
    );
  });
});

function expectErrorCode(operation: () => unknown, code: SourceAccessibilityError['code']): void {
  try {
    operation();
    throw new Error('Se esperaba SourceAccessibilityError');
  } catch (error) {
    expect(error).toBeInstanceOf(SourceAccessibilityError);
    expect((error as SourceAccessibilityError).code).toBe(code);
  }
}
