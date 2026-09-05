import {
  assertRssDocumentRoot,
  RssOnlyParser,
} from '../../src/capture/integrations/rss-only-parser';
import { RssParseError } from '../../src/capture/errors/rss-parse.error';

describe('RssOnlyParser', () => {
  const parser = new RssOnlyParser();

  it('interpreta un RSS válido sin ítems', async () => {
    await expect(
      parser.parse('<rss version="2.0"><channel><title>Vacío</title></channel></rss>'),
    ).resolves.toEqual([]);
  });

  it('interpreta un RSS válido con un ítem', async () => {
    const items = await parser.parse(`
      <rss version="2.0"><channel><title>Canal</title><item>
        <title>Una noticia</title><link>https://example.com/one</link><guid>one</guid>
      </item></channel></rss>`);

    expect(items).toEqual([
      expect.objectContaining({
        sourceId: '',
        title: 'Una noticia',
        link: 'https://example.com/one',
        guid: 'one',
      }),
    ]);
  });

  it('interpreta varios ítems y mapea fecha y descripción disponibles en el feed', async () => {
    const items = await parser.parse(`
      <?xml version="1.0"?>
      <rss version="2.0"><channel><title>Canal</title>
        <item><title>Primera</title><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
          <description><![CDATA[Contenido <b>RSS</b>]]></description></item>
        <item><title>Segunda</title><link>https://example.com/two</link></item>
      </channel></rss>`);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: 'Primera',
      pubDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
      description: 'Contenido <b>RSS</b>',
    });
    expect(items[1]).toMatchObject({ title: 'Segunda', link: 'https://example.com/two' });
  });

  it('tolera BOM, whitespace, declaración XML y comentarios iniciales', async () => {
    const rss = '\uFEFF  <?xml version="1.0"?>\n<!-- comentario --><rss version="2.0"><channel><title>x</title></channel></rss>';

    await expect(parser.parse(rss)).resolves.toEqual([]);
  });

  it.each([
    ['Atom', '<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title></feed>'],
    ['HTML', '<!DOCTYPE html><html><body>web</body></html>'],
    ['texto', 'texto arbitrario con <rss></rss> dentro'],
    ['vacío', '   '],
    ['processing instruction ajena', '<?other value?><rss></rss>'],
  ])('rechaza %s antes de invocar el parser de ítems', async (_case, content) => {
    await expect(parser.parse(content)).rejects.toBeInstanceOf(RssParseError);
  });

  it('rechaza RSS malformado aunque la raíz sea rss', async () => {
    await expect(parser.parse('<rss><channel><item></rss>')).rejects.toBeInstanceOf(
      RssParseError,
    );
  });

  it('no busca una etiqueta rss arbitraria dentro del documento', () => {
    expect(() => assertRssDocumentRoot('<html><body>&lt;rss&gt;</body></html>')).toThrow(
      RssParseError,
    );
  });

  it('solo interpreta el XML recibido y no solicita los enlaces de los ítems', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const items = await parser.parse(
      '<rss version="2.0"><channel><title>x</title><item><link>https://example.com/article</link></item></channel></rss>',
    );

    expect(items[0].link).toBe('https://example.com/article');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
