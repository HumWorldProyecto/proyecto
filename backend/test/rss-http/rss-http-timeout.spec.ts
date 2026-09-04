import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_RSS_FETCH_TIMEOUT_MS,
  parseRssFetchTimeoutMs,
  rssFetchTimeoutFactory,
} from '../../src/rss-http/rss-http-timeout';

describe('RSS HTTP timeout configuration', () => {
  it('usa 10.000 ms cuando la configuración está ausente', () => {
    expect(parseRssFetchTimeoutMs(undefined)).toBe(DEFAULT_RSS_FETCH_TIMEOUT_MS);
  });

  it.each([2_500, '2500', ' 2500 ', '1e3'])('acepta un override entero positivo: %p', (value) => {
    expect(parseRssFetchTimeoutMs(value)).toBe(Number(value));
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, 'NaN', 'Infinity', '1.5', '', '   ', null])(
    'rechaza una configuración inválida: %p',
    (value) => {
      expect(() => parseRssFetchTimeoutMs(value)).toThrow(
        'RSS_FETCH_TIMEOUT_MS debe ser un entero positivo y finito',
      );
    },
  );

  it('lee RSS_FETCH_TIMEOUT_MS mediante ConfigService', () => {
    const configService = {
      get: jest.fn().mockReturnValue('4321'),
    } as unknown as ConfigService;

    expect(rssFetchTimeoutFactory(configService)).toBe(4321);
    expect(configService.get).toHaveBeenCalledWith('RSS_FETCH_TIMEOUT_MS');
  });
});
