import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Continent, CountryValue } from '../types/dashboard';
import { renderMap, type WorldGeometry } from './graphics';
import { CONTINENT_LABELS, valueLabel } from '../presentation';
import 'leaflet/dist/leaflet.css';

export function WorldMap({
  countries,
  onSelect,
  onSelectContinent,
}: {
  countries: CountryValue[];
  onSelect: (code: string) => void;
  onSelectContinent?: (continent: Continent) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [grouping, setGrouping] = useState('country');
  const continents = useMemo(() => Object.entries(CONTINENT_LABELS).map(([code, name]) => {
    const members = countries.filter(country => country.continent === code);
    const count = members.reduce((sum, country) => sum + country.withEvidence, 0);
    return { code: code as Continent, name,
      average: count ? members.reduce((sum, country) => sum + (country.average ?? 0) * country.withEvidence, 0) / count : null,
      withEvidence: count, total: members.reduce((sum, country) => sum + country.total, 0) };
  }), [countries]);
  const displayed = useMemo(() => grouping === 'country' ? countries : countries.map(country => {
    const region = continents.find(item => item.code === country.continent)!;
    return { ...country, average: region.average, name: `${region.name} (continente)` };
  }), [countries, continents, grouping]);
  const select = useCallback((code: string) => {
    const continent = countries.find(country => country.code === code)?.continent;
    if (grouping === 'continent' && continent && onSelectContinent) onSelectContinent(continent);
    else onSelect(code);
  }, [countries, grouping, onSelect, onSelectContinent]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let dispose: (() => void) | undefined;
    setError(false);
    fetch('/world.geo.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((geometry: WorldGeometry) => {
        if (active && container.current)
          dispose = renderMap(container.current, geometry, displayed, select);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      controller.abort();
      dispose?.();
    };
  }, [displayed, select]);
  return (
    <>
      <label>Agrupar mapa por<select value={grouping} onChange={event => setGrouping(event.target.value)}>
        <option value="country">País</option><option value="continent">Continente</option>
      </select></label>
      <div
        ref={container}
        className="map"
        role="img"
        aria-label={`Mapa de humor por ${grouping === 'country' ? 'país' : 'continente'}; valores disponibles en la lista geográfica`}
      />
      {grouping === 'continent' && <div className="continent-list" aria-label="Humor por continente">
        {continents.map(continent => <button className="secondary" key={continent.code} onClick={() => onSelectContinent?.(continent.code)}>
          {continent.name} · {valueLabel(continent.average)}<small>{continent.withEvidence} con evidencia / {continent.total} noticias</small>
        </button>)}
      </div>}
      {error && (
        <p role="status">
          No se pudo dibujar el mapa. Puedes consultar todos los valores en la lista de países.
        </p>
      )}
    </>
  );
}
