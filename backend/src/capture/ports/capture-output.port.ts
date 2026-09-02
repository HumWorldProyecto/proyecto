import { RssItem } from '../types/rss-item';

/**
 * Límite abstracto de salida hacia el flujo posterior (persistencia HU-04).
 * HU-01 solo entrega ítems interpretados; no decide persistencia, duplicados,
 * datos mínimos ni actualización de noticias existentes.
 */
export interface CaptureOutputPort {
  emitItems(items: RssItem[]): Promise<void>;
}

export const CAPTURE_OUTPUT_PORT = Symbol('CAPTURE_OUTPUT_PORT');
