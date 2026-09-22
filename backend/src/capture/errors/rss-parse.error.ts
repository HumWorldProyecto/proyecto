export class RssParseError extends Error {
  readonly code = 'parse/invalid-rss' as const;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'RssParseError';
  }
}
