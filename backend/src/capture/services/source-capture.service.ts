import { Inject, Injectable } from '@nestjs/common';
import { EligibleSource } from '../../sources/ports/source-registry.port';
import { RssFetchError } from '../errors/rss-fetch.error';
import { RssParseError } from '../errors/rss-parse.error';
import { SourceCaptureError } from '../errors/source-capture.error';
import { CAPTURE_OUTPUT_PORT, CaptureOutputPort } from '../ports/capture-output.port';
import { RSS_FETCHER_PORT, RssFetcherPort } from '../ports/rss-fetcher.port';
import { RSS_PARSER_PORT, RssParserPort } from '../ports/rss-parser.port';
import { SourceCaptureResult } from '../types/source-capture-result';
import { SourceCaptureGuard } from './source-capture-guard';

@Injectable()
export class SourceCaptureService {
  constructor(
    @Inject(RSS_FETCHER_PORT) private readonly fetcher: RssFetcherPort,
    @Inject(RSS_PARSER_PORT) private readonly parser: RssParserPort,
    @Inject(CAPTURE_OUTPUT_PORT) private readonly output: CaptureOutputPort,
    private readonly guard: SourceCaptureGuard,
  ) {}

  async capture(source: EligibleSource): Promise<SourceCaptureResult> {
    const lease = this.guard.tryAcquire(source.id);
    if (!lease) {
      throw new SourceCaptureError('source-busy', source.id);
    }

    try {
      const rawContent = await this.fetch(source);
      const parsedItems = await this.parse(source, rawContent);
      const items = parsedItems.map((item) => ({ ...item, sourceId: source.id }));

      if (items.length > 0) {
        try {
          await this.output.emitItems(items);
        } catch (error) {
          throw this.asUnexpected(source.id, error);
        }
      }

      return Object.freeze({
        sourceId: source.id,
        status: 'completed' as const,
        itemsParsed: items.length,
      });
    } finally {
      lease.release();
    }
  }

  private async fetch(source: EligibleSource): Promise<string> {
    try {
      return await this.fetcher.fetchRaw(source.url);
    } catch (error) {
      if (error instanceof RssFetchError) {
        throw new SourceCaptureError(error.code, source.id, error);
      }
      throw this.asUnexpected(source.id, error);
    }
  }

  private async parse(source: EligibleSource, rawContent: string) {
    try {
      return await this.parser.parse(rawContent);
    } catch (error) {
      if (error instanceof RssParseError) {
        throw new SourceCaptureError(error.code, source.id, error);
      }
      throw this.asUnexpected(source.id, error);
    }
  }

  private asUnexpected(sourceId: string, error: unknown): SourceCaptureError {
    if (error instanceof SourceCaptureError) {
      return error;
    }
    return new SourceCaptureError('unexpected', sourceId, error);
  }
}
