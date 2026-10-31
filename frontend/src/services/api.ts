import type { Dashboard, Filters, Geography, Source } from '../types/dashboard';

async function json<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, options);
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Introduce una clave de acceso válida para consultar las fuentes.'
        : response.status === 403
          ? 'Esta operación requiere una clave de gestión.'
          : response.status === 409
            ? 'La configuración cambió o hay una operación en curso. Actualiza la vista previa.'
          : response.status === 404
            ? 'El recurso ya no existe. Actualiza la información.'
          : response.status === 400
        ? path.startsWith('/dashboards/humor') ? 'Revisa los filtros y el intervalo de fechas.' : 'Revisa los datos introducidos.'
        : 'No pudimos conectar con los datos. Vuelve a intentarlo.',
    );
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export function adminRequest<T>(path: string, accessKey: string, signal: AbortSignal, method = 'GET', body?: unknown) {
  return json<T>(path, { method, signal,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': accessKey },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
export const getDashboard = (filter: Filters, signal: AbortSignal) => {
  const query = new URLSearchParams(Object.entries(filter).filter(([, value]) => Boolean(value)));
  return json<Dashboard>(`/dashboards/humor?${query}`, { signal });
};
export const getGeography = (signal: AbortSignal, accessKey = '') =>
  json<Geography>('/dashboards/geography', {
    signal,
    headers: accessKey ? { 'X-API-Key': accessKey } : {},
  });
export const assignCountry = (sourceId: string, countryCode: string | null, signal: AbortSignal, accessKey = '') =>
  json<Source>(`/dashboards/sources/${encodeURIComponent(sourceId)}/geography`, {
    method: 'PUT',
    signal,
    headers: { 'Content-Type': 'application/json', ...(accessKey ? { 'X-API-Key': accessKey } : {}) },
    body: JSON.stringify({ countryCode }),
  });
