import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceCountries } from '../src/components/SourceCountries';
import { geography } from './fixtures';

afterEach(() => { vi.unstubAllGlobals(); });
const sources = [
  { ...geography.sources[0], id: 'a', active: true, url: 'https://a.example/rss' },
  { ...geography.sources[0], id: 'b', active: true, url: 'https://b.example/rss' },
  { ...geography.sources[0], id: 'c', active: false, url: 'https://c.example/rss' },
];
const ok = (value: unknown, status = 200) => ({ ok: status < 400, status, json: async () => value }) as Response;

it('captura dos fuentes activas entre búsquedas, envía la clave y conserva solo fallidas para reintentar', async () => {
  const fetcher = vi.fn(async (path: string) => path.endsWith('/sources/capture')
    ? ok({ results: [{ sourceId: 'a', status: 'completed', itemsParsed: 3 }, { sourceId: 'b', status: 'failed', errorCode: 'timeout' }] })
    : ok([]));
  vi.stubGlobal('fetch', fetcher); const user = userEvent.setup(); const saved = vi.fn();
  render(<SourceCountries sources={sources} countries={geography.countries} credential="test-key" onSaved={saved} initiallyOpen />);
  const button = screen.getByRole('button', { name: 'Capturar fuentes seleccionadas' });
  expect(button).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: 'Seleccionar https://c.example/rss' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: 'Seleccionar https://a.example/rss' }));
  expect(button).toBeDisabled();
  await user.type(screen.getByRole('searchbox', { name: 'Buscar fuente' }), 'b.example');
  await user.click(screen.getByRole('checkbox', { name: 'Seleccionar https://b.example/rss' }));
  await user.click(button);
  await screen.findByText('Captura múltiple. Completadas: 1. Sin completar: 1.');
  expect(fetcher).toHaveBeenCalledWith('/api/v1/sources/capture', expect.objectContaining({
    method: 'POST', body: '{"sourceIds":["a","b"]}', headers: expect.objectContaining({ 'X-API-Key': 'test-key' }),
  }));
  const results = screen.getByRole('list', { name: 'Resultado de captura múltiple' });
  expect(within(results).getByText(/a.example.*3 ítems leídos/)).toBeVisible();
  expect(within(results).getByText(/b.example.*No se completó/)).toBeVisible();
  expect(saved).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Limpiar selección' }));
  expect(screen.getByText(/0 fuentes activas seleccionadas/)).toBeVisible();
});

it('muestra error de permisos sin fingir una captura y retira de la selección fuentes pausadas tras refrescar', async () => {
  vi.stubGlobal('fetch', vi.fn(async (path: string) => path.endsWith('/sources/capture') ? ok({}, 403) : ok([])));
  const user = userEvent.setup(); const saved = vi.fn();
  const view = render(<SourceCountries sources={sources} countries={geography.countries} onSaved={saved} initiallyOpen />);
  await user.click(screen.getByRole('checkbox', { name: 'Seleccionar https://a.example/rss' }));
  await user.click(screen.getByRole('checkbox', { name: 'Seleccionar https://b.example/rss' }));
  await user.click(screen.getByRole('button', { name: 'Capturar fuentes seleccionadas' }));
  await screen.findByText('Esta operación requiere una clave de gestión.');
  expect(saved).not.toHaveBeenCalled();
  view.rerender(<SourceCountries sources={sources.map(source => ({ ...source, active: false }))} countries={geography.countries} onSaved={saved} initiallyOpen />);
  expect(screen.getByText(/0 fuentes activas seleccionadas/)).toBeVisible();
});
