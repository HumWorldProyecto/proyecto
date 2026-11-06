import { useEffect, useRef, useState } from 'react';
import type { Country, Source } from '../types/dashboard';
import { adminRequest, assignCountry } from '../services/api';
import { useAdminAction } from './Administration';

function SourceRow({
  source,
  countries,
  onSaved,
  credential,
}: {
  source: Source;
  countries: Country[];
  onSaved: () => void;
  credential: string;
}) {
  const [country, setCountry] = useState(source.countryCode ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const action = useAdminAction(onSaved);
  const path = `/sources/${encodeURIComponent(source.id)}`;
  return (
    <article className="rss-card">
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
          await assignCountry(source.id, country || null, controller.signal, credential);
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
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar país'}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
    <details className="rss-actions">
      <summary>Gestionar fuente</summary>
      <form onSubmit={event => {
        event.preventDefault();
        const url = String(new FormData(event.currentTarget).get('url')).trim();
        void action.run(async signal => {
          await adminRequest(path, credential, signal, 'PUT', { url });
          return 'Dirección RSS guardada';
        });
      }}>
        <label>Dirección RSS<input key={source.url} name="url" type="url" defaultValue={source.url} required /></label>
        <button type="submit" className="secondary" disabled={action.busy}>Guardar dirección</button>
      </form>
      <div className="rss-action-buttons">
        <button type="button" className="secondary" disabled={action.busy} onClick={() => void action.run(async signal => {
          await adminRequest(path, credential, signal, 'PATCH', { active: !source.active });
          return source.active ? 'Fuente pausada' : 'Fuente activada';
        })}>{source.active ? 'Pausar fuente' : 'Activar fuente'}</button>
        <button type="button" className="secondary" disabled={action.busy || !source.active} onClick={() => void action.run(async signal => {
          const result = await adminRequest<{ itemsParsed: number }>(`${path}/capture`, credential, signal, 'POST');
          return `Captura completada. Se leyeron ${result.itemsParsed} ítems del RSS.`;
        })}>Capturar ahora</button>
      </div>
      {action.message && <p role="status" className="notice">{action.message}</p>}
    </details>
    </article>
  );
}

export function SourceCountries({
  sources,
  countries,
  onSaved,
  credential = '',
  initiallyOpen = false,
}: {
  sources: Source[];
  countries: Country[];
  onSaved: () => void;
  credential?: string;
  initiallyOpen?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('todas');
  const [limit, setLimit] = useState(10);
  const action = useAdminAction(onSaved);
  const matching = sources.filter(source => {
    const text = `${source.url} ${source.countryCode ?? ''}`.toLocaleLowerCase();
    return text.includes(query.trim().toLocaleLowerCase()) &&
      (status === 'todas' || source.active === (status === 'activas'));
  });
  return (
    <details className="panel source-settings admin-panel" open={initiallyOpen}>
      <summary>
        Procedencia de las fuentes{' '}
        <span>{sources.filter((source) => source.countryCode === null).length} sin país</span>
      </summary>
      <p className="muted">
        El país representa la procedencia de la fuente RSS, no el lugar de cada acontecimiento. La
        asignación se aplica también a sus noticias anteriores. Retirar un país conserva el
        continente previo.
      </p>
      <form aria-label="Registrar fuente RSS" onSubmit={event => {
        event.preventDefault();
        const form = event.currentTarget;
        const url = String(new FormData(form).get('url')).trim();
        void action.run(async signal => {
          await adminRequest('/sources', credential, signal, 'POST', { url });
          form.reset();
          setQuery(''); setStatus('todas'); setLimit(10);
          return 'Fuente RSS registrada';
        });
      }}>
        <label>Nueva dirección RSS<input name="url" type="url" placeholder="https://medio.example/rss" required /></label>
        <button className="primary" type="submit" disabled={action.busy}>Registrar fuente</button>
      </form>
      {action.message && <p role="status" className="notice">{action.message}</p>}
      {sources.length > 0 && <div className="catalog-toolbar">
        <label>Buscar fuente<input type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(10); }} /></label>
        <label>Estado<select value={status} onChange={event => { setStatus(event.target.value); setLimit(10); }}>
          <option value="todas">Todas</option><option value="activas">Activas</option><option value="pausadas">Pausadas</option>
        </select></label>
        <p className="muted">{matching.length} de {sources.length} fuentes</p>
      </div>}
      {sources.length ? (
        matching.slice(0, limit).map((source) => (
          <SourceRow
            credential={credential}
            key={`${source.id}:${source.countryCode}`}
            source={source}
            countries={countries}
            onSaved={onSaved}
          />
        ))
      ) : (
        <p>No hay fuentes RSS registradas.</p>
      )}
      {sources.length > 0 && matching.length === 0 && <p>No encontramos fuentes para esos filtros.</p>}
      {matching.length > limit && <button type="button" className="secondary" onClick={() => setLimit(value => value + 10)}>Mostrar más fuentes</button>}
    </details>
  );
}
