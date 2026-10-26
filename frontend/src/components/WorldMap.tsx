import { useEffect, useRef, useState } from 'react';
import type { CountryValue } from '../types/dashboard';
import { renderMap, type WorldGeometry } from './graphics';
import 'leaflet/dist/leaflet.css';

export function WorldMap({
  countries,
  onSelect,
}: {
  countries: CountryValue[];
  onSelect: (code: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
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
          dispose = renderMap(container.current, geometry, countries, onSelect);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      controller.abort();
      dispose?.();
    };
  }, [countries, onSelect]);
  return (
    <>
      <div
        ref={container}
        className="map"
        role="img"
        aria-label="Mapa de humor por país; valores disponibles en la lista geográfica"
      />
      {error && (
        <p role="status">
          No se pudo dibujar el mapa. Puedes consultar todos los valores en la lista de países.
        </p>
      )}
    </>
  );
}
