import type { ChartConfiguration } from 'chart.js';
import type { CountryValue } from '../src/types/dashboard';
import { dashboard } from './fixtures';

const mocks = vi.hoisted(() => ({
  map: {
    attributionControl: { addAttribution: vi.fn() },
    fitBounds: vi.fn(),
    invalidateSize: vi.fn(),
    remove: vi.fn(),
  },
  addTo: vi.fn(),
  geo: vi.fn(),
  mapFactory: vi.fn(),
  chart: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock('leaflet', () => ({
  map: mocks.mapFactory.mockReturnValue(mocks.map),
  geoJSON: mocks.geo.mockReturnValue({ addTo: mocks.addTo }),
}));
vi.mock('chart.js/auto', () => ({
  default: class {
    constructor(...args: unknown[]) {
      mocks.chart(...args);
    }
    destroy() {
      mocks.destroy();
    }
  },
}));
import { renderMap, renderTimeline } from '../src/components/graphics';

it('Leaflet representa valores, crea etiquetas de texto y selecciona solo países del alcance', () => {
  const element = document.createElement('div');
  const select = vi.fn();
  const dispose = renderMap(
    element,
    { type: 'FeatureCollection', features: [] },
    dashboard.countries,
    select,
  );
  const options = mocks.geo.mock.calls[0][1];
  expect(options.style({ properties: { code: 'CL' } }).fillColor).toBe('#1f7662');
  expect(options.style(undefined).fillColor).toBe('#dce2de');
  const layer = { bindTooltip: vi.fn(), on: vi.fn() };
  options.onEachFeature({ properties: { code: 'CL', name: '<img>' } }, layer);
  expect(layer.bindTooltip.mock.calls[0][0].textContent).toContain('Chile: Positivo');
  layer.on.mock.calls[0][1]();
  expect(select).toHaveBeenCalledWith('CL');
  const unknown = { bindTooltip: vi.fn(), on: vi.fn() };
  options.onEachFeature({ properties: { code: 'XX', name: '<img>' } }, unknown);
  expect(unknown.bindTooltip.mock.calls[0][0].innerHTML).not.toContain('<img>');
  expect(unknown.on).not.toHaveBeenCalled();
  window.dispatchEvent(new Event('resize'));
  expect(mocks.map.invalidateSize).toHaveBeenCalled();
  dispose();
  expect(mocks.map.remove).toHaveBeenCalled();
});

it('Chart.js conserva huecos de evidencia, rango y selección de puntos con valor', () => {
  const select = vi.fn();
  const dispose = renderTimeline(
    document.createElement('canvas'),
    [dashboard.timeline[0], { ...dashboard.timeline[1], date: '2026-10-22' }],
    select,
  );
  const config = mocks.chart.mock.calls[0][1] as ChartConfiguration<'line'>;
  expect(config.data.labels).toEqual(['2026-10-19', '2026-10-20', '2026-10-22']);
  expect(config.data.datasets[0].data).toEqual([0.25, null, null]);
  const click = config.options!.onClick!;
  click.call({} as never, {} as never, [{ index: 0 } as never], {} as never);
  expect(select).toHaveBeenCalledWith('2026-10-19');
  click.call({} as never, {} as never, [{ index: 1 } as never], {} as never);
  click.call({} as never, {} as never, [], {} as never);
  expect(select).toHaveBeenCalledTimes(1);
  dispose();
  expect(mocks.destroy).toHaveBeenCalled();
});
