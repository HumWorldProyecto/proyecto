/** Sustituye bloques <...> por espacios en tiempo lineal, conservando fragmentos sin cierre. */
export function stripMarkup(text: string): string {
  const parts: string[] = [];
  let cursor = 0;
  while (true) {
    const start = text.indexOf('<', cursor);
    const end = start < 0 ? -1 : text.indexOf('>', start + 1);
    if (end < 0) { parts.push(text.slice(cursor)); break; }
    parts.push(text.slice(cursor, start), ' ');
    cursor = end + 1;
  }
  return parts.join('');
}
