import { Inject, Injectable } from '@nestjs/common';
import { RssFetcherPort } from '../ports/rss-fetcher.port';
import { RssFetchError } from '../errors/rss-fetch.error';

/**
 * Token de configuración para el timeout de captura por fuente. El valor
 * concreto es una decisión pendiente (ver design.md); este es un valor
 * técnico por defecto sustituible mediante inyección de dependencias.
 */
export const RSS_FETCH_TIMEOUT_MS = Symbol('RSS_FETCH_TIMEOUT_MS');
export const DEFAULT_RSS_FETCH_TIMEOUT_MS = 10_000;

/**
 * Adaptador HTTP mínimo basado en las APIs nativas de la plataforma
 * (fetch + AbortController), sin comprometer una librería HTTP concreta
 * mientras esa decisión permanezca pendiente.
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
