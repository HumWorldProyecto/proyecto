import { Injectable } from '@nestjs/common';
import { RssParserPort } from '../ports/rss-parser.port';
import { RssItem } from '../types/rss-item';
import { RssParseError } from '../errors/rss-parse.error';

const ITEM_TAG_PATTERN = /<item[^>]*>([\s\S]*?)<\/item>/gi;

/**
 * Interpretación mínima de RSS 2.0 sin dependencias externas. La librería
 * concreta de parseo RSS es una decisión pendiente (ver design.md); este
 * adaptador cumple el contrato funcional (aceptar RSS, rechazar Atom/HTML/
 * contenido inválido) mientras esa decisión no se apruebe.
 */
@Injectable()
export class BasicRssParser implements RssParserPort {
  parse(rawContent: string): RssItem[] {
    const content = rawContent.trim();

    if (!content) {
      throw new RssParseError('El contenido está vacío y no es un RSS válido');
    }

    if (!/<rss[\s>]/i.test(content) || !/<channel[\s>]/i.test(content)) {
      throw new RssParseError('El contenido no es un feed RSS válido');
    }

    const items: RssItem[] = [];
    let match: RegExpExecArray | null;
    ITEM_TAG_PATTERN.lastIndex = 0;

    while ((match = ITEM_TAG_PATTERN.exec(content)) !== null) {
      const itemBlock = match[1];
      items.push({
        sourceId: '',
        title: this.extractTag(itemBlock, 'title'),
        link: this.extractTag(itemBlock, 'link'),
        guid: this.extractTag(itemBlock, 'guid'),
        pubDate: this.extractTag(itemBlock, 'pubDate'),
        description: this.extractTag(itemBlock, 'description'),
      });
    }

    return items;
  }

  private extractTag(block: string, tag: string): string | undefined {
    const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (!match) {
      return undefined;
    }
    return this.stripCdata(match[1]).trim();
  }

  private stripCdata(value: string): string {
    const cdataMatch = value.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
    return cdataMatch ? cdataMatch[1] : value;
  }
}
