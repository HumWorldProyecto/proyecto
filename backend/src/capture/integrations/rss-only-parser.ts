import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';
import { RssParseError } from '../errors/rss-parse.error';
import { RssParserPort } from '../ports/rss-parser.port';
import { RssItem } from '../types/rss-item';

function skipWhitespace(content: string, start: number): number {
  let index = start;
  while (index < content.length && /\s/u.test(content[index])) {
    index += 1;
  }
  return index;
}

function skipInitialComment(content: string, start: number): number | null {
  if (!content.startsWith('<!--', start)) {
    return null;
  }

  const end = content.indexOf('-->', start + 4);
  if (end < 0) {
    throw new RssParseError('El comentario XML inicial no está cerrado');
  }
  return end + 3;
}

export function assertRssDocumentRoot(rawContent: string): void {
  const content = rawContent.startsWith('\uFEFF') ? rawContent.slice(1) : rawContent;
  let index = skipWhitespace(content, 0);

  if (content.startsWith('<?xml', index)) {
    const boundary = content[index + 5];
    if (boundary !== '?' && !/\s/u.test(boundary ?? '')) {
      throw new RssParseError('La declaración XML no es válida');
    }
    const declarationEnd = content.indexOf('?>', index + 5);
    if (declarationEnd < 0) {
      throw new RssParseError('La declaración XML no está cerrada');
    }
    index = skipWhitespace(content, declarationEnd + 2);
  }

  while (true) {
    const afterComment = skipInitialComment(content, index);
    if (afterComment === null) {
      break;
    }
    index = skipWhitespace(content, afterComment);
  }

  if (content[index] !== '<' || ['/', '!', '?'].includes(content[index + 1] ?? '')) {
    throw new RssParseError('El documento no comienza con una raíz RSS');
  }

  let nameEnd = index + 1;
  while (nameEnd < content.length && !/[\s/>]/u.test(content[nameEnd])) {
    nameEnd += 1;
  }

  if (content.slice(index + 1, nameEnd) !== 'rss') {
    throw new RssParseError('La raíz del documento no es RSS');
  }
}

@Injectable()
export class RssOnlyParser implements RssParserPort {
  private readonly parser = new Parser();

  async parse(rawContent: string): Promise<RssItem[]> {
    try {
      assertRssDocumentRoot(rawContent);
      const feed = await this.parser.parseString(rawContent);
      return feed.items.map((item) => ({
        sourceId: '',
        title: item.title,
        link: item.link,
        guid: item.guid,
        pubDate: item.pubDate ?? item.isoDate,
        description: item.content ?? item.summary ?? item.contentSnippet,
      }));
    } catch (error) {
      if (error instanceof RssParseError) {
        throw error;
      }
      throw new RssParseError('El contenido no es un RSS válido');
    }
  }
}
