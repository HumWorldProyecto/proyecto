import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DictionaryPanel } from '../src/components/DictionaryPanel';
import { CaptureSettings } from '../src/components/CaptureSettings';
import { NewsActions } from '../src/components/NewsActions';
import { SourceCountries } from '../src/components/SourceCountries';
import { App } from '../src/App';
import { WorldMap } from '../src/components/WorldMap';
import { renderMap } from '../src/components/graphics';
import { dashboard, geography } from './fixtures';

vi.mock('../src/components/graphics', () => ({ renderMap: vi.fn(() => vi.fn()), renderTimeline: vi.fn(() => vi.fn()) }));
const ok = (value: unknown, status = 200) => ({ ok: status < 400, status, json: async () => structuredClone(value) }) as Response;
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('diccionario: crea, busca, cambia término/idioma/peso y elimina con confirmación sin recalcular históricos', async () => {
  let entries = Array.from({ length: 11 }, (_, i) => ({ id: `d${i}`, term: `término ${i}`, language: 'es', weight: 1 }));
  const fetcher = vi.fn(async (path: string, options?: RequestInit) => {
    const method = options?.method ?? 'GET'; const body = options?.body ? JSON.parse(String(options.body)) : {};
    if (method === 'POST') { const entry = { id: 'new', ...body }; entries.push(entry); return ok(entry, 201); }
    if (method === 'PATCH') { entries = entries.map(entry => path.endsWith('/' + entry.id) ? { ...entry, ...body } : entry); return ok({}); }
    if (method === 'DELETE') { entries = entries.filter(entry => !path.endsWith('/' + entry.id)); return ok(undefined, 204); }
    return ok(entries);
  });
  vi.stubGlobal('fetch', fetcher); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const user = userEvent.setup(); render(<DictionaryPanel credential="test" />);
  await screen.findByRole('form', { name: 'Editar término 0' });
  await user.click(screen.getByRole('button', { name: 'Mostrar más entradas' }));
  expect(screen.getByRole('form', { name: 'Editar término 10' })).toBeVisible();
  await user.type(screen.getByLabelText('Nuevo término'), 'esperanza');
  await user.selectOptions(screen.getByLabelText('Idioma del término'), 'en');
  fireEvent.change(screen.getByLabelText('Peso del término'), { target: { value: '4' } });
  await user.click(screen.getByRole('button', { name: 'Crear entrada' }));
  await screen.findByText('Entrada creada');
  await user.type(screen.getByLabelText('Buscar término'), 'esperanza');
  let row = await screen.findByRole('form', { name: 'Editar esperanza' });
  await user.clear(within(row).getByLabelText('Término')); await user.type(within(row).getByLabelText('Término'), 'optimismo');
  await user.selectOptions(within(row).getByLabelText('Idioma'), 'es');
  fireEvent.change(within(row).getByLabelText('Peso'), { target: { value: '-3' } });
  await user.click(within(row).getByRole('button', { name: 'Guardar entrada' }));
  await screen.findByText('No hay entradas para esta búsqueda.');
  await user.clear(screen.getByLabelText('Buscar término')); await user.type(screen.getByLabelText('Buscar término'), 'optimismo');
  await user.selectOptions(screen.getByLabelText('Filtrar idioma'), 'en');
  expect(screen.getByText('No hay entradas para esta búsqueda.')).toBeVisible();
  await user.selectOptions(screen.getByLabelText('Filtrar idioma'), 'es');
  row = screen.getByRole('form', { name: 'Editar optimismo' });
  await user.click(within(row).getByRole('button', { name: 'Eliminar entrada' }));
  expect(fetcher.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false);
  confirm.mockReturnValue(true); await user.click(within(row).getByRole('button', { name: 'Eliminar entrada' }));
  await screen.findByText('No hay entradas para esta búsqueda.');
  expect(entries.some(entry => entry.id === 'new')).toBe(false);
  expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'PATCH')[0][1]?.body).toBe('{"term":"optimismo","language":"es","weight":-3}');
  expect(fetcher.mock.calls.some(([path]) => path.includes('/sentiment'))).toBe(false);
});

