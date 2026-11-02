export const CONTINENT_LABELS = {
  AFRICA: 'África',
  ASIA: 'Asia',
  EUROPE: 'Europa',
  NORTH_AMERICA: 'Norteamérica',
  SOUTH_AMERICA: 'Sudamérica',
  OCEANIA: 'Oceanía',
};
const number = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
  signDisplay: 'exceptZero',
});
export const valueLabel = (value: number | null): string =>
  value === null ? 'Sin evidencia' : number.format(value);
export const moodLabel = (value: number | null): string =>
  value === null ? 'Sin evidencia' : value > 0 ? 'Positivo' : value < 0 ? 'Negativo' : 'Neutral';
export const moodColor = (value: number | null): string =>
  value === null ? '#dce2de' : value > 0 ? '#1f7662' : value < 0 ? '#c56a4d' : '#d3b36a';
export const dateLabel = (date: string): string =>
  new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
export function safeLink(link: string | null): string | undefined {
  if (!link) return undefined;
  try {
    const url = new URL(link);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function plainText(text: string | null): string {
  if (!text) return 'Sin título';
  const parts: string[] = [];
  let cursor = 0;
  while (true) {
    const start = text.indexOf('<', cursor);
    const end = start < 0 ? -1 : text.indexOf('>', start + 1);
    if (end < 0) { parts.push(text.slice(cursor)); break; }
    parts.push(text.slice(cursor, start), ' ');
    cursor = end + 1;
  }
  return parts.join('').replace(/\s+/g, ' ').trim() || 'Sin título';
}
