import { Inject, Injectable } from '@nestjs/common';
import {
  EligibleSource,
  SOURCE_REGISTRY_PORT,
  SourceRegistryPort,
} from '../../sources/ports/source-registry.port';
import { RSS_FETCHER_PORT, RssFetcherPort } from '../ports/rss-fetcher.port';
import { RSS_PARSER_PORT, RssParserPort } from '../ports/rss-parser.port';
import { CAPTURE_OUTPUT_PORT, CaptureOutputPort } from '../ports/capture-output.port';

@Injectable()
export class CaptureOrchestratorService {
  constructor(
    @Inject(SOURCE_REGISTRY_PORT) private readonly sourceRegistry: SourceRegistryPort,
    @Inject(RSS_FETCHER_PORT) private readonly fetcher: RssFetcherPort,
    @Inject(RSS_PARSER_PORT) private readonly parser: RssParserPort,
    @Inject(CAPTURE_OUTPUT_PORT) private readonly output: CaptureOutputPort,
  ) {}

  async runCapture(): Promise<void> {
    const sourcesSnapshot = await this.sourceRegistry.getEligibleSources();

    if (sourcesSnapshot.length === 0) {
      return;
    }

    for (const source of sourcesSnapshot) {
      await this.captureSource(source);
    }
  }

  private async captureSource(source: EligibleSource): Promise<void> {
    let rawContent: string;
    try {
      rawContent = await this.fetcher.fetchRaw(source.url);
    } catch {
      return;
    }

    let items;
    try {
      items = (await this.parser.parse(rawContent)).map((item) => ({
        ...item,
        sourceId: source.id,
      }));
    } catch {
      return;
    }

    if (items.length > 0) {
      await this.output.emitItems(items);
    }
  }
}
