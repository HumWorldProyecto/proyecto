export type SourceCaptureErrorCode =
  | 'timeout'
  | 'fetch/upstream'
  | 'parse/invalid-rss'
  | 'source-not-found'
  | 'source-inactive'
  | 'source-busy'
  | 'unexpected';

export class SourceCaptureError extends Error {
  constructor(
    readonly code: SourceCaptureErrorCode,
    readonly sourceId: string,
    readonly cause?: unknown,
  ) {
    super(`La captura de la fuente terminó con la categoría ${code}`);
    this.name = 'SourceCaptureError';
  }
}
