import { useEffect, useRef } from 'react';
import type { Timeline } from '../types/dashboard';
import { dateLabel, valueLabel } from '../presentation';
import { renderTimeline } from './graphics';

export function Evolution({
  timeline,
  selected,
  onSelect,
}: {
  timeline: Timeline[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current && timeline.length)
      return renderTimeline(canvas.current, timeline, onSelect);
  }, [timeline, onSelect]);
  return (
    <section className="panel evolution" aria-labelledby="evolution-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A LO LARGO DEL TIEMPO</p>
          <h2 id="evolution-title">Cómo cambia el pulso</h2>
        </div>
        <span className="pill">Días · UTC</span>
      </div>
      <p className="muted">Fecha de publicación o captura. Último análisis guardado.</p>
      {timeline.length ? (
        <>
          <div className="chart">
            <canvas
              ref={canvas}
              role="img"
              aria-label="Evolución del humor; selecciona también un día en la lista siguiente"
            />
          </div>
          <div className="day-list" aria-label="Consultar detalle por día">
            <button className={selected === '' ? 'selected' : ''} onClick={() => onSelect('')}>
              Todos los días
            </button>
            {timeline.map((day) => (
              <button
                key={day.date}
                aria-pressed={selected === day.date}
                className={selected === day.date ? 'selected' : ''}
                onClick={() => onSelect(day.date)}
              >
                {dateLabel(day.date)} <strong>{valueLabel(day.average)}</strong>
                <small>
                  {day.withEvidence} con evidencia / {day.total}
                </small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="empty">La evolución aparecerá cuando haya noticias en esta selección.</div>
      )}
    </section>
  );
}