it('diccionario: error de carga recuperable y error de escritura se muestran', async () => {
  const fetcher = vi.fn().mockResolvedValue(ok({}, 503)); vi.stubGlobal('fetch', fetcher);
  const user = userEvent.setup(); render(<DictionaryPanel credential="" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar');
  fetcher.mockResolvedValue(ok([])); await user.click(screen.getByRole('button', { name: 'Reintentar diccionario' }));
  await screen.findByText('No hay entradas para esta búsqueda.');
  fetcher.mockResolvedValue(ok({}, 400));
  await user.type(screen.getByLabelText('Nuevo término'), 'prueba'); await user.click(screen.getByRole('button', { name: 'Crear entrada' }));
  expect(await screen.findByRole('status')).toHaveTextContent('datos introducidos');
});

it('diccionario conserva la confirmación después de refrescar el peso persistido', async () => {
  let weight = 1;
  const fetcher = vi.fn(async (_path: string, options?: RequestInit) => {
    if (options?.method === 'PATCH') weight = JSON.parse(String(options.body)).weight;
    return ok([{ id: 'entry', term: 'prueba', language: 'es', weight }]);
  }); vi.stubGlobal('fetch', fetcher);
  const user = userEvent.setup(); render(<DictionaryPanel credential="" />);
  const form = await screen.findByRole('form', { name: 'Editar prueba' });
  fireEvent.change(within(form).getByLabelText('Peso'), { target: { value: '-4' } });
  await user.click(within(form).getByRole('button', { name: 'Guardar entrada' }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  expect(await screen.findByText('Entrada guardada. Los análisis anteriores conservan sus valores.')).toBeVisible();
  expect(screen.getByLabelText('Peso', { exact: true })).toHaveValue(-4);
});

it('periodicidad: carga, cambia y persiste un intervalo admitido', async () => {
  let minutes: number | null = 60;
  const fetcher = vi.fn(async (_path: string, options?: RequestInit) => {
    if (options?.method === 'PUT') minutes = JSON.parse(String(options.body)).capturePeriodicityMinutes;
    return ok({ capturePeriodicityMinutes: minutes });
  }); vi.stubGlobal('fetch', fetcher);
  const user = userEvent.setup(); render(<CaptureSettings credential="test" />);
  await waitFor(() => expect(screen.getByLabelText('Intervalo de captura')).toHaveValue('60'));
  await user.selectOptions(screen.getByLabelText('Intervalo de captura'), '15');
  await user.click(screen.getByRole('button', { name: 'Guardar periodicidad' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Periodicidad guardada'); expect(minutes).toBe(15);
});

it('periodicidad: recupera errores y representa la configuración inicialmente ausente', async () => {
  const fetcher = vi.fn().mockResolvedValue(ok({}, 503)); vi.stubGlobal('fetch', fetcher);
  const user = userEvent.setup(); render(<CaptureSettings credential="" />);
  await screen.findByRole('alert'); fetcher.mockResolvedValue(ok({ capturePeriodicityMinutes: null }));
  await user.click(screen.getByRole('button', { name: 'Reintentar periodicidad' }));
  await waitFor(() => expect(screen.getByLabelText('Intervalo de captura')).toHaveValue(''));
  expect(screen.getByRole('button', { name: 'Guardar periodicidad' })).toBeDisabled();
});

it('noticia: muestra metadatos, analiza con idioma elegido y borra solo tras confirmar', async () => {
  const fetcher = vi.fn(async (_path: string, _options?: RequestInit) => ok({ capturedAt: '2026-11-09T12:00:00Z', continent: 'SOUTH_AMERICA', mediaTopics: [{ qcode: 'medtop:07000000', label: 'Salud' }] }));
  vi.stubGlobal('fetch', fetcher); const changed = vi.fn(); const user = userEvent.setup();
  render(<NewsActions id="n1" language="es" credential="test" canManage onChanged={changed} />);
  await screen.findByText(/Categorías IPTC de la noticia: Salud/);
  await user.selectOptions(screen.getByLabelText('Idioma del análisis'), 'en');
  await user.click(screen.getByRole('button', { name: 'Analizar y guardar' }));
  await screen.findByText('Análisis guardado'); expect(changed).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith('/api/v1/news/n1/sentiment', expect.objectContaining({ method: 'POST', body: '{"language":"en"}' }));
  await user.click(screen.getByRole('button', { name: 'Eliminar noticia' }));
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(fetcher.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Eliminar noticia' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
  await screen.findByText('Noticia eliminada'); expect(changed).toHaveBeenCalledTimes(2);
});

it('noticia: consulta sin gestión, metadatos ausentes y error de consulta', async () => {
  const fetcher = vi.fn().mockResolvedValue(ok({ capturedAt: '2026-11-09T12:00:00Z', continent: null, mediaTopics: [] }));
  vi.stubGlobal('fetch', fetcher); const view = render(<NewsActions id="n1" language={null} credential="" canManage={false} onChanged={vi.fn()} />);
  await screen.findByText(/sin coincidencias de clasificación/); expect(screen.queryByText('Eliminar noticia')).not.toBeInTheDocument();
  view.unmount(); fetcher.mockResolvedValue(ok({}, 404));
  render(<NewsActions id="missing" language={null} credential="" canManage={false} onChanged={vi.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('ya no existe');
});

it('evaluación local: navegación administrativa sin clave, diccionario y captura separados', async () => {
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    if (path.endsWith('/config')) return ok({ evaluationMode: true, capturePeriodicityMinutes: 60 });
    if (path.endsWith('/news/purge-preview')) return ok({ retentionDays: null, cutoff: null, totalCount: 0, expiredCount: 0 });
    if (path.endsWith('/dictionary') || path.endsWith('/channels')) return ok([]);
    if (path.includes('/geography')) return ok(geography);
    if (path === '/world.geo.json') return ok({ type: 'FeatureCollection', features: [] });
    return ok(dashboard);
  }));
  const user = userEvent.setup(); render(<App />); await screen.findByText('El mundo en perspectiva');
  await user.click(screen.getByRole('link', { name: 'Administración' }));
  expect(await screen.findByText(/Evaluación local/)).toBeVisible(); expect(screen.queryByLabelText('Clave de acceso')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Diccionario' })); await screen.findByRole('heading', { name: 'Diccionario de sentimiento' });
  await user.click(screen.getByRole('button', { name: 'Captura automática' })); await screen.findByRole('heading', { name: 'Captura automática' });
  await user.click(screen.getByRole('button', { name: 'Caducidad y purgado' })); await screen.findByRole('heading', { name: 'Caducidad y purgado' });
});

it('evaluación local: eliminar fuente requiere confirmación y el modo normal no ofrece ese borrado', async () => {
  const fetcher = vi.fn(async (_path: string, _options?: RequestInit) => ok([{ id: 'c1', name: 'Medio' }])); vi.stubGlobal('fetch', fetcher);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false); const user = userEvent.setup(); const saved = vi.fn();
  const props = { sources: [{ ...geography.sources[0], channelId: 'c1', language: 'es' as const, mediaTopicQcode: 'medtop:07000000' }], countries: geography.countries, onSaved: saved, initiallyOpen: true };
  const view = render(<SourceCountries {...props} evaluationMode />);
  await user.click(screen.getByText('Gestionar fuente'));
  await user.click(screen.getByRole('button', { name: 'Eliminar fuente y noticias' }));
  expect(fetcher.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false);
  confirm.mockReturnValue(true); await user.click(screen.getByRole('button', { name: 'Eliminar fuente y noticias' }));
  await screen.findByText('Fuente y noticias eliminadas'); expect(saved).toHaveBeenCalled();
  view.rerender(<SourceCountries {...props} evaluationMode={false} />);
  expect(screen.queryByRole('button', { name: 'Eliminar fuente y noticias' })).not.toBeInTheDocument();
});

it('mapa por continente pondera por noticias con evidencia y permite consultar el continente', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ok({ type: 'FeatureCollection', features: [] })));
  const user = userEvent.setup(); const select = vi.fn(); const continent = vi.fn();
  render(<WorldMap countries={dashboard.countries} onSelect={select} onSelectContinent={continent} />);
  await user.selectOptions(screen.getByLabelText('Agrupar mapa por'), 'continent');
  const list = screen.getByLabelText('Humor por continente');
  const south = within(list).getByRole('button', { name: /Sudamérica/ });
  const countries = dashboard.countries.filter(country => country.continent === 'SOUTH_AMERICA');
  const count = countries.reduce((sum, country) => sum + country.withEvidence, 0);
  const average = count ? countries.reduce((sum, country) => sum + (country.average ?? 0) * country.withEvidence, 0) / count : null;
  await waitFor(() => expect(renderMap).toHaveBeenCalled());
  const last = vi.mocked(renderMap).mock.calls.at(-1)!;
  expect(last[2].find(country => country.continent === 'SOUTH_AMERICA')?.average).toBe(average);
  await user.click(south); expect(continent).toHaveBeenCalledWith('SOUTH_AMERICA');
  const code = dashboard.countries[0].code; last[3](code);
  expect(continent).toHaveBeenCalledWith(dashboard.countries[0].continent);
  await user.selectOptions(screen.getByLabelText('Agrupar mapa por'), 'country');
  await waitFor(() => expect(vi.mocked(renderMap).mock.calls.at(-1)![2]).toEqual(dashboard.countries));
  vi.mocked(renderMap).mock.calls.at(-1)![3](code); expect(select).toHaveBeenCalledWith(code);
});

it('la selección de día refresca mapa, nube y resumen con el mismo filtro y permite volver al rango', async () => {
  const fetcher = vi.fn(async (path: string) => {
    if (path === '/world.geo.json') return ok({ type: 'FeatureCollection', features: [] });
    if (path.endsWith('/config')) return ok({ evaluationMode: false });
    if (path.includes('from=')) return ok({ ...dashboard, summary: { ...dashboard.summary, total: 123 }, words: [], news: [] });
    return ok(dashboard);
  }); vi.stubGlobal('fetch', fetcher);
  const user = userEvent.setup(); render(<App />); await screen.findByText('El mundo en perspectiva');
  const days = screen.getByLabelText('Consultar detalle por día');
  await user.click(within(days).getAllByRole('button')[1]);
  await screen.findByText('123');
  expect(fetcher.mock.calls.some(([path]) => path.includes(`from=${dashboard.timeline[0].date}&to=${dashboard.timeline[0].date}`))).toBe(true);
  expect(screen.getByText(/No hay palabras guardadas para esta selección/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Volver al rango completo' }));
  expect(screen.queryByText('123')).not.toBeInTheDocument();
});
