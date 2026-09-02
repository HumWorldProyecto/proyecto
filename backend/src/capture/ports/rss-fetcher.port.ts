/**
 * Límite abstracto para realizar una solicitud RSS con finalización finita.
 * Debe rechazar (throw) cuando la solicitud falla o excede su timeout/cancelación.
 */
export interface RssFetcherPort {
  fetchRaw(url: string): Promise<string>;
}

export const RSS_FETCHER_PORT = Symbol('RSS_FETCHER_PORT');
