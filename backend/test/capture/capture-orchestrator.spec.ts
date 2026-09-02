import { CaptureOrchestratorService } from '../../src/capture/services/capture-orchestrator.service';
import { SourceRegistryPort } from '../../src/capture/ports/source-registry.port';
import { RssFetcherPort } from '../../src/capture/ports/rss-fetcher.port';
import { RssParserPort } from '../../src/capture/ports/rss-parser.port';
import { CaptureOutputPort } from '../../src/capture/ports/capture-output.port';
import { RssSource } from '../../src/capture/types/rss-source';
import { RssItem } from '../../src/capture/types/rss-item';
import { RssFetchError } from '../../src/capture/errors/rss-fetch.error';
import { RssParseError } from '../../src/capture/errors/rss-parse.error';

function buildOrchestrator(overrides: {
  sourceRegistry: SourceRegistryPort;
  fetcher: RssFetcherPort;
  parser: RssParserPort;
  output: CaptureOutputPort;
}) {
  return new CaptureOrchestratorService(
    overrides.sourceRegistry,
    overrides.fetcher,
    overrides.parser,
    overrides.output,
  );
}

describe('CaptureOrchestratorService', () => {
  it('intenta la captura de cada fuente registrada en la instantánea y excluye direcciones no registradas', async () => {
    const sources: RssSource[] = [
      { id: 'a', url: 'https://a.example.com/feed.xml' },
      { id: 'b', url: 'https://b.example.com/feed.xml' },
    ];
    const sourceRegistry: SourceRegistryPort = { getRegisteredSources: jest.fn().mockResolvedValue(sources) };
    const fetcher: RssFetcherPort = { fetchRaw: jest.fn().mockResolvedValue('<rss><channel></channel></rss>') };
    const parser: RssParserPort = { parse: jest.fn().mockReturnValue([]) };
    const output: CaptureOutputPort = { emitItems: jest.fn().mockResolvedValue(undefined) };

    const orchestrator = buildOrchestrator({ sourceRegistry, fetcher, parser, output });
    await orchestrator.runCapture();

    expect(fetcher.fetchRaw).toHaveBeenCalledTimes(2);
    expect(fetcher.fetchRaw).toHaveBeenNthCalledWith(1, 'https://a.example.com/feed.xml');
    expect(fetcher.fetchRaw).toHaveBeenNthCalledWith(2, 'https://b.example.com/feed.xml');
    expect(fetcher.fetchRaw).not.toHaveBeenCalledWith(expect.stringContaining('unregistered'));
  });

  it('no altera su instantánea con cambios de HU-15 durante la ejecución; los refleja en una ejecución posterior', async () => {
    const firstSnapshot: RssSource[] = [{ id: 'a', url: 'https://a.example.com/feed.xml' }];
    const secondSnapshot: RssSource[] = [
      { id: 'a', url: 'https://a.example.com/feed.xml' },
      { id: 'b', url: 'https://b.example.com/feed.xml' },
    ];
    const getRegisteredSources = jest
      .fn()
      .mockResolvedValueOnce(firstSnapshot)
      .mockResolvedValueOnce(secondSnapshot);
    const sourceRegistry: SourceRegistryPort = { getRegisteredSources };

    const fetchRaw = jest.fn().mockImplementation(async () => {
      // Simula que HU-15 registra una nueva fuente mientras la ejecución está en curso.
      return '<rss><channel></channel></rss>';
    });
    const fetcher: RssFetcherPort = { fetchRaw };
    const parser: RssParserPort = { parse: jest.fn().mockReturnValue([]) };
    const output: CaptureOutputPort = { emitItems: jest.fn().mockResolvedValue(undefined) };

    const orchestrator = buildOrchestrator({ sourceRegistry, fetcher, parser, output });

    await orchestrator.runCapture();
    expect(fetchRaw).toHaveBeenCalledTimes(1);
    expect(fetchRaw).toHaveBeenCalledWith('https://a.example.com/feed.xml');

    fetchRaw.mockClear();
    await orchestrator.runCapture();
    expect(fetchRaw).toHaveBeenCalledTimes(2);
    expect(fetchRaw).toHaveBeenNthCalledWith(1, 'https://a.example.com/feed.xml');
    expect(fetchRaw).toHaveBeenNthCalledWith(2, 'https://b.example.com/feed.xml');
  });

  it('recorre las fuentes de la instantánea de forma secuencial', async () => {
    const sources: RssSource[] = [
      { id: 'a', url: 'https://a.example.com/feed.xml' },
      { id: 'b', url: 'https://b.example.com/feed.xml' },
    ];
    const sourceRegistry: SourceRegistryPort = { getRegisteredSources: jest.fn().mockResolvedValue(sources) };

    const events: string[] = [];
    const fetchRaw = jest.fn().mockImplementation(async (url: string) => {
      events.push(`start:${url}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      events.push(`end:${url}`);
      return '<rss><channel></channel></rss>';
    });
    const fetcher: RssFetcherPort = { fetchRaw };
    const parser: RssParserPort = { parse: jest.fn().mockReturnValue([]) };
    const output: CaptureOutputPort = { emitItems: jest.fn().mockResolvedValue(undefined) };

    const orchestrator = buildOrchestrator({ sourceRegistry, fetcher, parser, output });
    await orchestrator.runCapture();

    expect(events).toEqual([
      'start:https://a.example.com/feed.xml',
      'end:https://a.example.com/feed.xml',
      'start:https://b.example.com/feed.xml',
      'end:https://b.example.com/feed.xml',
    ]);
  });

  it('interpreta un RSS válido y produce cero o más ítems para el límite de salida', async () => {
    const source: RssSource = { id: 'a', url: 'https://a.example.com/feed.xml' };
    const sourceRegistry: SourceRegistryPort = { getRegisteredSources: jest.fn().mockResolvedValue([source]) };
    const fetcher: RssFetcherPort = { fetchRaw: jest.fn().mockResolvedValue('<rss><channel></channel></rss>') };
    const parsedItems: RssItem[] = [{ sourceId: '', title: 'Noticia', link: 'https://a.example.com/1' }];
    const parser: RssParserPort = { parse: jest.fn().mockReturnValue(parsedItems) };
    const output: CaptureOutputPort = { emitItems: jest.fn().mockResolvedValue(undefined) };

    const orchestrator = buildOrchestrator({ sourceRegistry, fetcher, parser, output });
    await orchestrator.runCapture();

    expect(output.emitItems).toHaveBeenCalledWith([
      { sourceId: 'a', title: 'Noticia', link: 'https://a.example.com/1' },
    ]);
  });

  it('no produce ítems para el límite de salida cuando el contenido no es RSS (Atom/HTML/inválido)', async () => {
    const source: RssSource = { id: 'a', url: 'https://a.example.com/feed.xml' };
    const sourceRegistry: SourceRegistryPort = { getRegisteredSources: jest.fn().mockResolvedValue([source]) };
    const fetcher: RssFetcherPort = { fetchRaw: jest.fn().mockResolvedValue('<html></html>') };
    const parser: RssParserPort = {
      parse: jest.fn().mockImplementation(() => {
        throw new RssParseError('no es RSS');
      }),
    };
    const output: CaptureOutputPort = { emitItems: jest.fn().mockResolvedValue(undefined) };

    const orchestrator = buildOrchestrator({ sourceRegistry, fetcher, parser, output });
    await orchestrator.runCapture();

    expect(output.emitItems).not.toHaveBeenCalled();
  });

  it('aísla el fallo de una fuente (timeout) y continúa procesando una fuente válida posterior', async () => {
    const failingSource: RssSource = { id: 'a', url: 'https://a.example.com/feed.xml' };
    const workingSource: RssSource = { id: 'b', url: 'https://b.example.com/feed.xml' };
    const sourceRegistry: SourceRegistryPort = {
      getRegisteredSources: jest.fn().mockResolvedValue([failingSource, workingSource]),
    };
    const fetchRaw = jest
      .fn()
      .mockRejectedValueOnce(new RssFetchError('timeout'))
      .mockResolvedValueOnce('<rss><channel></channel></rss>');
    const fetcher: RssFetcherPort = { fetchRaw };
    const parsedItems: RssItem[] = [{ sourceId: '', title: 'Noticia válida' }];
    const parser: RssParserPort = { parse: jest.fn().mockReturnValue(parsedItems) };
    const output: CaptureOutputPort = { emitItems: jest.fn().mockResolvedValue(undefined) };

    const orchestrator = buildOrchestrator({ sourceRegistry, fetcher, parser, output });
    await orchestrator.runCapture();

    expect(fetchRaw).toHaveBeenCalledTimes(2);
    expect(output.emitItems).toHaveBeenCalledTimes(1);
    expect(output.emitItems).toHaveBeenCalledWith([{ sourceId: 'b', title: 'Noticia válida' }]);
  });

  it('no realiza solicitudes a las páginas enlazadas por los ítems RSS', async () => {
    const source: RssSource = { id: 'a', url: 'https://a.example.com/feed.xml' };
    const sourceRegistry: SourceRegistryPort = { getRegisteredSources: jest.fn().mockResolvedValue([source]) };
    const fetchRaw = jest.fn().mockResolvedValue('<rss><channel></channel></rss>');
    const fetcher: RssFetcherPort = { fetchRaw };
    const parsedItems: RssItem[] = [
      { sourceId: '', title: 'Con enlace', link: 'https://a.example.com/pagina-enlazada' },
    ];
    const parser: RssParserPort = { parse: jest.fn().mockReturnValue(parsedItems) };
    const output: CaptureOutputPort = { emitItems: jest.fn().mockResolvedValue(undefined) };

    const orchestrator = buildOrchestrator({ sourceRegistry, fetcher, parser, output });
    await orchestrator.runCapture();

    expect(fetchRaw).toHaveBeenCalledTimes(1);
    expect(fetchRaw).not.toHaveBeenCalledWith('https://a.example.com/pagina-enlazada');
  });

  it('no realiza solicitudes externas ni produce ítems cuando no existen fuentes registradas', async () => {
    const sourceRegistry: SourceRegistryPort = { getRegisteredSources: jest.fn().mockResolvedValue([]) };
    const fetcher: RssFetcherPort = { fetchRaw: jest.fn() };
    const parser: RssParserPort = { parse: jest.fn() };
    const output: CaptureOutputPort = { emitItems: jest.fn() };

    const orchestrator = buildOrchestrator({ sourceRegistry, fetcher, parser, output });
    await orchestrator.runCapture();

    expect(fetcher.fetchRaw).not.toHaveBeenCalled();
    expect(parser.parse).not.toHaveBeenCalled();
    expect(output.emitItems).not.toHaveBeenCalled();
  });
});
