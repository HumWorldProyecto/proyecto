import { useEffect, useRef, useState } from 'react';
import type { Country, Source } from '../types/dashboard';
import { assignCountry } from '../services/api';

function SourceRow({
  source,
  countries,
  onSaved,
}: {
  source: Source;
  countries: Country[];
  onSaved: () => void;
}) {
  const [country, setCountry] = useState(source.countryCode ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  return (
    <form
      className="source-row"
      onSubmit={async (event) => {
        event.preventDefault();
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setPending(true);
        setMessage('');
        try {
          await assignCountry(source.id, country || null, controller.signal);
          if (!controller.signal.aborted) {
            setMessage('País guardado');
            onSaved();
          }
        } catch (error) {
          if (!controller.signal.aborted)
            setMessage(error instanceof Error ? error.message : 'No se pudo guardar el país.');
        } finally {
          if (!controller.signal.aborted) setPending(false);
        }
      }}
    >
      <label htmlFor={`source-${source.id}`}>
        <span>{source.url}</span>
        <small>
          {source.active ? 'Activa' : 'Inactiva'} · {source.countryCode ?? 'País sin asignar'}
        </small>
      </label>
      <select
        id={`source-${source.id}`}
        value={country}
        onChange={(event) => setCountry(event.target.value)}
      >
        <option value="">Sin país asignado</option>
        {countries.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>
      <button className="secondary" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar país'}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

export function SourceCountries({
  sources,
  countries,
  onSaved,
}: {
  sources: Source[];
  countries: Country[];
  onSaved: () => void;
}) {
  return (
    <details className="panel source-settings">
      <summary>
        Procedencia de las fuentes{' '}
        <span>{sources.filter((source) => source.countryCode === null).length} sin país</span>
      </summary>
      <p className="muted">
        El país representa la procedencia de la fuente RSS, no el lugar de cada acontecimiento. La
        asignación se aplica también a sus noticias anteriores. Retirar un país conserva el
        continente previo.
      </p>
      {sources.length ? (
        sources.map((source) => (
          <SourceRow
            key={`${source.id}:${source.countryCode}`}
            source={source}
            countries={countries}
            onSaved={onSaved}
          />
        ))
      ) : (
        <p>No hay fuentes RSS registradas.</p>
      )}
    </details>
  );
}
