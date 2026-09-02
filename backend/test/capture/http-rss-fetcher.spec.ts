import { HttpRssFetcher } from '../../src/capture/integrations/http-rss-fetcher';
import { RssFetchError } from '../../src/capture/errors/rss-fetch.error';

describe('HttpRssFetcher', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('devuelve el contenido crudo cuando la respuesta es correcta', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<rss></rss>'),
    }) as unknown as typeof fetch;

    const fetcher = new HttpRssFetcher(1000);

    await expect(fetcher.fetchRaw('https://example.com/feed.xml')).resolves.toBe('<rss></rss>');
  });

  it('finaliza mediante timeout cuando la fuente no responde en un tiempo finito', async () => {
    global.fetch = jest.fn((_url: string, options?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    }) as unknown as typeof fetch;

    const fetcher = new HttpRssFetcher(20);

    await expect(fetcher.fetchRaw('https://example.com/lenta.xml')).rejects.toThrow(RssFetchError);
  });

  it('usa el timeout técnico por defecto cuando no se inyecta uno explícito', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<rss></rss>'),
    }) as unknown as typeof fetch;

    const fetcher = new HttpRssFetcher();

    await expect(fetcher.fetchRaw('https://example.com/feed.xml')).resolves.toBe('<rss></rss>');
  });

  it('rechaza cuando la respuesta HTTP no es correcta', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(''),
    }) as unknown as typeof fetch;

    const fetcher = new HttpRssFetcher(1000);

    await expect(fetcher.fetchRaw('https://example.com/error.xml')).rejects.toThrow(RssFetchError);
  });
});
