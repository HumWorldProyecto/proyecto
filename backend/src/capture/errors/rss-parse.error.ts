export class RssParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RssParseError';
  }
}
