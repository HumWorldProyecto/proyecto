import { RssFetchError } from '../../src/capture/errors/rss-fetch.error';
import { RssParseError } from '../../src/capture/errors/rss-parse.error';
import { SourceCaptureError } from '../../src/capture/errors/source-capture.error';
import { CaptureOutputPort } from '../../src/capture/ports/capture-output.port';
import { RssFetcherPort } from '../../src/capture/ports/rss-fetcher.port';
import { RssParserPort } from '../../src/capture/ports/rss-parser.port';
import { SourceCaptureGuard } from '../../src/capture/services/source-capture-guard';
import { SourceCaptureService } from '../../src/capture/services/source-capture.service';
import { RssItem } from '../../src/capture/types/rss-item';
import { EligibleSource } from '../../src/sources/ports/source-registry.port';

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function buildService(overrides: {
  fetchRaw?: jest.Mock;
  parse?: jest.Mock;
  emitItems?: jest.Mock;
  guard?: SourceCaptureGuard;
} = {}) {
  const fetchRaw = overrides.fetchRaw ?? jest.fn().mockResolvedValue('<rss/>');
  const parse = overrides.parse ?? jest.fn().mockResolvedValue([]);
  const emitItems = overrides.emitItems ?? jest.fn().mockResolvedValue(undefined);
  const service = new SourceCaptureService(
    { fetchRaw } as RssFetcherPort,
    { parse } as RssParserPort,
    { emitItems } as CaptureOutputPort,
    overrides.guard ?? new SourceCaptureGuard(),
  );
  return { service, fetchRaw, parse, emitItems };
}

const source: EligibleSource = {
  id: 'source-a',
  url: 'https://example.com/feed.xml',
};

describe('SourceCaptureService', () => {
  it('reutiliza fetcher, parser y output; asigna sourceId y devuelve itemsParsed', async () => {
    const parsedItems: RssItem[] = [
      { sourceId: '', guid: 'one', link: 'https://example.com/article' },
      { sourceId: '', guid: 'two' },
    ];
    const dependencies = buildService({
      fetchRaw: jest.fn().mockResolvedValue('<rss>contenido</rss>'),
      parse: jest.fn().mockResolvedValue(parsedItems),
    });

    await expect(dependencies.service.capture(source)).resolves.toEqual({
      sourceId: 'source-a',
      status: 'completed',
      itemsParsed: 2,
    });
    expect(dependencies.fetchRaw).toHaveBeenCalledTimes(1);
    expect(dependencies.fetchRaw).toHaveBeenCalledWith(source.url);
    expect(dependencies.parse).toHaveBeenCalledWith('<rss>contenido</rss>');
    expect(dependencies.emitItems).toHaveBeenCalledWith([
      { sourceId: 'source-a', guid: 'one', link: 'https://example.com/article' },
      { sourceId: 'source-a', guid: 'two' },
    ]);
  });

  it('completa un RSS válido vacío con itemsParsed cero y no emite un lote vacío', async () => {
    const dependencies = buildService();

    await expect(dependencies.service.capture(source)).resolves.toEqual({
      sourceId: 'source-a',
      status: 'completed',
      itemsParsed: 0,
    });
    expect(dependencies.emitItems).not.toHaveBeenCalled();
  });

  it.each([
    ['timeout' as const, new RssFetchError('timeout', 'deadline')],
    ['fetch/upstream' as const, new RssFetchError('fetch/upstream', 'upstream')],
    ['parse/invalid-rss' as const, new RssParseError('invalid')],
  ])('expone la categoría tipada %s y conserva el error interno como causa', async (code, cause) => {
    const dependencies =
      cause instanceof RssParseError
        ? buildService({ parse: jest.fn().mockRejectedValue(cause) })
        : buildService({ fetchRaw: jest.fn().mockRejectedValue(cause) });

    const result = dependencies.service.capture(source).catch((error: unknown) => error);

    await expect(result).resolves.toMatchObject({ code, sourceId: source.id, cause });
  });

  it('clasifica como unexpected un fallo no controlado y conserva su causa', async () => {
    const cause = new Error('fallo interno de persistencia');
    const dependencies = buildService({
      parse: jest.fn().mockResolvedValue([{ sourceId: '', guid: 'one' }]),
      emitItems: jest.fn().mockRejectedValue(cause),
    });

    await expect(
      dependencies.service.capture(source).catch((error) => error),
    ).resolves.toMatchObject({
      code: 'unexpected',
      sourceId: source.id,
      cause,
    });
  });

  it('rechaza sin encolar solapamiento manual-manual o manual-automático y libera tras éxito', async () => {
    const pending = deferred<string>();
    const fetchRaw = jest
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce('<rss/>');
    const dependencies = buildService({ fetchRaw });

    const first = dependencies.service.capture(source);
    await Promise.resolve();
    const secondError = await dependencies.service.capture(source).catch((error) => error);

    expect(secondError).toBeInstanceOf(SourceCaptureError);
    expect(secondError).toMatchObject({ code: 'source-busy', sourceId: source.id });
    expect(fetchRaw).toHaveBeenCalledTimes(1);

    pending.resolve('<rss/>');
    await first;
    await expect(dependencies.service.capture(source)).resolves.toMatchObject({
      status: 'completed',
    });
    expect(fetchRaw).toHaveBeenCalledTimes(2);
  });

  it('libera el guard en finally después de un error', async () => {
    const parse = jest
      .fn()
      .mockRejectedValueOnce(new RssParseError('invalid'))
      .mockResolvedValueOnce([]);
    const dependencies = buildService({ parse });

    await expect(dependencies.service.capture(source)).rejects.toMatchObject({
      code: 'parse/invalid-rss',
    });
    await expect(dependencies.service.capture(source)).resolves.toMatchObject({
      sourceId: source.id,
      status: 'completed',
    });
  });

  it('permite capturas simultáneas de fuentes diferentes', async () => {
    const pendingA = deferred<string>();
    const pendingB = deferred<string>();
    const fetchRaw = jest.fn((url: string) =>
      url.includes('a.example') ? pendingA.promise : pendingB.promise,
    );
    const dependencies = buildService({ fetchRaw });
    const sourceA = { id: 'a', url: 'https://a.example/feed' };
    const sourceB = { id: 'b', url: 'https://b.example/feed' };

    const captureA = dependencies.service.capture(sourceA);
    const captureB = dependencies.service.capture(sourceB);
    await Promise.resolve();

    expect(fetchRaw).toHaveBeenCalledTimes(2);
    pendingA.resolve('<rss/>');
    pendingB.resolve('<rss/>');
    await expect(Promise.all([captureA, captureB])).resolves.toEqual([
      { sourceId: 'a', status: 'completed', itemsParsed: 0 },
      { sourceId: 'b', status: 'completed', itemsParsed: 0 },
    ]);
  });
});
