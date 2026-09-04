import { Inject, Injectable } from '@nestjs/common';
import { RssFetcherPort } from '../ports/rss-fetcher.port';
import { RssFetchError } from '../errors/rss-fetch.error';
import {
  DEFAULT_RSS_FETCH_TIMEOUT_MS,
  RSS_FETCH_TIMEOUT_MS,
} from '../../rss-http/rss-http-timeout';

/**
 * Adaptador HTTP provisional de HU-01 basado en fetch + AbortController.
 * Consume la configuración neutral compartida, pero su sustitución por la
 * integración HTTP ratificada pertenece al incremento posterior de HU-01.
 */
@Injectable()
export class HttpRssFetcher implements RssFetcherPort {
  constructor(
    @Inject(RSS_FETCH_TIMEOUT_MS) private readonly timeoutMs: number = DEFAULT_RSS_FETCH_TIMEOUT_MS,
  ) {}

  async fetchRaw(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new RssFetchError(`La fuente respondió con estado ${response.status}: ${url}`);
      }
      return await response.text();
    } catch (error) {
      throw new RssFetchError(`No se pudo obtener la fuente RSS: ${url}`, error);
    } finally {
      clearTimeout(timer);
    }
  }
}
