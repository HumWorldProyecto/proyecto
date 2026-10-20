import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorldMap } from '../src/components/WorldMap';
import { NewsDialog, WordCloud, WordDetail, NewsRanking } from '../src/components/Evidence';
import { SourceCountries } from '../src/components/SourceCountries';
import { useResource } from '../src/services/use-resource';
import { getDashboard, getGeography, assignCountry } from '../src/services/api';
import { moodLabel, moodColor, plainText, safeLink, valueLabel } from '../src/presentation';
import { dashboard, geography, news } from './fixtures';
import { renderMap } from '../src/components/graphics';

vi.mock('../src/components/graphics', () => ({
  renderMap: vi.fn(() => vi.fn()),
  renderTimeline: vi.fn(() => vi.fn()),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const ok = (value: unknown) => ({ ok: true, status: 200, json: async () => value }) as Response;

it('descarta respuesta tardía y aborta al cambiar la consulta o desmontar', async () => {
  const resolvers: ((v: string) => void)[] = [];
  const signals: AbortSignal[] = [];
  const loader = (signal: AbortSignal) => {
    signals.push(signal);
    return new Promise<string>((resolve) => resolvers.push(resolve));
  };
  const { result, rerender, unmount } = renderHook(({ id }) => useResource(id, loader), {
    initialProps: { id: 'old' },
  });
  rerender({ id: 'new' });
  expect(signals[0].aborted).toBe(true);
  await act(async () => resolvers[1]('actual'));
  expect(result.current.data).toBe('actual');
  await act(async () => resolvers[0]('anterior'));
  expect(result.current.data).toBe('actual');
  unmount();
  expect(signals[1].aborted).toBe(true);
});

it('recurso informa fallos no tipados sin filtrar detalles', async () => {
  const loader = () => Promise.reject('internal');
  const { result } = renderHook(() => useResource('a', loader));
  await waitFor(() => expect(result.current.error).toBe('No se pudo cargar la información.'));
});

it('cliente conserva filtros, errores 400/503 y retirada explícita de país', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(ok(dashboard))
    .mockResolvedValueOnce(ok(geography))
    .mockResolvedValueOnce(ok(geography.sources[0]))
    .mockResolvedValueOnce({ ok: false, status: 400 })
    .mockResolvedValueOnce({ ok: false, status: 503 });
  vi.stubGlobal('fetch', fetcher);
  const signal = new AbortController().signal;
  await getDashboard({ country: 'CL', from: undefined }, signal);
  expect(fetcher.mock.calls[0][0]).toBe('/api/v1/dashboards/humor?country=CL');
  await getGeography(signal);
  await assignCountry('source/id', null, signal);
  expect(fetcher.mock.calls[2]).toEqual([
    '/api/v1/dashboards/sources/source%2Fid/geography',
    expect.objectContaining({ body: '{"countryCode":null}', signal }),
  ]);
  await expect(getDashboard({}, signal)).rejects.toThrow('Revisa los filtros');
  await expect(getGeography(signal)).rejects.toThrow('Vuelve a intentarlo');
});

it('mapa informa fallo local y limpia carga y mapa al desmontar', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  const first = render(<WorldMap countries={dashboard.countries} onSelect={vi.fn()} />);
  expect(await screen.findByRole('status')).toHaveTextContent('Puedes consultar todos los valores');
  first.unmount();
  const dispose = vi.fn();
  vi.mocked(renderMap).mockReturnValue(dispose);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(ok({ type: 'FeatureCollection', features: [] })),
  );
  const second = render(<WorldMap countries={dashboard.countries} onSelect={vi.fn()} />);
  await waitFor(() => expect(renderMap).toHaveBeenCalled());
  second.unmount();
  expect(dispose).toHaveBeenCalled();
});

it('diálogo distingue captura, sin texto/evidencia y enlaces inseguros', async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  const raw = {
    ...news,
    title: null,
    description: null,
    link: 'javascript:alert(1)',
    countryCode: null,
    terms: [],
    score: null,
    matchedTerms: null,
    language: null,
    analyzedAt: null,
    dateSource: 'capture' as const,
  };
  render(<NewsDialog news={raw} onClose={close} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('Sin título');
  expect(dialog).toHaveTextContent('Fecha de captura');
  expect(dialog).toHaveTextContent('El análisis no encontró coincidencias.');
  expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
  expect(close).toHaveBeenCalled();
});

it('nube de peso cero conserva tamaño finito y permite ver/cerrar evidencia', async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  const word = { ...dashboard.words[0], influence: 0, contribution: 0 };
  const view = render(<WordCloud words={[word]} missing={0} onSelect={select} />);
  const button = screen.getByRole('button', { name: 'bueno es' });
  expect(button.style.fontSize).toBe('1rem');
  await user.click(button);
  expect(select).toHaveBeenCalledWith(word);
  view.rerender(<WordDetail word={word} news={dashboard.news} onSelect={select} />);
  await user.click(screen.getByRole('button', { name: 'Buenas noticias para Chile' }));
  expect(select).toHaveBeenCalledWith(news);
  await user.click(screen.getByRole('button', { name: 'Cerrar palabra' }));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});

it('procedencia muestra error recuperable, país retirado y fuente inactiva', async () => {
  const user = userEvent.setup();
  const saved = vi.fn();
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error('Fallo de red'))
    .mockResolvedValueOnce(ok(geography.sources[0]));
  vi.stubGlobal('fetch', fetcher);
  render(
    <SourceCountries
      sources={[{ ...geography.sources[0], active: false, countryCode: 'CL' }]}
      countries={geography.countries}
      onSaved={saved}
    />,
  );
  await user.click(screen.getByText('Procedencia de las fuentes'));
  expect(screen.getByText(/Inactiva/)).toBeVisible();
  await user.selectOptions(screen.getByLabelText(/https:/), '');
  await user.click(screen.getByRole('button', { name: 'Guardar país' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Fallo de red');
  await user.click(screen.getByRole('button', { name: 'Guardar país' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(fetcher.mock.calls[1][1].body).toBe('{"countryCode":null}');
});

it('presentación usa signo, ausencia, texto escapado y solo enlaces web', () => {
  expect(moodLabel(0)).toBe('Neutral');
  expect(moodLabel(-1)).toBe('Negativo');
  expect(moodLabel(1)).toBe('Positivo');
  expect(moodLabel(null)).toBe('Sin evidencia');
  expect(moodColor(0)).toBe('#d3b36a');
  expect(moodColor(-1)).toBe('#c56a4d');
  expect(moodColor(1)).toBe('#1f7662');
  expect(moodColor(null)).toBe('#dce2de');
  expect(valueLabel(null)).toBe('Sin evidencia');
  expect(plainText(null)).toBe('Sin título');
  expect(plainText('<script>x</script>')).toBe('x');
  expect(safeLink(null)).toBeUndefined();
  expect(safeLink('bad url')).toBeUndefined();
  expect(safeLink('data:text/html,x')).toBeUndefined();
  expect(safeLink('http://example.org')).toBe('http://example.org/');
});
