import { useCallback, useState } from 'react';
import { adminRequest } from '../services/api';
import { useResource } from '../services/use-resource';
import { useAdminAction } from './Administration';

type Entry = { id: string; term: string; language: 'es' | 'en'; weight: number };
function EntryRow({ entry, credential, refresh }: { entry: Entry; credential: string; refresh: () => void }) {
  const action = useAdminAction(refresh);
  return <li className="dictionary-entry">
    <form key={`${entry.term}:${entry.language}:${entry.weight}`} aria-label={`Editar ${entry.term}`} onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      void action.run(async signal => {
        await adminRequest(`/dictionary/${entry.id}`, credential, signal, 'PATCH', {
          term: String(data.get('term')).trim(), language: data.get('language'), weight: Number(data.get('weight')),
        }); return 'Entrada guardada. Los análisis anteriores conservan sus valores.';
      });
    }}>
      <label>Término<input name="term" defaultValue={entry.term} required /></label>
      <label>Idioma<select name="language" defaultValue={entry.language}><option value="es">Español</option><option value="en">Inglés</option></select></label>
      <label>Peso<input name="weight" type="number" min="-5" max="5" step="1" defaultValue={entry.weight} required /></label>
      <button className="secondary" disabled={action.busy}>Guardar entrada</button>
      <button type="button" className="danger" disabled={action.busy} onClick={() => {
        if (!window.confirm(`¿Eliminar la entrada «${entry.term}»? Los análisis guardados se conservan.`)) return;
        void action.run(async signal => { await adminRequest(`/dictionary/${entry.id}`, credential, signal, 'DELETE'); return 'Entrada eliminada'; });
      }}>Eliminar entrada</button>
    </form>
    {action.message && <p role="status">{action.message}</p>}
  </li>;
}
export function DictionaryPanel({ credential }: { credential: string }) {
  const [revision, setRevision] = useState(0); const [query, setQuery] = useState('');
  const [language, setLanguage] = useState(''); const [limit, setLimit] = useState(10);
  const load = useCallback((signal: AbortSignal) => adminRequest<Entry[]>('/dictionary', credential, signal), [credential, revision]);
  const state = useResource('dictionary', load, true, true);
  const refresh = () => setRevision(value => value + 1);
  const action = useAdminAction(refresh);
  const entries = state.data?.filter(item => (!language || item.language === language) && item.term.includes(query.trim().toLocaleLowerCase())) ?? [];
  return <section className="panel admin-panel" aria-label="Diccionario de sentimiento">
    <h2>Diccionario de sentimiento</h2>
    <p className="muted">Cada término tiene un peso de −5 a +5. Los cambios se aplican a los análisis nuevos; puedes reanalizar una noticia desde su detalle.</p>
    <form aria-label="Crear entrada del diccionario" onSubmit={event => {
      event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
      void action.run(async signal => {
        await adminRequest('/dictionary', credential, signal, 'POST', {
          term: String(data.get('term')).trim(), language: data.get('language'), weight: Number(data.get('weight')),
        }); form.reset(); setQuery(''); setLanguage(''); return 'Entrada creada';
      });
    }}>
      <label>Nuevo término<input name="term" required /></label>
      <label>Idioma del término<select name="language"><option value="es">Español</option><option value="en">Inglés</option></select></label>
      <label>Peso del término<input name="weight" type="number" min="-5" max="5" step="1" defaultValue="1" required /></label>
      <button className="primary" disabled={action.busy}>Crear entrada</button>
    </form>
    {action.message && <p role="status" className="notice">{action.message}</p>}
    <div className="catalog-toolbar">
      <label>Buscar término<input type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(10); }} /></label>
      <label>Filtrar idioma<select value={language} onChange={event => { setLanguage(event.target.value); setLimit(10); }}><option value="">Todos</option><option value="es">Español</option><option value="en">Inglés</option></select></label>
      <p className="muted">{entries.length} entradas</p>
    </div>
    {state.error && <p role="alert">{state.error} <button onClick={refresh}>Reintentar diccionario</button></p>}
    {!state.data && !state.error && <p role="status">Cargando diccionario…</p>}
    {state.data && !entries.length && <p>No hay entradas para esta búsqueda.</p>}
    <ul className="dictionary-list">{entries.slice(0, limit).map(entry => <EntryRow key={entry.id} entry={entry} credential={credential} refresh={refresh} />)}</ul>
    {entries.length > limit && <button className="secondary" onClick={() => setLimit(value => value + 10)}>Mostrar más entradas</button>}
  </section>;
}
