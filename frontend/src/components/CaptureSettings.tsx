import { useCallback, useEffect, useState } from 'react';
import { adminRequest } from '../services/api';
import { useResource } from '../services/use-resource';
import { useAdminAction } from './Administration';

export function CaptureSettings({ credential }: { credential: string }) {
  const [revision, setRevision] = useState(0); const [minutes, setMinutes] = useState('');
  const load = useCallback((signal: AbortSignal) => adminRequest<{ capturePeriodicityMinutes: number | null }>('/config', credential, signal), [credential]);
  const state = useResource(`capture-settings:${revision}`, load);
  useEffect(() => { if (state.data) setMinutes(state.data.capturePeriodicityMinutes?.toString() ?? ''); }, [state.data]);
  const action = useAdminAction(() => setRevision(value => value + 1));
  return <section className="panel admin-panel" aria-label="Captura automática">
    <h2>Captura automática</h2><p className="muted">Consulta las fuentes activas con esta frecuencia. Si está sin configurar, la captura automática queda desactivada.</p>
    <form onSubmit={event => { event.preventDefault(); void action.run(async signal => {
      await adminRequest('/config', credential, signal, 'PUT', { capturePeriodicityMinutes: minutes === '' ? null : Number(minutes) }); return 'Periodicidad guardada';
    }); }}>
      <label>Intervalo de captura<select value={minutes} onChange={event => setMinutes(event.target.value)} disabled={!state.data || action.busy}>
        <option value="" disabled>Sin configurar</option>{[15, 30, 60, 360, 720, 1440].map(value => <option key={value} value={value}>{value < 60 ? `${value} minutos` : `${value / 60} horas`}</option>)}
      </select></label><button className="secondary" disabled={!state.data || action.busy || minutes === ''}>Guardar periodicidad</button>
    </form>
    {action.message && <p role="status">{action.message}</p>}
    {state.error && <p role="alert">{state.error} <button onClick={() => setRevision(value => value + 1)}>Reintentar periodicidad</button></p>}
  </section>;
}
