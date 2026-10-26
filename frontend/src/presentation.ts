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
  return (
    text
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Sin título'
  );
}
