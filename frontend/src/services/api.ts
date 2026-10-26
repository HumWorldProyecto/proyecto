import type { Dashboard, Filters, Geography, Source } from '../types/dashboard';

async function json<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, options);
  if (!response.ok)
    throw new Error(
      response.status === 400
        ? 'Revisa los filtros y el intervalo de fechas.'
        : 'No pudimos conectar con los datos. Vuelve a intentarlo.',
    );
  return response.json() as Promise<T>;
}
export const getDashboard = (filter: Filters, signal: AbortSignal) => {
  const query = new URLSearchParams(Object.entries(filter).filter(([, value]) => Boolean(value)));
  return json<Dashboard>(`/dashboards/humor?${query}`, { signal });
};
export const getGeography = (signal: AbortSignal) =>
  json<Geography>('/dashboards/geography', { signal });
export const assignCountry = (sourceId: string, countryCode: string | null, signal: AbortSignal) =>
  json<Source>(`/dashboards/sources/${encodeURIComponent(sourceId)}/geography`, {
    method: 'PUT',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ countryCode }),
  });
