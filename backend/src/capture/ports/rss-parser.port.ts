import { RssItem } from '../types/rss-item';

/**
 * Límite abstracto para interpretar contenido RSS.
 * Debe rechazar (throw RssParseError) Atom, HTML y cualquier contenido no RSS.
 */
export interface RssParserPort {
  parse(rawContent: string): Promise<RssItem[]>;
}

export const RSS_PARSER_PORT = Symbol('RSS_PARSER_PORT');
