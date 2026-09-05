import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { RssFetchError } from '../../src/capture/errors/rss-fetch.error';
import { HttpRssFetcher } from '../../src/capture/integrations/http-rss-fetcher';
import { SourceUrlNormalizer } from '../../src/sources/domain/source-url-normalizer';
import { DnsResolver } from '../../src/sources/integrations/dns-resolver';
import { PinnedAgentFactory } from '../../src/sources/integrations/pinned-agent.factory';
import { PublicIpPolicy } from '../../src/sources/security/ip-address-policy';
import { MAX_SAFE_HTTP_REDIRECTS } from '../../src/sources/security/http-redirect-policy';
import { SourceDestinationResolver } from '../../src/sources/security/source-destination-resolver';

describe('HttpRssFetcher', () => {
  const httpGet = jest.fn();
  const httpService = { get: httpGet } as unknown as HttpService;
  const dnsResolver: jest.Mocked<DnsResolver> = { lookupAll: jest.fn() };
  const agentFactory = { create: jest.fn() } as unknown as jest.Mocked<PinnedAgentFactory>;
  const agentDestroys: jest.Mock[] = [];
  let fetcher: HttpRssFetcher;

  beforeEach(() => {
    jest.clearAllMocks();
    agentDestroys.splice(0);
    dnsResolver.lookupAll.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    agentFactory.create.mockImplementation((url) => {
      const destroy = jest.fn();
      agentDestroys.push(destroy);
      return {
        agent: { pinnedFor: url.hostname } as never,
        protocol: url.protocol as 'http:' | 'https:',
        destroy,
      };
    });
    fetcher = buildFetcher(10_000);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('descarga HTTPS 2xx con Agent fijado y transporte seguro', async () => {
    httpGet.mockReturnValue(response(200, '<rss></rss>'));

    await expect(fetcher.fetchRaw('https://example.com/feed')).resolves.toBe('<rss></rss>');

    expect(dnsResolver.lookupAll).toHaveBeenCalledTimes(1);
    expect(dnsResolver.lookupAll).toHaveBeenCalledWith('example.com');
    expect(agentFactory.create).toHaveBeenCalledTimes(1);
    const [requestedUrl, config] = httpGet.mock.calls[0] as [string, AxiosRequestConfig];
    expect(requestedUrl).toBe('https://example.com/feed');
    expect(config).toMatchObject({
      proxy: false,
      maxRedirects: 0,
      responseType: 'text',
      responseEncoding: 'utf8',
    });
    expect(config.httpsAgent).toBeDefined();
    expect(config.httpAgent).toBeUndefined();
    expect(config.signal).toBeInstanceOf(AbortSignal);
    expect(config.timeout).toBeGreaterThan(0);
    expect(config.timeout).toBeLessThanOrEqual(10_000);
    expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
  });

  it('descarga HTTP 2xx y permite un puerto explícito', async () => {
    httpGet.mockReturnValue(response(204, ''));

    await expect(fetcher.fetchRaw('http://example.com:8080/feed')).resolves.toBe('');

    const [requestedUrl, config] = httpGet.mock.calls[0] as [string, AxiosRequestConfig];
    expect(requestedUrl).toBe('http://example.com:8080/feed');
    expect(config.httpAgent).toBeDefined();
    expect(config.httpsAgent).toBeUndefined();
  });

  it('rechaza un status final no 2xx y destruye el Agent', async () => {
    httpGet.mockReturnValue(response(503, 'unavailable'));

    await expect(fetcher.fetchRaw('https://example.com/feed')).rejects.toBeInstanceOf(
      RssFetchError,
    );
    expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
  });

  it('traduce un fallo de red y destruye el Agent', async () => {
    httpGet.mockReturnValue(throwError(() => new Error('ECONNRESET interno')));

    await expect(fetcher.fetchRaw('https://example.com/feed')).rejects.toBeInstanceOf(
      RssFetchError,
    );
    expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
  });

  it.each(['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'])(
    'traduce el timeout Axios %s',
    async (code) => {
      httpGet.mockReturnValue(throwError(() => new AxiosError('timeout', code)));

      await expect(fetcher.fetchRaw('https://example.com/feed')).rejects.toThrow(
        'expiró',
      );
      expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
    },
  );

  it('vence una descarga pendiente mediante el deadline total', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    fetcher = buildFetcher(100);
    httpGet.mockReturnValue(NEVER);
    const result = fetcher.fetchRaw('https://example.com/feed');
    const expectation = expect(result).rejects.toThrow(RssFetchError);

    await jest.advanceTimersByTimeAsync(100);
    await expectation;
    expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
  });

  it('resuelve DNS público una sola vez por salto', async () => {
    httpGet.mockReturnValue(response(200, '<rss/>'));

    await fetcher.fetchRaw('https://example.com/feed');

    expect(dnsResolver.lookupAll).toHaveBeenCalledTimes(1);
    expect(agentFactory.create).toHaveBeenCalledWith(
      expect.objectContaining({ hostname: 'example.com' }),
      { hostname: 'example.com', address: '8.8.8.8', family: 4 },
    );
  });

  it('rechaza una instantánea DNS mixta antes del GET', async () => {
    dnsResolver.lookupAll.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);

    await expect(fetcher.fetchRaw('https://example.com/feed')).rejects.toBeInstanceOf(
      RssFetchError,
    );
    expect(httpGet).not.toHaveBeenCalled();
    expect(agentFactory.create).not.toHaveBeenCalled();
  });

  it('rechaza una IP privada literal antes del GET', async () => {
    await expect(fetcher.fetchRaw('http://10.0.0.1/feed')).rejects.toBeInstanceOf(
      RssFetchError,
    );
    expect(dnsResolver.lookupAll).not.toHaveBeenCalled();
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('traduce un fallo DNS sin exponer su detalle en el mensaje principal', async () => {
    dnsResolver.lookupAll.mockRejectedValue(new Error('resolver internal 10.0.0.2'));

    const result = fetcher.fetchRaw('https://example.com/feed');
    await expect(result).rejects.toBeInstanceOf(RssFetchError);
    await expect(result).rejects.not.toThrow('10.0.0.2');
    expect(httpGet).not.toHaveBeenCalled();
  });

  it.each([301, 302, 303, 307, 308])(
    'sigue manualmente el redirect público %s y revalida cada salto',
    async (status) => {
      httpGet
        .mockReturnValueOnce(response(status, '', '/next'))
        .mockReturnValueOnce(response(200, '<rss/>'));

      await expect(fetcher.fetchRaw('https://example.com/start')).resolves.toBe('<rss/>');
      expect(httpGet.mock.calls.map(([url]) => url)).toEqual([
        'https://example.com/start',
        'https://example.com/next',
      ]);
      expect(dnsResolver.lookupAll).toHaveBeenCalledTimes(2);
      expect(agentDestroys.every((destroy) => destroy.mock.calls.length === 1)).toBe(true);
    },
  );

  it('rechaza un redirect público a privado antes del segundo GET', async () => {
    httpGet.mockReturnValueOnce(response(302, '', 'http://127.0.0.1/private'));

    await expect(fetcher.fetchRaw('https://example.com/start')).rejects.toBeInstanceOf(
      RssFetchError,
    );
    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it('detecta ciclos de redirect ignorando el fragmento', async () => {
    httpGet.mockReturnValue(response(302, '', 'https://example.com/start#again'));

    await expect(fetcher.fetchRaw('https://example.com/start#initial')).rejects.toThrow(
      'ciclo',
    );
    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it('permite tres redirects y rechaza el cuarto', async () => {
    httpGet
      .mockReturnValueOnce(response(301, '', '/one'))
      .mockReturnValueOnce(response(302, '', '/two'))
      .mockReturnValueOnce(response(307, '', '/three'))
      .mockReturnValueOnce(response(308, '', '/four'));

    await expect(fetcher.fetchRaw('https://example.com/start')).rejects.toThrow(
      'máximo de redirecciones',
    );
    expect(httpGet).toHaveBeenCalledTimes(MAX_SAFE_HTTP_REDIRECTS + 1);
  });

  it('comparte y reduce el deadline entre DNS, HTTP y redirects', async () => {
    let now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    dnsResolver.lookupAll.mockImplementation(async () => {
      now += 1_000;
      return [{ address: '8.8.8.8', family: 4 }];
    });
    httpGet.mockImplementationOnce((_url, config: AxiosRequestConfig) => {
      now += 1_000;
      return response(302, '', '/next', config);
    });
    httpGet.mockImplementationOnce((_url, config: AxiosRequestConfig) => {
      now += 1_000;
      return response(200, '<rss/>', undefined, config);
    });

    await fetcher.fetchRaw('https://example.com/start');

    const timeouts = httpGet.mock.calls.map(([, config]) => (config as AxiosRequestConfig).timeout);
    expect(timeouts).toEqual([9_000, 7_000]);
  });

  function buildFetcher(timeoutMs: number): HttpRssFetcher {
    return new HttpRssFetcher(
      httpService,
      new SourceUrlNormalizer(),
      new SourceDestinationResolver(dnsResolver, new PublicIpPolicy()),
      agentFactory,
      timeoutMs,
    );
  }
});

function response(
  status: number,
  body: string,
  location?: string,
  _config?: AxiosRequestConfig,
): Observable<AxiosResponse<string>> {
  return of({
    data: body,
    status,
    statusText: String(status),
    headers: location ? { location } : {},
    config: {},
  } as unknown as AxiosResponse<string>);
}
