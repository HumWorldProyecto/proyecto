export type RssFetchErrorCode = 'timeout' | 'fetch/upstream';

export class RssFetchError extends Error {
  constructor(
    readonly code: RssFetchErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RssFetchError';
  }
}
