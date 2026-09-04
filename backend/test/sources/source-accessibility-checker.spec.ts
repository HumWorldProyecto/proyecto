import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Readable } from 'node:stream';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { SourceUrlNormalizer } from '../../src/sources/domain/source-url-normalizer';
import { SourceAccessibilityError } from '../../src/sources/errors/source-accessibility.error';
import { PinnedAgentFactory } from '../../src/sources/integrations/pinned-agent.factory';
import {
  MAX_SOURCE_REDIRECTS,
  SourceAccessibilityChecker,
} from '../../src/sources/integrations/source-accessibility-checker';
import { SourceDestinationResolver } from '../../src/sources/security/source-destination-resolver';

type ResponseStream = Readable & { destroy: jest.Mock };

describe('SourceAccessibilityChecker', () => {
  const httpGet = jest.fn();
  const httpService = { get: httpGet } as unknown as HttpService;
  const destinationResolver = {
    resolve: jest.fn(),
  } as unknown as jest.Mocked<SourceDestinationResolver>;
  const agentFactory = {
    create: jest.fn(),
  } as unknown as jest.Mocked<PinnedAgentFactory>;
  const agentDestroys: jest.Mock[] = [];
  const streams: ResponseStream[] = [];
  let checker: SourceAccessibilityChecker;

  beforeEach(() => {
    jest.clearAllMocks();
    agentDestroys.splice(0);
    streams.splice(0);

    destinationResolver.resolve.mockImplementation(async (url) => ({
      hostname: url.hostname,
      address: '8.8.8.8',
      family: 4,
    }));
    agentFactory.create.mockImplementation((url) => {
      const destroy = jest.fn();
      agentDestroys.push(destroy);
      return {
        agent: { pinnedFor: url.hostname } as never,
        protocol: url.protocol as 'http:' | 'https:',
        destroy,
      };
    });
    checker = new SourceAccessibilityChecker(
      httpService,
      new SourceUrlNormalizer(),
      destinationResolver,
      agentFactory,
      10_000,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ejecuta GET HTTPS seguro, permite puerto explícito y cierra el stream', async () => {
    httpGet.mockReturnValue(response(200));

    await expect(
      checker.assertAccessible('  https://example.com:8443/feed?format=rss  '),
    ).resolves.toBe('https://example.com:8443/feed?format=rss');

    expect(httpGet).toHaveBeenCalledTimes(1);
    const [requestedUrl, config] = httpGet.mock.calls[0] as [string, AxiosRequestConfig];
    expect(requestedUrl).toBe('https://example.com:8443/feed?format=rss');
    expect(config).toMatchObject({
      proxy: false,
      maxRedirects: 0,
      responseType: 'stream',
    });
    expect(config.timeout).toBeGreaterThan(0);
    expect(config.timeout).toBeLessThanOrEqual(10_000);
    expect(config.signal).toBeInstanceOf(AbortSignal);
    expect(config.httpsAgent).toBeDefined();
    expect(config.httpAgent).toBeUndefined();
    expect(config.headers).toBeUndefined();
    expect(config.validateStatus?.(418)).toBe(true);
    expect(requestedUrl).not.toContain('8.8.8.8');
    expect((agentFactory.create.mock.calls[0][0] as URL).hostname).toBe('example.com');
    expect(streams[0].destroy).toHaveBeenCalledTimes(1);
    expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
  });

  it('configura el Agent HTTP correspondiente', async () => {
    httpGet.mockReturnValue(response(204));

    await expect(checker.assertAccessible('http://example.com:8080/feed')).resolves.toBe(
      'http://example.com:8080/feed',
    );

    const config = httpGet.mock.calls[0][1] as AxiosRequestConfig;
    expect(config.httpAgent).toBeDefined();
    expect(config.httpsAgent).toBeUndefined();
  });

  it.each([201, 204, 299])('acepta otro status 2xx: %s', async (status) => {
    httpGet.mockReturnValue(response(status));

    await expect(checker.assertAccessible('https://example.com/feed')).resolves.toBe(
      'https://example.com/feed',
    );
  });

  it.each([300, 304, 400, 404, 500])('rechaza un status no satisfactorio: %s', async (status) => {
    httpGet.mockReturnValue(response(status));

    await expectErrorCode(checker.assertAccessible('https://example.com/feed'), 'HTTP_STATUS');
    expect(streams[0].destroy).toHaveBeenCalledTimes(1);
    expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
  });

  it('distingue un fallo de red y destruye el Agent', async () => {
    httpGet.mockReturnValue(throwError(() => new Error('ECONNRESET')));

    await expectErrorCode(checker.assertAccessible('https://example.com/feed'), 'NETWORK');
    expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
  });

  it('preserva un error de accesibilidad ya clasificado por el transporte', async () => {
    httpGet.mockReturnValue(
      throwError(() => new SourceAccessibilityError('REDIRECT', 'Fallo ya clasificado')),
    );

    await expectErrorCode(checker.assertAccessible('https://example.com/feed'), 'REDIRECT');
    expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
  });

  it.each(['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'])(
    'distingue el timeout Axios %s',
    async (code) => {
      httpGet.mockReturnValue(throwError(() => new AxiosError('timeout', code)));

      await expectErrorCode(checker.assertAccessible('https://example.com/feed'), 'TIMEOUT');
      expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
    },
  );

  it('vence una petición pendiente por el deadline total', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    httpGet.mockReturnValue(NEVER);
    const result = checker.assertAccessible('https://example.com/feed');
    const expectation = expectErrorCode(result, 'TIMEOUT');

    await jest.advanceTimersByTimeAsync(10_000);
    await expectation;
    expect(agentDestroys[0]).toHaveBeenCalledTimes(1);
  });

  it('sigue un redirect público y conserva GET con una URL relativa', async () => {
    httpGet
      .mockReturnValueOnce(response(302, '/moved'))
      .mockReturnValueOnce(response(200));

    await expect(checker.assertAccessible('https://example.com/feed')).resolves.toBe(
      'https://example.com/feed',
    );

    expect(httpGet.mock.calls.map(([url]) => url)).toEqual([
      'https://example.com/feed',
      'https://example.com/moved',
    ]);
    expect(destinationResolver.resolve).toHaveBeenCalledTimes(2);
    expect(streams.every((stream) => stream.destroy.mock.calls.length === 1)).toBe(true);
    expect(agentDestroys.every((destroy) => destroy.mock.calls.length === 1)).toBe(true);
  });

  it.each([301, 302, 303, 307, 308])('sigue manualmente el redirect %s', async (status) => {
    httpGet.mockReturnValueOnce(response(status, '/next')).mockReturnValueOnce(response(200));

    await expect(checker.assertAccessible('https://example.com/feed')).resolves.toBe(
      'https://example.com/feed',
    );
    expect(httpGet).toHaveBeenCalledTimes(2);
  });

  it('rechaza un redirect público hacia destino privado antes del segundo GET', async () => {
    httpGet.mockReturnValueOnce(response(302, 'http://10.0.0.1/internal'));
    destinationResolver.resolve
      .mockResolvedValueOnce({ hostname: 'example.com', address: '8.8.8.8', family: 4 })
      .mockRejectedValueOnce(
        new SourceAccessibilityError('FORBIDDEN_DESTINATION', 'Destino no permitido'),
      );

    await expectErrorCode(checker.assertAccessible('https://example.com/feed'), 'FORBIDDEN_DESTINATION');
    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it('rechaza un redirect permitido sin Location', async () => {
    httpGet.mockReturnValue(response(302));

    await expectErrorCode(checker.assertAccessible('https://example.com/feed'), 'REDIRECT');
  });

  it.each(['ftp://example.com/feed', 'http://[::1'])(
    'rechaza una Location inválida: %p',
    async (location) => {
      httpGet.mockReturnValue(response(302, location));

      await expectErrorCode(checker.assertAccessible('https://example.com/feed'), 'REDIRECT');
    },
  );

  it('preserva el rechazo específico de localhost en un redirect', async () => {
    httpGet.mockReturnValue(response(302, 'http://localhost/internal'));

    await expectErrorCode(checker.assertAccessible('https://example.com/feed'), 'FORBIDDEN_DESTINATION');
    expect(destinationResolver.resolve).toHaveBeenCalledTimes(1);
  });

  it('detecta un ciclo ignorando el fragmento', async () => {
    httpGet.mockReturnValue(response(302, 'https://example.com/feed#otra-seccion'));

    await expectErrorCode(checker.assertAccessible('https://example.com/feed#inicio'), 'REDIRECT');
    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it('permite tres redirects y después un 2xx', async () => {
    httpGet
      .mockReturnValueOnce(response(301, '/one'))
      .mockReturnValueOnce(response(302, '/two'))
      .mockReturnValueOnce(response(307, '/three'))
      .mockReturnValueOnce(response(200));

    await expect(checker.assertAccessible('https://example.com/start')).resolves.toBe(
      'https://example.com/start',
    );
    expect(httpGet).toHaveBeenCalledTimes(MAX_SOURCE_REDIRECTS + 1);
  });

  it('rechaza el cuarto redirect', async () => {
    httpGet
      .mockReturnValueOnce(response(301, '/one'))
      .mockReturnValueOnce(response(302, '/two'))
      .mockReturnValueOnce(response(307, '/three'))
      .mockReturnValueOnce(response(308, '/four'));

    await expectErrorCode(checker.assertAccessible('https://example.com/start'), 'REDIRECT');
    expect(httpGet).toHaveBeenCalledTimes(MAX_SOURCE_REDIRECTS + 1);
  });

  it('reduce el presupuesto entre DNS, HTTP y redirects sin reiniciarlo', async () => {
    let now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    destinationResolver.resolve.mockImplementation(async (url) => {
      now += 1_000;
      return { hostname: url.hostname, address: '8.8.8.8', family: 4 };
    });
    httpGet.mockImplementationOnce((_url, config: AxiosRequestConfig) => {
      now += 1_000;
      return response(302, '/next', config);
    });
    httpGet.mockImplementationOnce((_url, config: AxiosRequestConfig) => {
      now += 1_000;
      return response(200, undefined, config);
    });

    await checker.assertAccessible('https://example.com/start');

    const timeouts = httpGet.mock.calls.map(([, config]) => (config as AxiosRequestConfig).timeout);
    expect(timeouts).toEqual([9_000, 7_000]);
  });

  function response(
    status: number,
    location?: string,
    _config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<Readable>> {
    const stream = { destroy: jest.fn() } as unknown as ResponseStream;
    streams.push(stream);
    return of({
      data: stream,
      status,
      statusText: String(status),
      headers: location ? { location } : {},
      config: {},
    } as unknown as AxiosResponse<Readable>);
  }
});

async function expectErrorCode(
  result: Promise<unknown>,
  code: SourceAccessibilityError['code'],
): Promise<void> {
  try {
    await result;
    throw new Error('Se esperaba SourceAccessibilityError');
  } catch (error) {
    expect(error).toBeInstanceOf(SourceAccessibilityError);
    expect((error as SourceAccessibilityError).code).toBe(code);
  }
}
