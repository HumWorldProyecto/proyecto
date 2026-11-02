import { useCallback, useEffect, useRef, useState } from 'react';
import type { Source } from '../types/dashboard';
import { adminRequest } from '../services/api';
import { useResource } from '../services/use-resource';

type Preview = { retentionDays: number | null; cutoff: string | null; totalCount: number; expiredCount: number };
type Channel = { id: string; name: string; sources: { id: string; url: string; active: boolean }[] };

function useAdminAction(refresh: () => void) {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const run = async (operation: (signal: AbortSignal) => Promise<string>) => {
    controller.current?.abort(); const current = new AbortController(); controller.current = current;
    setBusy(true); setMessage('');
    try { const success = await operation(current.signal); if (!current.signal.aborted) { setMessage(success); refresh(); } }
    catch (error) { if (!current.signal.aborted) setMessage(error instanceof Error ? error.message : 'No se pudo completar la operación'); }
    finally { if (!current.signal.aborted) setBusy(false); }
  };
  return { message, busy, run };
}

function RetentionPanel({ credential, onChanged }: { credential: string; onChanged: () => void }) {
  const [revision, setRevision] = useState(0); const [days, setDays] = useState('');
  const load = useCallback((signal: AbortSignal) => adminRequest<Preview>('/news/purge-preview', credential, signal), [credential]);
  const state = useResource(`retention:${revision}`, load);
  useEffect(() => { if (state.data) setDays(state.data.retentionDays?.toString() ?? ''); }, [state.data]);
  const refresh = () => { setRevision(value => value + 1); onChanged(); };
  const action = useAdminAction(refresh);
  return <section className="panel admin-panel" aria-label="Caducidad y purgado">
    <h2>Caducidad y purgado</h2>
    <p className="muted">La antigüedad se cuenta desde la captura. Sin periodo configurado no se elimina nada.
      La revisión automática se realiza cada hora.</p>
    <form aria-label="Configurar caducidad" onSubmit={event => {
      event.preventDefault();
      void action.run(async signal => {
        await adminRequest('/config/retention', credential, signal, 'PUT', { retentionDays: days === '' ? null : Number(days) });
        return days === '' ? 'Caducidad desactivada' : 'Periodo de caducidad guardado';
      });
    }}>
      <label>Días de permanencia<input type="number" min="1" max="36500" value={days} disabled={action.busy || !state.data}
        onChange={event => setDays(event.target.value)} placeholder="Sin configurar" /></label>
      <button type="submit" className="secondary" disabled={action.busy || !state.data}>Guardar caducidad</button>
      <small>Deja el campo vacío para desactivar.</small>
    </form>
    {state.error && <p role="alert">{state.error} <button onClick={() => setRevision(value => value + 1)}>Reintentar caducidad</button></p>}
    {state.data && <div className="purge-preview">
      <p>Noticias almacenadas: <strong>{state.data.totalCount}</strong> · Caducadas: <strong>{state.data.expiredCount}</strong></p>
      <p className="muted">{state.data.cutoff ? `Se conservan las capturadas desde ${new Date(state.data.cutoff).toLocaleString('es-CL')}, incluido ese instante.` : 'No hay una política de borrado activa.'}</p>
      <button className="secondary" onClick={() => setRevision(value => value + 1)}>Actualizar vista previa</button>{' '}
      <button className="danger" disabled={action.busy || state.data.retentionDays === null || state.data.expiredCount === 0}
        onClick={() => {
          const preview = state.data!;
          if (!window.confirm(`¿Purgar las ${preview.expiredCount} noticias caducadas? Esta operación elimina esas noticias y conserva sus fuentes.`)) return;
          void action.run(async signal => {
            const result = await adminRequest<{ deletedCount: number }>('/news/purge', credential, signal, 'POST', { expectedRetentionDays: preview.retentionDays });
            return `Se eliminaron ${result.deletedCount} noticias caducadas`;
          });
        }}>Purgar noticias caducadas</button>
    </div>}
    {action.message && <p role="status">{action.message}</p>}
  </section>;
}

