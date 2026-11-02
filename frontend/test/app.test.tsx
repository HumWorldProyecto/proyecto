import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { dashboard, geography } from './fixtures';
import { renderMap, renderTimeline } from '../src/components/graphics';

vi.mock('../src/components/graphics', () => ({
  renderMap: vi.fn(() => vi.fn()),
  renderTimeline: vi.fn(() => vi.fn()),
}));

const response = (value: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => structuredClone(value) }) as Response;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === '/world.geo.json') return response({ type: 'FeatureCollection', features: [] });
    if (options?.method === 'PUT') return response(geography.sources[0]);
    return response(url.includes('/geography') ? geography : dashboard);
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
const ready = async () => {
  await screen.findByRole('heading', { name: 'El mundo en perspectiva' });
  await waitFor(() => expect(renderMap).toHaveBeenCalled());
};

it('muestra el resultado coherente, nube, ranking y detalle seguro', async () => {
  const user = userEvent.setup();
  render(<App />);
  await ready();
  expect(screen.getByRole('region', { name: 'Resumen del resultado' })).toHaveTextContent('0,25');
  expect(screen.getByText(/1 noticias no tienen país/)).toBeVisible();
  const cloud = screen.getByRole('region', { name: 'Palabras que pesan' });
  const positive = within(cloud).getByRole('button', { name: 'bueno es' });
  const negative = within(cloud).getByRole('button', { name: 'malo es' });
  expect(parseFloat(positive.style.fontSize)).toBeGreaterThan(parseFloat(negative.style.fontSize));
  await user.click(positive);
  expect(screen.getByRole('complementary', { name: 'Detalle de bueno' })).toHaveTextContent(
    '2 coincidencias en 1 noticias',
  );
  await user.click(
    within(screen.getByRole('complementary')).getByRole('button', {
      name: 'Buenas noticias para Chile',
    }),
  );
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('Una noticia buena');
  expect(within(dialog).getByRole('link', { name: /Abrir noticia original/ })).toHaveAttribute(
    'href',
    'https://example.org/news',
  );
  expect(dialog.querySelector('b')).toBeNull();
  await user.click(within(dialog).getByRole('button', { name: 'Cerrar detalle' }));
  await user.click(screen.getByRole('button', { name: 'Cerrar palabra' }));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /20 oct 2026/ }));
  expect(
    within(screen.getByRole('region', { name: 'Noticias influyentes' })).queryByText(
      'Buenas noticias para Chile',
    ),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Todos los días' }));
  await user.click(screen.getByRole('button', { name: 'Una noticia histórica' }));
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Las palabras de este análisis no están disponibles.',
  );
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('consulta filtros geográficos y fechas, mantiene intervalo al seleccionar mapa y limpia', async () => {
  const user = userEvent.setup();
  render(<App />);
  await ready();
  await user.selectOptions(screen.getByLabelText('Continente'), 'SOUTH_AMERICA');
  expect(
    within(screen.getByLabelText('País')).queryByRole('option', { name: 'España' }),
  ).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('País'), 'CL');
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-20' } });
  await user.click(screen.getByRole('button', { name: /Consultar ↗/ }));
  await ready();
  expect(
    fetchMock.mock.calls.some(
      ([url]) =>
        url.includes('country=CL') &&
        url.includes('from=2026-10-01') &&
        url.includes('to=2026-10-20'),
    ),
  ).toBe(true);
  act(() => vi.mocked(renderMap).mock.calls.at(-1)![3]('ES'));
  await ready();
  expect(screen.getByLabelText('Continente')).toHaveValue('');
  expect(screen.getByLabelText('País')).toHaveValue('ES');
  expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-01');
  await user.click(screen.getByRole('button', { name: 'Limpiar' }));
  await ready();
  expect(screen.getByLabelText('Desde')).toHaveValue('');
  await user.selectOptions(screen.getByLabelText('Continente'), 'EUROPE');
  await user.click(screen.getByRole('button', { name: /Consultar ↗/ }));
  await ready();
  expect(screen.getByText('Europa', { selector: '.context-line span' })).toBeVisible();
  await user.click(screen.getByText('Consultar valores y cobertura por país'));
  await user.click(screen.getByRole('button', { name: 'Chile' }));
  await ready();
  expect(screen.getByLabelText('País')).toHaveValue('CL');
});

it('asigna explícitamente país de la fuente y actualiza la consulta', async () => {
  const user = userEvent.setup();
  render(<App />);
  await ready();
  await user.click(screen.getByText('Procedencia de las fuentes'));
  await user.selectOptions(screen.getByLabelText(/https:\/\/example.org\/rss/), 'CL');
  await user.click(screen.getByRole('button', { name: 'Guardar país' }));
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(
        ([, options]) => options?.method === 'PUT' && options.body === '{"countryCode":"CL"}',
      ),
    ).toBe(true),
  );
  await ready();
});

it('muestra error recuperable y no conserva datos anteriores', async () => {
  let failed = true;
  fetchMock.mockImplementation(async (url: string) =>
    response(
      url.includes('/geography') ? geography : dashboard,
      url.includes('/geography') || !failed,
      503,
    ),
  );
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar este resultado');
  expect(screen.queryByRole('region', { name: 'Resumen del resultado' })).not.toBeInTheDocument();
  failed = false;
  await user.click(screen.getByRole('button', { name: 'Reintentar consulta' }));
  await ready();
});

it('comunica catálogo no disponible y permite reintentar', async () => {
  fetchMock.mockImplementation(async (url: string) =>
    response(
      url === '/world.geo.json' ? { type: 'FeatureCollection', features: [] } : dashboard,
      !url.includes('/geography'),
      503,
    ),
  );
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No pudimos conectar con los datos',
  );
  // El catálogo público del resultado mantiene los filtros si falla el acceso a fuentes.
  await waitFor(() => expect(screen.getByLabelText('País')).not.toBeDisabled());
  await user.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(fetchMock.mock.calls.filter(([url]) => url.includes('/geography')).length).toBeGreaterThan(
    1,
  );
});

it('muestra vacíos y ausencia de evidencia con cobertura real', async () => {
  const empty = {
    ...dashboard,
    summary: {
      ...dashboard.summary,
      total: 0,
      analyzed: 0,
      withEvidence: 0,
      unknownCountry: 0,
      average: null,
      missingTermEvidence: 0,
    },
    news: [],
    words: [],
    timeline: [],
    countries: [],
  };
  fetchMock.mockImplementation(async (url: string) =>
    response(
      url === '/world.geo.json'
        ? { type: 'FeatureCollection', features: [] }
        : url.includes('/geography')
          ? { ...geography, sources: [] }
          : empty,
    ),
  );
  const user = userEvent.setup();
  render(<App />);
  await ready();
  expect(screen.getByText(/La evolución aparecerá/)).toBeVisible();
  expect(screen.getByText(/No hay palabras guardadas/)).toBeVisible();
  expect(screen.getByText(/No hay noticias para mostrar/)).toBeVisible();
  await user.click(screen.getByText('Procedencia de las fuentes'));
  expect(screen.getByText('No hay fuentes RSS registradas.')).toBeVisible();
});
