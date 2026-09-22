import { SourceCaptureError } from '../../src/capture/errors/source-capture.error';
import { CaptureOrchestratorService } from '../../src/capture/services/capture-orchestrator.service';
import { SourceCaptureService } from '../../src/capture/services/source-capture.service';
import {
  EligibleSource,
  SourceRegistryPort,
} from '../../src/sources/ports/source-registry.port';

function buildRegistry(sources: readonly EligibleSource[]): SourceRegistryPort {
  return {
    getEligibleSources: jest.fn().mockResolvedValue(sources),
    findForCapture: jest.fn(),
  };
}

function buildOrchestrator(
  sourceRegistry: SourceRegistryPort,
  capture: jest.Mock,
): CaptureOrchestratorService {
  return new CaptureOrchestratorService(
    sourceRegistry,
    { capture } as unknown as SourceCaptureService,
  );
}

describe('CaptureOrchestratorService', () => {
  it('obtiene una sola instantánea y procesa únicamente sus fuentes', async () => {
    const sources: EligibleSource[] = [
      { id: 'a', url: 'https://a.example.com/feed.xml' },
      { id: 'b', url: 'https://b.example.com/feed.xml' },
    ];
    const sourceRegistry = buildRegistry(sources);
    const capture = jest.fn().mockResolvedValue(undefined);

    await buildOrchestrator(sourceRegistry, capture).runCapture();

    expect(sourceRegistry.getEligibleSources).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls.map(([source]) => source)).toEqual(sources);
  });

  it('refleja los cambios del registry únicamente en una ejecución posterior', async () => {
    const firstSnapshot = [{ id: 'a', url: 'https://a.example.com/feed.xml' }];
    const secondSnapshot = [
      ...firstSnapshot,
      { id: 'b', url: 'https://b.example.com/feed.xml' },
    ];
    const sourceRegistry: SourceRegistryPort = {
      getEligibleSources: jest
        .fn()
        .mockResolvedValueOnce(firstSnapshot)
        .mockResolvedValueOnce(secondSnapshot),
      findForCapture: jest.fn(),
    };
    const capture = jest.fn().mockResolvedValue(undefined);
    const orchestrator = buildOrchestrator(sourceRegistry, capture);

    await orchestrator.runCapture();
    expect(capture.mock.calls.map(([source]) => source.id)).toEqual(['a']);

    capture.mockClear();
    await orchestrator.runCapture();
    expect(capture.mock.calls.map(([source]) => source.id)).toEqual(['a', 'b']);
  });

  it('recorre las fuentes de forma secuencial', async () => {
    const sources: EligibleSource[] = [
      { id: 'a', url: 'https://a.example.com/feed.xml' },
      { id: 'b', url: 'https://b.example.com/feed.xml' },
    ];
    const events: string[] = [];
    const capture = jest.fn(async (source: EligibleSource) => {
      events.push(`start:${source.id}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      events.push(`end:${source.id}`);
    });

    await buildOrchestrator(buildRegistry(sources), capture).runCapture();

    expect(events).toEqual(['start:a', 'end:a', 'start:b', 'end:b']);
  });

  it('aísla una fuente ocupada y cualquier otro fallo para continuar con las posteriores', async () => {
    const sources: EligibleSource[] = [
      { id: 'busy', url: 'https://busy.example.com/feed.xml' },
      { id: 'failed', url: 'https://failed.example.com/feed.xml' },
      { id: 'working', url: 'https://working.example.com/feed.xml' },
    ];
    const capture = jest
      .fn()
      .mockRejectedValueOnce(new SourceCaptureError('source-busy', 'busy'))
      .mockRejectedValueOnce(new Error('fallo inesperado'))
      .mockResolvedValueOnce({ sourceId: 'working', status: 'completed', itemsParsed: 0 });

    await buildOrchestrator(buildRegistry(sources), capture).runCapture();

    expect(capture).toHaveBeenCalledTimes(3);
    expect(capture.mock.calls.map(([source]) => source.id)).toEqual([
      'busy',
      'failed',
      'working',
    ]);
  });

  it('no inicia capturas cuando la instantánea está vacía', async () => {
    const sourceRegistry = buildRegistry([]);
    const capture = jest.fn();

    await buildOrchestrator(sourceRegistry, capture).runCapture();

    expect(sourceRegistry.getEligibleSources).toHaveBeenCalledTimes(1);
    expect(capture).not.toHaveBeenCalled();
  });
});
