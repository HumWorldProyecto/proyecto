import { SourceCaptureError } from '../../src/capture/errors/source-capture.error';
import { ManualSourceCaptureService } from '../../src/capture/services/manual-source-capture.service';
import { SourceCaptureService } from '../../src/capture/services/source-capture.service';
import { SourceRegistryPort } from '../../src/sources/ports/source-registry.port';

describe('ManualSourceCaptureService', () => {
  const getEligibleSources = jest.fn();
  const findForCapture = jest.fn();
  const capture = jest.fn();
  const sourceRegistry: SourceRegistryPort = { getEligibleSources, findForCapture };
  const service = new ManualSourceCaptureService(
    sourceRegistry,
    { capture } as unknown as SourceCaptureService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('captura exactamente la fuente elegible seleccionada por ID y retorna su resultado', async () => {
    const selected = { id: 'selected', url: 'https://selected.example/feed' };
    const result = { sourceId: selected.id, status: 'completed' as const, itemsParsed: 3 };
    findForCapture.mockResolvedValue({ kind: 'eligible', source: selected });
    capture.mockResolvedValue(result);

    await expect(service.capture(selected.id)).resolves.toBe(result);

    expect(findForCapture).toHaveBeenCalledTimes(1);
    expect(findForCapture).toHaveBeenCalledWith(selected.id);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(selected);
    expect(getEligibleSources).not.toHaveBeenCalled();
  });

  it.each([
    ['missing' as const, 'source-not-found' as const],
    ['inactive' as const, 'source-inactive' as const],
  ])('rechaza selección %s antes de iniciar la captura', async (kind, code) => {
    findForCapture.mockResolvedValue(
      kind === 'missing' ? { kind } : { kind, sourceId: 'source-a' },
    );

    await expect(service.capture('source-a')).rejects.toMatchObject({
      code,
      sourceId: 'source-a',
    });
    expect(capture).not.toHaveBeenCalled();
    expect(getEligibleSources).not.toHaveBeenCalled();
  });

  it.each([
    'source-busy',
    'timeout',
    'fetch/upstream',
    'parse/invalid-rss',
    'unexpected',
  ] as const)('propaga la categoría %s sin reinterpretar mensajes', async (code) => {
    const selected = { id: 'source-a', url: 'https://selected.example/feed' };
    const error = new SourceCaptureError(code, selected.id, new Error('detalle interno'));
    findForCapture.mockResolvedValue({ kind: 'eligible', source: selected });
    capture.mockRejectedValue(error);

    await expect(service.capture(selected.id)).rejects.toBe(error);
  });
});
