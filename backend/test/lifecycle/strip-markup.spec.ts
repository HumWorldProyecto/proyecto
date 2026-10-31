import { stripMarkup } from '../../src/common/strip-markup';
describe('Preprocesado equivalente sin backtracking', () => {
  it.each([
    ['', ''], ['hola', 'hola'], ['<p>bueno</p>', ' bueno '],
    ['a<><b>x</b>z', 'a  x z'], ['a<<nested>tag', 'a tag'], ['a<sin cierre', 'a<sin cierre'],
  ])('conserva el comportamiento para %s', (input, expected) => expect(stripMarkup(input)).toBe(expected));
  it('acepta un fragmento largo sin cierre sin perder información', () => {
    const text = '<'.repeat(100_000);
    expect(stripMarkup(text)).toBe(text);
  });
});
