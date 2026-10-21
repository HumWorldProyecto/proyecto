import { SourceCaptureError } from '../../src/capture/errors/source-capture.error';
import { RssParseError } from '../../src/capture/errors/rss-parse.error';
import { assertRssDocumentRoot } from '../../src/capture/integrations/rss-only-parser';
import { SourceCaptureGuard } from '../../src/capture/services/source-capture-guard';
import { SourceCaptureService } from '../../src/capture/services/source-capture.service';

function fixture() {
  const release = jest.fn();
  const guard = { tryAcquire: jest.fn().mockReturnValue({ release }) };
  const fetcher = { fetchRaw: jest.fn().mockResolvedValue('<rss/>') };
  const parser = { parse: jest.fn().mockResolvedValue([]) };
  const output = { emitItems: jest.fn() };
  const service = new SourceCaptureService(
    fetcher, parser, output, guard as unknown as SourceCaptureGuard,
  );
  return { service, fetcher, parser, output, guard, release };
}

describe('P11: unitarias aisladas de captura y límites XML', () => {
  const source = { id: 'p11-source', url: 'https://p11.example/feed' };

  it('P11-U01: conserva causa de fallo inesperado de fetch y libera el guard', async () => {
    // Arrange: todos los colaboradores son dobles nuevos por caso.
    const f = fixture();
    const cause = new Error('fallo de transporte no tipado');
    f.fetcher.fetchRaw.mockRejectedValue(cause);
    // Act
    const result = await f.service.capture(source).catch((error: unknown) => error);
    // Assert
    expect(result).toBeInstanceOf(SourceCaptureError);
    expect(result).toMatchObject({ code: 'unexpected', sourceId: source.id, cause });
    expect(f.fetcher.fetchRaw).toHaveBeenCalledWith(source.url);
    expect(f.parser.parse).not.toHaveBeenCalled();
    expect(f.output.emitItems).not.toHaveBeenCalled();
    expect(f.guard.tryAcquire).toHaveBeenCalledWith(source.id);
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it('P11-U02: conserva causa de fallo inesperado de parse y libera el guard', async () => {
    // Arrange
    const f = fixture();
    const cause = new Error('fallo del parser no tipado');
    f.parser.parse.mockRejectedValue(cause);
    // Act
    const result = await f.service.capture(source).catch((error: unknown) => error);
    // Assert
    expect(result).toBeInstanceOf(SourceCaptureError);
    expect(result).toMatchObject({ code: 'unexpected', sourceId: source.id, cause });
    expect(f.parser.parse).toHaveBeenCalledWith('<rss/>');
    expect(f.output.emitItems).not.toHaveBeenCalled();
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it('P11-U03: rechaza comentario XML inicial truncado', () => {
    // Arrange
    const xml = '\uFEFF \n<!-- comentario sin cierre <rss/>';
    // Act
    const act = () => assertRssDocumentRoot(xml);
    // Assert
    expect(act).toThrow(RssParseError);
    expect(act).toThrow('El comentario XML inicial no está cerrado');
  });

  it('P11-U04: rechaza declaración XML inicial sin cierre', () => {
    // Arrange
    const xml = '<?xml version="1.0" <rss/>';
    // Act
    const act = () => assertRssDocumentRoot(xml);
    // Assert
    expect(act).toThrow(RssParseError);
    expect(act).toThrow('La declaración XML no está cerrada');
  });
});
