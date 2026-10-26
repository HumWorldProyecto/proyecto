import { useEffect, useRef, useState } from 'react';
import type { News, Word } from '../types/dashboard';
import { dateLabel, moodColor, moodLabel, plainText, safeLink, valueLabel } from '../presentation';

export function WordCloud({
  words,
  missing,
  onSelect,
}: {
  words: Word[];
  missing: number;
  onSelect: (word: Word) => void;
}) {
  const max = Math.max(...words.map((word) => word.influence), 0);
  return (
    <section className="panel words" aria-labelledby="words-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">HUELLAS DEL LENGUAJE</p>
          <h2 id="words-title">Palabras que pesan</h2>
        </div>
        <span className="pill">{words.length} palabras</span>
      </div>
      <p className="muted">
        El tamaño refleja la magnitud del aporte. Selecciona una palabra para ver su evidencia.
      </p>
      {missing > 0 && (
        <p className="notice">
          {missing} análisis con valor no tienen palabras guardadas. La nube tiene cobertura
          parcial.
        </p>
      )}
      {words.length ? (
        <div className="word-cloud">
          {words.map((word) => (
            <button
              key={`${word.language}:${word.term}`}
              style={{
                fontSize: `${1 + (max ? word.influence / max : 0) * 2}rem`,
                color: moodColor(word.contribution),
              }}
              title={`${word.term} (${word.language}) · aporte ${valueLabel(word.contribution)} · ${word.occurrences} coincidencias`}
              onClick={() => onSelect(word)}
            >
              {word.term} <small>{word.language}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          No hay palabras guardadas para esta selección. Analiza las noticias con el diccionario
          para generar evidencia.
        </div>
      )}
    </section>
  );
}

export function NewsRanking({
  news,
  day,
  onSelect,
}: {
  news: News[];
  day: string;
  onSelect: (news: News) => void;
}) {
  const visible = day ? news.filter((item) => item.date.slice(0, 10) === day) : news;
  return (
    <section className="panel ranking" aria-labelledby="ranking-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DETRÁS DEL RESULTADO</p>
          <h2 id="ranking-title">Noticias influyentes</h2>
        </div>
        <span className="pill">{visible.length} noticias</span>
      </div>
      <p className="muted">
        Orden por magnitud del aporte al promedio del periodo: valor ÷ noticias con evidencia.{' '}
        {day && `Detalle del ${dateLabel(day)}.`}
      </p>
      {visible.length ? (
        <ol className="news-list">
          {visible.map((item, index) => (
            <li key={item.id}>
              <span className="rank">{String(index + 1).padStart(2, '0')}</span>
              <div className="news-copy">
                <p className="news-meta">
                  {item.countryCode ?? 'País sin asignar'} <span>·</span> {dateLabel(item.date)}
                </p>
                <button className="news-title" onClick={() => onSelect(item)}>
                  {plainText(item.title)}
                </button>
                <p className="news-meta">
                  {moodLabel(item.score === null || item.matchedTerms === 0 ? null : item.score)} ·{' '}
                  {item.matchedTerms ?? 0} coincidencias
                </p>
              </div>
              <div className="news-value">
                <strong style={{ color: moodColor(item.contribution) }}>
                  {valueLabel(item.contribution)}
                </strong>
                <small>
                  {item.score === null
                    ? 'Sin analizar'
                    : item.matchedTerms === 0
                      ? 'Sin evidencia'
                      : 'aporte al promedio'}
                </small>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty">No hay noticias para mostrar en esta selección.</div>
      )}
    </section>
  );
}

export function NewsDialog({ news, onClose }: { news: News; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const link = safeLink(news.link);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="detail-title"
      className="detail-dialog"
    >
      <div className="section-heading">
        <p className="eyebrow">DETALLE DE LA NOTICIA</p>
        <button autoFocus className="close" onClick={onClose} aria-label="Cerrar detalle">
          ×
        </button>
      </div>
      <h2 id="detail-title">{plainText(news.title)}</h2>
      <p className="muted">
        {news.countryCode ?? 'País sin asignar'} · {dateLabel(news.date)} · Fecha de{' '}
        {news.dateSource === 'publication' ? 'publicación' : 'captura'}
      </p>
      {news.description && <p className="description">{plainText(news.description)}</p>}
      <dl className="detail-stats">
        <div>
          <dt>Valor guardado</dt>
          <dd>{valueLabel(news.score)}</dd>
        </div>
        <div>
          <dt>Aporte al periodo</dt>
          <dd>{valueLabel(news.contribution)}</dd>
        </div>
        <div>
          <dt>Coincidencias</dt>
          <dd>{news.matchedTerms ?? 'Sin analizar'}</dd>
        </div>
      </dl>
      <p className="muted">
        Último análisis: {news.analyzedAt ? dateLabel(news.analyzedAt) : 'pendiente'} · Idioma:{' '}
        {news.language ?? 'sin analizar'}
      </p>
      <h3>Evidencia guardada</h3>
      {news.terms === null ? (
        <p>Las palabras de este análisis no están disponibles.</p>
      ) : news.terms.length === 0 ? (
        <p>El análisis no encontró coincidencias.</p>
      ) : (
        <ul className="term-list">
          {news.terms.map((term, i) => (
            <li key={i}>
              <strong>{term.term}</strong>
              <span>
                {term.language} · peso {term.weight} · {term.occurrences} coincidencias
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="source-url">Fuente RSS: {news.sourceUrl}</p>
      {link && (
        <a className="primary link-button" href={link} target="_blank" rel="noopener noreferrer">
          Abrir noticia original ↗
        </a>
      )}
    </dialog>
  );
}

export function WordDetail({
  word,
  news,
  onSelect,
}: {
  word: Word;
  news: News[];
  onSelect: (item: News) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  useEffect(() => setExpanded(true), [word]);
  if (!expanded) return null;
  return (
    <aside className="word-detail" aria-label={`Detalle de ${word.term}`}>
      <button className="close" aria-label="Cerrar palabra" onClick={() => setExpanded(false)}>
        ×
      </button>
      <h3>
        {word.term} <small>({word.language})</small>
      </h3>
      <p>
        Aporte neto {valueLabel(word.contribution)} · magnitud {valueLabel(word.influence)} ·{' '}
        {word.occurrences} coincidencias en {word.newsCount} noticias.
      </p>
      <ul>
        {news
          .filter((item) =>
            item.terms?.some((term) => term.term === word.term && term.language === word.language),
          )
          .map((item) => (
            <li key={item.id}>
              <button className="text-button" onClick={() => onSelect(item)}>
                {plainText(item.title)}
              </button>
            </li>
          ))}
      </ul>
    </aside>
  );
}
