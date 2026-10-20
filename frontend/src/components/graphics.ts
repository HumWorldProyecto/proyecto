import * as L from 'leaflet';
import Chart from 'chart.js/auto';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import type { CountryValue, Timeline } from '../types/dashboard';
import { moodColor, moodLabel, valueLabel } from '../presentation';

export type WorldGeometry = FeatureCollection<Geometry, GeoJsonProperties>;
export function renderMap(
  element: HTMLElement,
  geometry: WorldGeometry,
  countries: CountryValue[],
  select: (code: string) => void,
): () => void {
  const map = L.map(element, {
    center: [20, 0],
    zoom: 1,
    minZoom: 0,
    maxZoom: 5,
    zoomSnap: 0.25,
    scrollWheelZoom: false,
    attributionControl: true,
    worldCopyJump: true,
  });
  const fitWorld = () =>
    map.fitBounds(
      [
        [-58, -180],
        [83, 180],
      ],
      { padding: [8, 8], maxZoom: 2 },
    );
  fitWorld();
  const values = new Map(countries.map((country) => [country.code, country]));
  L.geoJSON(geometry, {
    style: (feature) => ({
      color: '#fafbf8',
      weight: 0.8,
      fillColor: moodColor(values.get(feature?.properties?.code)?.average ?? null),
      fillOpacity: 0.92,
    }),
    onEachFeature: (feature, layer) => {
      const country = values.get(feature.properties?.code);
      const label = document.createElement('span');
      label.textContent = `${country?.name ?? feature.properties?.name}: ${moodLabel(country?.average ?? null)} · ${valueLabel(country?.average ?? null)}`;
      layer.bindTooltip(label, { sticky: true });
      if (country) layer.on('click', () => select(country.code));
    },
  }).addTo(map);
  map.attributionControl.addAttribution('Natural Earth · dominio público');
  const resize = () => {
    map.invalidateSize();
    fitWorld();
  };
  window.addEventListener('resize', resize);
  return () => {
    window.removeEventListener('resize', resize);
    map.remove();
  };
}

export function renderTimeline(
  canvas: HTMLCanvasElement,
  timeline: Timeline[],
  select: (date: string) => void,
): () => void {
  const points: { date: string; value: number | null }[] = [];
  for (const day of timeline) {
    const last = points.at(-1);
    if (last && Date.parse(day.date) - Date.parse(last.date) > 86400000)
      points.push({
        date: new Date(Date.parse(last.date) + 86400000).toISOString().slice(0, 10),
        value: null,
      });
    points.push({ date: day.date, value: day.average });
  }
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: points.map((day) => day.date),
      datasets: [
        {
          label: 'Humor medio',
          data: points.map((day) => day.value),
          borderColor: '#1f7662',
          backgroundColor: '#1f76621a',
          pointBackgroundColor: points.map((day) => moodColor(day.value)),
          pointRadius: 4,
          tension: 0.2,
          fill: false,
          spanGaps: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: { y: { min: -1, max: 1 }, x: { grid: { display: false } } },
      plugins: { legend: { display: false } },
      onClick: (_event, elements) => {
        const point = elements[0];
        if (point && points[point.index].value !== null) select(points[point.index].date);
      },
    },
  });
  return () => chart.destroy();
}