function ChannelRow({ channel, sources, credential, refresh }: {
  channel: Channel; sources: Source[]; credential: string; refresh: () => void;
}) {
  const [name, setName] = useState(channel.name); const [sourceId, setSourceId] = useState('');
  const action = useAdminAction(refresh);
  return <article className="channel-row" aria-label={`Medio ${channel.name}`}>
    <form onSubmit={event => {
      event.preventDefault(); void action.run(async signal => {
        await adminRequest(`/channels/${channel.id}`, credential, signal, 'PUT', { name }); return 'Nombre del medio guardado';
      });
    }}>
      <label>Nombre de {channel.name}<input value={name} required maxLength={120} onChange={event => setName(event.target.value)} /></label>
      <button type="submit" className="secondary" disabled={action.busy}>Renombrar medio</button>
      <button type="button" className="danger" disabled={action.busy} onClick={() => {
        if (!window.confirm(`¿Eliminar el medio ${channel.name}? Se conservarán sus fuentes y noticias.`)) return;
        void action.run(async signal => { await adminRequest(`/channels/${channel.id}`, credential, signal, 'DELETE'); return 'Medio eliminado'; });
      }}>Eliminar medio</button>
    </form>
    <ul>{channel.sources.map(source => <li key={source.id}>{source.url}{' '}
      <button className="text-button" disabled={action.busy} onClick={() => void action.run(async signal => {
        await adminRequest(`/channels/${channel.id}/sources/${source.id}`, credential, signal, 'DELETE'); return 'Fuente desvinculada';
      })}>Desvincular fuente</button></li>)}</ul>
    {!channel.sources.length && <p className="muted">Sin fuentes asociadas.</p>}
    <form onSubmit={event => {
      event.preventDefault(); if (!sourceId) return;
      void action.run(async signal => {
        await adminRequest(`/channels/${channel.id}/sources/${encodeURIComponent(sourceId)}`, credential, signal, 'PUT');
        return 'Fuente asociada al medio';
      });
    }}>
      <label>Fuente para {channel.name}<select value={sourceId} onChange={event => setSourceId(event.target.value)} required>
        <option value="">Selecciona una fuente</option>
        {sources.map(source => <option key={source.id} value={source.id}>{source.url}</option>)}
      </select></label>
      <button type="submit" className="secondary" disabled={action.busy || !sourceId}>Asociar fuente</button>
    </form>
    {action.message && <p role="status">{action.message}</p>}
  </article>;
}

function ChannelsPanel({ credential, sources, onChanged }: { credential: string; sources: Source[]; onChanged: () => void }) {
  const [revision, setRevision] = useState(0); const [name, setName] = useState('');
  const load = useCallback((signal: AbortSignal) => adminRequest<Channel[]>('/channels', credential, signal), [credential]);
  const state = useResource(`channels:${revision}`, load);
  const refresh = () => { setRevision(value => value + 1); onChanged(); };
  const action = useAdminAction(refresh);
  return <section className="panel admin-panel" aria-label="Medios y fuentes RSS">
    <h2>Medios y fuentes RSS</h2>
    <p className="muted">Un medio agrupa varias fuentes. Eliminarlo conserva sus fuentes y noticias; asociar una fuente a otro medio la traslada.</p>
    <form aria-label="Crear medio" onSubmit={event => {
      event.preventDefault(); void action.run(async signal => {
        await adminRequest('/channels', credential, signal, 'POST', { name }); setName(''); return 'Medio creado';
      });
    }}>
      <label>Nombre del nuevo medio<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
      <button type="submit" className="secondary" disabled={action.busy}>Crear medio</button>
    </form>
    {state.error && <p role="alert">{state.error} <button onClick={() => setRevision(value => value + 1)}>Reintentar medios</button></p>}
    {state.data?.map(channel => <ChannelRow key={channel.id} channel={channel} sources={sources} credential={credential} refresh={refresh} />)}
    {state.data?.length === 0 && <p>No hay medios registrados.</p>}
    {action.message && <p role="status">{action.message}</p>}
  </section>;
}

export function Administration(props: { credential: string; sources: Source[]; onChanged: () => void }) {
  return <><ChannelsPanel {...props} /><RetentionPanel {...props} /></>;
}
