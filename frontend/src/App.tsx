import { useCallback, useState } from 'react';
import type { Continent, Filters, News, Word } from './types/dashboard';
import { getDashboard, getGeography } from './services/api';
import { useResource } from './services/use-resource';
import { CONTINENT_LABELS, moodColor, moodLabel, valueLabel } from './presentation';
import { WorldMap } from './components/WorldMap';
import { Evolution } from './components/Evolution';
import { NewsDialog, NewsRanking, WordCloud, WordDetail } from './components/Evidence';
import { SourceCountries } from './components/SourceCountries';
import { SourceAccess } from './components/SourceAccess';
import { Administration } from './components/Administration';

export function App() {
  const [accessKey, setAccessKey] = useState('');
  const [accessRevision, setAccessRevision] = useState(0);
  const [draft, setDraft] = useState<Filters>({});
  const [filters, setFilters] = useState<Filters>({});
  const [revision, setRevision] = useState(0);
  const [day, setDay] = useState('');
  const [selectedNews, setNews] = useState<News | null>(null);
  const [selectedWord, setWord] = useState<Word | null>(null);
  const load = useCallback((signal: AbortSignal) => getDashboard(filters, signal), [filters]);
  const result = useResource(`${JSON.stringify(filters)}:${revision}`, load);
  const loadGeography = useCallback((signal: AbortSignal) => getGeography(signal, accessKey), [accessKey]);
  const geography = useResource(`geography:${revision}:${accessRevision}`, loadGeography);
  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
    setNews(null);
    setWord(null);
  }, []);
  const selectCountry = useCallback((country: string) => {
    setFilters((current) => ({ ...current, country, continent: undefined }));
    setDraft((current) => ({ ...current, country, continent: undefined }));
    setDay('');
    setWord(null);
    setNews(null);
  }, []);
  const selectDay = useCallback((date: string) => setDay(date), []);
  const data = result.data;
  const countries = geography.data?.countries ?? data?.countries;
  const location = filters.country
    ? (countries?.find((country) => country.code === filters.country)?.name ??
      filters.country)
    : filters.continent
      ? CONTINENT_LABELS[filters.continent]
      : 'Todo el mundo';
  return (
    <>
      <a className="skip-link" href="#content">
        Saltar al contenido
      </a>
      <header className="topbar">
        <a href="/" className="brand" aria-label="HumWorld inicio">
          <span className="brand-mark">
            h<span>°</span>
          </span>
          <span>
            humworld<small>OBSERVATORIO DE NOTICIAS</small>
          </span>
        </a>
        <nav aria-label="Navegación">
          <a className="active" href="#content">
            Explorar el pulso
          </a>
          <a href="#method">Cómo se calcula ↗</a>
        </nav>
        <span className="team">
          EQUIPO 5 <span className="dot" />
        </span>
      </header>
      <main id="content">
        <div className="page-intro">
          <div>
            <p className="eyebrow">UNA MIRADA AL MUNDO, A TRAVÉS DE SUS NOTICIAS</p>
            <h1>
              El pulso de las noticias<span>.</span>
            </h1>
            <p className="lead">Explora qué cuentan las noticias y qué palabras marcan su tono.</p>
          </div>
          <div className="edition">
            <span>HUMWORLD / EXPLORADOR</span>
            <strong>Geografía · tiempo · evidencia</strong>
          </div>
        </div>
        <form
          className="filters"
          aria-label="Filtros de consulta"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({ ...draft });
            setDay('');
            setWord(null);
            setNews(null);
          }}
        >
          <label>
            Continente
            <select
              value={draft.continent ?? ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  continent: (event.target.value || undefined) as Continent | undefined,
                  country: undefined,
                }))
              }
            >
              <option value="">Todo el mundo</option>
              {Object.entries(CONTINENT_LABELS).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            País
            <select
              value={draft.country ?? ''}
              onChange={(event) =>
                setDraft((current) => ({ ...current, country: event.target.value || undefined }))
              }
              disabled={!countries}
            >
              <option value="">Todos los países</option>
              {countries?.filter((country) => !draft.continent || country.continent === draft.continent)
                .map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              value={draft.from ?? ''}
              max={draft.to}
              onChange={(event) =>
                setDraft((current) => ({ ...current, from: event.target.value || undefined }))
              }
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={draft.to ?? ''}
              min={draft.from}
              onChange={(event) =>
                setDraft((current) => ({ ...current, to: event.target.value || undefined }))
              }
            />
          </label>
          <button className="primary" type="submit">
            Consultar <span>↗</span>
          </button>
          <button
            className="reset"
            type="button"
            onClick={() => {
              setDraft({});
              setFilters({});
              setDay('');
              setWord(null);
              setNews(null);
            }}
          >
            Limpiar
          </button>
        </form>
        {geography.error && (
          <div className="notice" role="alert">
            {geography.error}{' '}
            <button onClick={refresh}>Reintentar</button>
          </div>
        )}
        <div className="context-line">
          <span>
            <i className="dot" /> {location}{' '}
            <span className="muted">
              / {filters.from ?? 'Inicio disponible'} → {filters.to ?? 'Última noticia'}
            </span>
          </span>
          <button className="text-button" onClick={refresh}>
            ↻ Actualizar consulta
          </button>
        </div>
        {result.error ? (
          <div className="panel error" role="alert">
            <h2>No pudimos cargar este resultado</h2>
            <p>{result.error}</p>
            <button className="primary" onClick={refresh}>
              Reintentar consulta
            </button>
          </div>
        ) : !data ? (
          <div className="panel loading" role="status">
            Consultando las noticias…
          </div>
        ) : (
          <>
            <section className="stats" aria-label="Resumen del resultado">
              <div className="stat featured">
                <p>HUMOR MEDIO</p>
                <div>
                  <strong>{valueLabel(data.summary.average)}</strong>
                  <span className="mood-badge" style={{ color: moodColor(data.summary.average) }}>
                    {moodLabel(data.summary.average)}
                  </span>
                </div>
                <small>
                  Escala de −1 a +1 · {data.summary.withEvidence} noticias con evidencia
                </small>
              </div>
              <div className="stat">
                <p>NOTICIAS EN EL PERIODO</p>
                <strong>{data.summary.total}</strong>
                <small>{data.summary.analyzed} con análisis guardado</small>
              </div>
              <div className="stat">
                <p>SIN EVIDENCIA</p>
                <strong>{data.summary.withoutEvidence}</strong>
                <small>Analizadas, sin coincidencias</small>
              </div>
              <div className="stat">
                <p>POR ANALIZAR</p>
                <strong>{data.summary.unanalyzed}</strong>
                <small>Sin un resultado guardado</small>
              </div>
            </section>
            {data.summary.unknownCountry > 0 && (
              <p className="notice">
                {data.summary.unknownCountry} noticias no tienen país asignado. Pueden aportar al
                total global; asigna la procedencia de sus fuentes al pie de la página.
              </p>
            )}
            <section className="panel geography" aria-labelledby="map-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">UNA PERSPECTIVA GEOGRÁFICA</p>
                  <h2 id="map-title">El mundo en perspectiva</h2>
                </div>
                <span className="pill">
                  {data.countries.filter((country) => country.withEvidence > 0).length} países con
                  evidencia
                </span>
              </div>
              <p className="muted">
                País de la fuente RSS. Selecciona un país para explorar su resultado.
              </p>
              <WorldMap countries={data.countries} onSelect={selectCountry} />
              <div className="map-footer">
                <div className="legend">
                  {[
                    [-1, 'Negativo'],
                    [0, 'Neutral'],
                    [1, 'Positivo'],
                    [null, 'Sin evidencia'],
                  ].map(([value, label]) => (
                    <span key={String(label)}>
                      <i style={{ background: moodColor(value as number | null) }} />
                      {label}
                    </span>
                  ))}
                </div>
                <small>Natural Earth · escala mundial</small>
              </div>
              <details className="country-list">
                <summary>Consultar valores y cobertura por país</summary>
                <p className="muted">
                  La lista incluye países y territorios sin geometría a esta escala.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>País</th>
                        <th>Humor</th>
                        <th>Con evidencia</th>
                        <th>Noticias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.countries.map((country) => (
                        <tr key={country.code}>
                          <th>
                            <button
                              className="text-button"
                              onClick={() => selectCountry(country.code)}
                            >
                              {country.name}
                            </button>
                          </th>
                          <td>{valueLabel(country.average)}</td>
                          <td>{country.withEvidence}</td>
                          <td>{country.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
            <Evolution timeline={data.timeline} selected={day} onSelect={selectDay} />
            <div className="evidence-grid">
              <div>
                <WordCloud
                  words={data.words}
                  missing={data.summary.missingTermEvidence}
                  onSelect={setWord}
                />
                {selectedWord && (
                  <WordDetail word={selectedWord} news={data.news} onSelect={setNews} />
                )}
              </div>
              <NewsRanking news={data.news} day={day} onSelect={setNews} />
            </div>
          </>
        )}
        <SourceAccess active={Boolean(accessKey)} onApply={(key) => {
          setAccessKey(key); setAccessRevision((value) => value + 1);
        }} onClear={() => {
          setAccessKey(''); setAccessRevision((value) => value + 1);
        }} />
        {geography.data && (
          <SourceCountries
            key={accessRevision}
            credential={accessKey}
            sources={geography.data.sources}
            countries={geography.data.countries}
            onSaved={refresh}
          />
        )}
        {accessKey && <Administration key={`administration:${accessRevision}`} credential={accessKey}
          sources={geography.data?.sources ?? []} onChanged={refresh} />}
        <section id="method" className="method">
          <p className="eyebrow">LECTURA RESPONSABLE DEL RESULTADO</p>
          <h2>Un indicador con evidencia a la vista.</h2>
          <p>
            El humor medio promedia el último valor guardado de las noticias que tienen
            coincidencias en el diccionario. Una noticia sin coincidencias queda fuera del promedio;
            una noticia con coincidencias y valor cero es neutral. La procedencia corresponde a la
            fuente, no al lugar de los hechos.
          </p>
          <p>
            La nube utiliza los pesos guardados en cada análisis. Su magnitud suma aportes absolutos
            y el color representa el aporte neto. Las contribuciones de palabras pueden diferir
            mínimamente del valor por el redondeo del motor. Cambiar el diccionario no modifica los
            resultados guardados hasta reanalizar.
          </p>
        </section>
      </main>
      <footer>
        <span className="footer-brand">
          humworld<span>°</span>
        </span>
        <p>Proyecto académico · Equipo 5</p>
        <a href="#content">Volver arriba ↑</a>
      </footer>
      {selectedNews && (
        <NewsDialog key={selectedNews.id} news={selectedNews} onClose={() => setNews(null)} />
      )}
    </>
  );
}
