import { useCallback, useState } from 'react';
import { adminRequest } from '../services/api';
import { useResource } from '../services/use-resource';
import { useAdminAction } from './Administration';
import { CONTINENT_LABELS } from '../presentation';
import type { Continent } from '../types/dashboard';

type Detail = { capturedAt: string; continent: Continent | null; mediaTopics: { qcode: string; label: string }[]; sourceMediaTopicQcode: string | null };
export function NewsActions({ id, language, credential, canManage, onChanged }: {
  id: string; language: 'es' | 'en' | null; credential: string; canManage: boolean; onChanged: () => void;
}) {
  const [selected, setSelected] = useState(language ?? 'es');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const load = useCallback((signal: AbortSignal) => adminRequest<Detail>(`/news/${id}`, credential, signal), [id, credential]);
  const state = useResource(`news-detail:${id}`, load);
  const action = useAdminAction(() => {});
  return <section className="news-actions" aria-label="Acciones de la noticia">
    {state.data && <p className="muted">Capturada: {new Date(state.data.capturedAt).toLocaleString('es-CL')} · Continente: {state.data.continent ? CONTINENT_LABELS[state.data.continent] : 'sin asignar'}<br />Categorías IPTC de la noticia: {state.data.mediaTopics.map(topic => topic.label).join(', ') || 'sin coincidencias de clasificación'}</p>}
    {state.error && <p role="alert">{state.error}</p>}
    <form onSubmit={event => { event.preventDefault(); void action.run(async signal => {
      await adminRequest(`/news/${id}/sentiment`, credential, signal, 'POST', { language: selected });
      onChanged(); return 'Análisis guardado';
    }); }}>
      <label>Idioma del análisis<select value={selected} onChange={event => setSelected(event.target.value as 'es' | 'en')}><option value="es">Español</option><option value="en">Inglés</option></select></label>
      <button className="secondary" disabled={action.busy}>Analizar y guardar</button>
    </form>
    {canManage && (!confirmDelete ? <button type="button" className="danger" onClick={() => setConfirmDelete(true)}>Eliminar noticia</button> : <div className="notice">
      <p>Se eliminará esta noticia de los resultados. Su fuente se conserva y una captura posterior podría volver a importarla.</p>
      <button type="button" className="danger" disabled={action.busy} onClick={() => void action.run(async signal => {
        await adminRequest(`/news/${id}`, credential, signal, 'DELETE'); onChanged(); return 'Noticia eliminada';
      })}>Confirmar eliminación</button>{' '}<button className="secondary" type="button" onClick={() => setConfirmDelete(false)}>Cancelar</button>
    </div>)}
    {action.message && <p role="status">{action.message}</p>}
  </section>;
}
