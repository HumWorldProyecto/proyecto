import { SourceCaptureError } from '../../src/capture/errors/source-capture.error';
import { MultipleSourceCaptureInputError } from '../../src/capture/errors/multiple-source-capture-input.error';
import { ManualSourceCaptureService } from '../../src/capture/services/manual-source-capture.service';
import { MultipleSourceCaptureService } from '../../src/capture/services/multiple-source-capture.service';
import { SourceCaptureResult } from '../../src/capture/types/source-capture-result';

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

function completed(sourceId: string, itemsParsed = 1): SourceCaptureResult {
  return { sourceId, status: 'completed', itemsParsed };
}

const INVALID_SELECTIONS: Array<[string[]]> = [
  [[]],
  [['source-a']],
  [['source-a', 'source-a']],
];

describe('MultipleSourceCaptureService', () => {
  const capture = jest.fn();
  const service = new MultipleSourceCaptureService({
    capture,
  } as unknown as ManualSourceCaptureService);

  beforeEach(() => jest.clearAllMocks());

  it('captura dos fuentes en orden y devuelve ambos éxitos', async () => {
    capture
      .mockResolvedValueOnce(completed('source-a', 2))
      .mockResolvedValueOnce(completed('source-b', 3));

    await expect(service.capture(['source-a', 'source-b'])).resolves.toEqual({
      results: [completed('source-a', 2), completed('source-b', 3)],
    });
    expect(capture.mock.calls).toEqual([['source-a'], ['source-b']]);
  });

  it('deduplica preservando la primera aparición y no captura fuentes no seleccionadas', async () => {
    capture
      .mockResolvedValueOnce(completed('source-a'))
      .mockResolvedValueOnce(completed('source-b'));

    const response = await service.capture(['source-a', 'source-b', 'source-a']);

    expect(response.results.map(({ sourceId }) => sourceId)).toEqual([
      'source-a',
      'source-b',
    ]);
    expect(capture.mock.calls).toEqual([['source-a'], ['source-b']]);
    expect(capture).not.toHaveBeenCalledWith('source-c');
  });

  it.each(INVALID_SELECTIONS)('rechaza %j cuando quedan menos de dos IDs efectivos sin capturar', async (sourceIds) => {
    await expect(service.capture(sourceIds)).rejects.toBeInstanceOf(
      MultipleSourceCaptureInputError,
    );
    expect(capture).not.toHaveBeenCalled();
  });

  it.each([
    'source-not-found',
    'source-inactive',
    'source-busy',
    'fetch/upstream',
    'parse/invalid-rss',
    'timeout',
    'unexpected',
  ] as const)('conserva la categoría tipada %s y continúa', async (errorCode) => {
    capture
      .mockResolvedValueOnce(completed('source-a'))
      .mockRejectedValueOnce(
        new SourceCaptureError(
          errorCode,
          'source-b',
          new Error('upstream.internal 10.0.0.8 secreto'),
        ),
      )
      .mockResolvedValueOnce(completed('source-c'));

    await expect(
      service.capture(['source-a', 'source-b', 'source-c']),
    ).resolves.toEqual({
      results: [
        completed('source-a'),
        {
          sourceId: 'source-b',
          status: 'failed',
          errorCode,
        },
        completed('source-c'),
      ],
    });
    expect(capture.mock.calls).toEqual([
      ['source-a'],
      ['source-b'],
      ['source-c'],
    ]);
  });

  it('convierte un error desconocido a unexpected, no filtra detalles y continúa', async () => {
    capture
      .mockRejectedValueOnce(new Error('prisma.internal 10.0.0.9 secreto'))
      .mockResolvedValueOnce(completed('source-b'));

    const response = await service.capture(['source-a', 'source-b']);

    expect(response).toEqual({
      results: [
        {
          sourceId: 'source-a',
          status: 'failed',
          errorCode: 'unexpected',
        },
        completed('source-b'),
      ],
    });
    expect(JSON.stringify(response)).not.toMatch(
      /prisma\.internal|10\.0\.0\.9|secreto/,
    );
  });

  it('convierte una categoría tipada futura a unexpected', async () => {
    const error = new SourceCaptureError('unexpected', 'source-a');
    Object.defineProperty(error, 'code', { value: 'future-category' });
    capture
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(completed('source-b'));

    await expect(service.capture(['source-a', 'source-b'])).resolves.toEqual({
      results: [
        {
          sourceId: 'source-a',
          status: 'failed',
          errorCode: 'unexpected',
        },
        completed('source-b'),
      ],
    });
  });

  it('no inicia la segunda captura antes de que se resuelva la primera', async () => {
    const first = deferred<SourceCaptureResult>();
    capture
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(completed('source-b', 2));

    const operation = service.capture(['source-a', 'source-b']);
    await Promise.resolve();

    expect(capture.mock.calls).toEqual([['source-a']]);

    first.resolve(completed('source-a', 1));

    await expect(operation).resolves.toEqual({
      results: [completed('source-a', 1), completed('source-b', 2)],
    });
    expect(capture.mock.calls).toEqual([['source-a'], ['source-b']]);
  });
});
