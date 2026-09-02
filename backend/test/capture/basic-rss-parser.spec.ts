import { BasicRssParser } from '../../src/capture/integrations/basic-rss-parser';
import { RssParseError } from '../../src/capture/errors/rss-parse.error';

describe('BasicRssParser', () => {
  const parser = new BasicRssParser();

  it('interpreta un RSS válido y produce cero o más ítems', () => {
    const rss = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Canal de prueba</title>
          <item>
            <title>Primera noticia</title>
            <link>https://example.com/noticia-1</link>
            <guid>guid-1</guid>
            <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            <description>Descripción 1</description>
          </item>
          <item>
            <title>Segunda noticia</title>
            <link>https://example.com/noticia-2</link>
          </item>
        </channel>
      </rss>`;

    const items = parser.parse(rss);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: 'Primera noticia',
      link: 'https://example.com/noticia-1',
      guid: 'guid-1',
    });
    expect(items[1]).toMatchObject({
      title: 'Segunda noticia',
      link: 'https://example.com/noticia-2',
    });
  });

  it('interpreta un canal RSS válido sin ítems como cero ítems', () => {
    const rss = `<rss version="2.0"><channel><title>Vacío</title></channel></rss>`;

    expect(parser.parse(rss)).toEqual([]);
  });

  it('rechaza contenido Atom', () => {
    const atom = `<?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Feed Atom</title>
        <entry><title>Entrada</title></entry>
      </feed>`;

    expect(() => parser.parse(atom)).toThrow(RssParseError);
  });

  it('rechaza contenido HTML', () => {
    const html = `<!DOCTYPE html><html><head><title>Página</title></head><body>Hola</body></html>`;

    expect(() => parser.parse(html)).toThrow(RssParseError);
  });

  it('rechaza RSS inválido o contenido vacío', () => {
    expect(() => parser.parse('esto no es xml ni rss')).toThrow(RssParseError);
    expect(() => parser.parse('')).toThrow(RssParseError);
  });

  it('extrae el texto envuelto en CDATA', () => {
    const rss = `<rss version="2.0">
      <channel>
        <item>
          <title><![CDATA[Título con <etiquetas>]]></title>
        </item>
      </channel>
    </rss>`;

    const items = parser.parse(rss);

    expect(items[0].title).toBe('Título con <etiquetas>');
  });

  it('no extrae contenido de páginas enlazadas: solo usa la información del propio feed', () => {
    const rss = `<rss version="2.0">
      <channel>
        <item>
          <title>Con enlace</title>
          <link>https://example.com/pagina-enlazada</link>
        </item>
      </channel>
    </rss>`;

    const items = parser.parse(rss);

    expect(items).toHaveLength(1);
    expect(items[0].link).toBe('https://example.com/pagina-enlazada');
  });
});
