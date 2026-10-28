export function SourceAccess({ active, onApply, onClear }: {
  active: boolean; onApply: (key: string) => void; onClear: () => void;
}) {
  return <section className="panel source-access" aria-label="Acceso a fuentes RSS">
    <h2>Acceso a fuentes RSS</h2>
    <p className="muted">Usa una clave de consulta para ver las fuentes o de gestión para modificarlas.
      La clave se mantiene solo en esta página y se elimina al recargar.</p>
    <form onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const key = new FormData(form).get('accessKey');
      if (typeof key === 'string' && key.trim()) { onApply(key); form.reset(); }
    }}>
      <label>Clave de acceso<input type="password" name="accessKey" autoComplete="off" required /></label>
      <button className="primary" type="submit">Aplicar clave</button>
      {active && <button type="button" className="secondary" onClick={onClear}>Retirar clave</button>}
    </form>
  </section>;
}
