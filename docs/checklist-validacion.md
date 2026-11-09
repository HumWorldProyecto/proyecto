# Comprobación del checklist — 9 de noviembre de 2026

Los 28 casos tienen evidencia técnica local, combinando pruebas automatizadas, PostgreSQL 16 real y recorrido del navegador. Esta comprobación no sustituye la aceptación del profesor. Los casos 1 y 5 corresponden exclusivamente al modo de evaluación local autorizado; los casos 7 y 22 se verificaron con temporización controlada/job automático, sin afirmar que se esperó un intervalo real completo.

La aplicación normal conserva P12 y la desactivación de fuentes que preserva noticias. Solo con **ambas** variables `HUMWORLD_VALIDATION_MODE=1` y `HUMWORLD_EVALUATION_MODE=1` se habilitan gestión sin clave y eliminación física de fuente con sus noticias. `compose.validacion.yml` expone los servicios únicamente en `127.0.0.1`. Cambiar esta configuración es una decisión explícita del administrador.

## Resultados

- Backend: 82 suites, 867 pruebas; cobertura de líneas 98,95%, ramas 95,26%, funciones 99,35% y sentencias 98,98%.
- Frontend: 6 suites, 38 pruebas; todos los indicadores de cobertura superan 80%.
- OpenSpec: 19 elementos válidos con `validate --all --strict`.
- Carga limpia: 50 medios, 53 fuentes, seis continentes, metadatos completos.
- Navegador real: medio y fuente BBC Health registrados; 56 noticias capturadas y analizadas, siete con evidencia, cuatro términos y media +0,1142857143. Detalle de una noticia: −0,80, una coincidencia (`death`, peso −4, inglés).
- Se conservaron las 4.957 noticias previas. Tras agregar las 56 nuevas y reiniciar los tres servicios, las 5.013 noticias y todos los hashes de datos/configuración permanecieron idénticos.
- La base real queda sin caducidad. El intervalo de 15 minutos se guardó desde la interfaz y se conservó al reiniciar. Los borrados de ensayo y cambios de caducidad se ejecutaron en base aislada.

## Trazabilidad de los 28 casos

| ID Excel | Evidencia y alcance |
| --- | --- |
| 1 | SI en evaluación local explícita: navegador accede a catálogo y administración sin clave. En configuración normal P12 conserva 401/403. |
| 2 | Carga limpia en PostgreSQL 16: 50 medios, 53 fuentes, seis continentes y cero fuentes sin país, idioma o categoría editorial IPTC. |
| 3 | Navegador: medio Validación checklist 09-11 y RSS BBC Health creados con GB, Europa derivada, inglés y categoría Salud. GET confirma los valores. |
| 4 | Listado/detalle/active comprobados por E2E; búsqueda y estado desde catálogo web. Metadatos de fuente disponibles en la respuesta. |
| 5 | SI en evaluación local: E2E borra fuente y sus noticias de forma transaccional, conserva otra fuente/noticia y responde 404 al repetir. Normal: desactivación conserva noticias. |
| 6 | Navegador: Capturar ahora leyó y guardó 56 ítems del RSS BBC Health. Además, E2E recorre captura de un RSS controlado hasta persistencia. |
| 7 | Programador automático verificado con reloj simulado y job real cubierto por pruebas; no se afirma haber esperado un intervalo real completo en esta sesión. |
| 8 | Navegador cambia 60 a 15 minutos; GET config y reinicio conservan 15. Pruebas del programador comprueban el cambio de cadencia con reloj simulado. |
| 9 | Detalle real muestra contenido, fuente, fecha de captura, continente, categoría Salud y análisis persistido. Nuevas fuentes con idioma se procesan en validación. |
| 10 | Pruebas del motor y persistencia en ES/EN; navegador guardó análisis en inglés de noticia capturada. |
| 11 | Motor independiente probado con lotes de referencia; texto excelente avance y RSS controlado producen score 0,7 y 2 coincidencias. |
| 12 | POST /api/v1/sentiment y /sentiment/analyze devuelven el mismo score 0,7 en E2E con PostgreSQL 16. |
| 13 | Diccionario con CRUD web y REST. Navegador creó validacionhumworld y cambió su peso; pruebas comprueban borrado confirmado y errores. |
| 14 | Pruebas de diccionario y sentimiento verifican cambios en análisis nuevos y conservación de análisis guardados hasta reanalizar. |
| 15 | GET news lista/detalle y filtros de fecha, país, continente, fuente y categoría probados con inclusiones y exclusiones; filtros compartidos por dashboard. |
| 16 | DELETE /api/v1/news con body UUID y DELETE /news/:id: 204, consulta posterior 404, conserva fuente. UI exige confirmación; pruebas en base aislada. |
| 17 | Mapa con agrupación País/Continente; promedio del continente ponderado por número de noticias con evidencia. Pruebas de agregación y recorrido web. |
| 18 | Seleccionar un día consulta nuevamente resumen, mapa, nube y ranking con from=to; prueba de interfaz comprueba la solicitud y el cambio de resultado. |
| 19 | Ranking por abs(score/N), con filtros compartidos y cobertura de ausencia de evidencia; comparado con referencias automatizadas. |
| 20 | Nube basada en términos guardados, magnitud absoluta y aporte neto. RSS real: cuatro términos; pruebas verifican ponderación y detalle. |
| 21 | UI de caducidad probada; E2E configura 31 días y GET /api/v1/config coincide. La base real queda sin caducidad para conservar la colección. |
| 22 | Job de purga automática probado en PostgreSQL 16 con fechas controladas; conserva el límite y noticias vigentes. No se afirma esperar una hora real. |
| 23 | Purgado manual y confirmación web probados; elimina solo noticias anteriores al límite, con recuento de resultado. Base real protegida de estos ensayos. |
| 24 | Cliente HTTP independiente en E2E verifica POST 201, GET/PUT/PATCH 200, DELETE 204 sin cuerpo y metadatos persistidos. |
| 25 | GET /api/v1/sentiment global/continente/país coincide con /dashboards/humor; detalle mediante GET /news/:id. RSS real: 56 noticias y media 0,1142857143. |
| 26 | E2E obtiene 404 para UUID inexistente y 400 para validación inválida; respuestas publicadas en Swagger, sin escrituras indebidas. |
| 27 | Reinicio real de los tres servicios sin retirar volumen: 5.013 noticias y hashes idénticos de noticias, fuentes, medios, diccionario, periodicidad y caducidad. |
| 28 | E2E: alta RSS controlado → captura → clasificación → análisis 0,7 → consulta/nube. Navegador: medio/fuente real → 56 noticias → análisis guardado → dashboard; API coincide. |

## Reproducir

1. Arrancar Docker Desktop y ejecutar `./scripts/Iniciar-validacion.ps1` desde este repositorio.
2. Abrir <http://127.0.0.1:54176/>. La página de gestión identifica explícitamente la evaluación local.
3. En **Medios y fuentes → Medios**, crear el medio; en **Fuentes RSS**, registrar URL, medio, país, idioma y categoría. El continente se deriva del país. Capturar la fuente activa.
4. En **Explorar**, seleccionar la fuente y consultar. Abrir una noticia, comprobar metadatos y guardar un análisis con su idioma. Usar los mismos filtros para nube, mapa y ranking. Los filtros de categoría corresponden a las categorías detectadas de la noticia; la categoría editorial de la fuente se muestra por separado.
5. En **Administración**, comprobar por separado captura automática, diccionario y caducidad. Los cambios del diccionario se aplican a nuevos análisis; reanalizar es una acción explícita.
6. Consultar Swagger en <http://127.0.0.1:53016/api/docs> para los alias y operaciones originales. DELETE de noticia usa un UUID en el cuerpo JSON de `/api/v1/news` o en `/api/v1/news/:id`.
7. Para probar borrados, usar datos de ensayo identificados y revisar la confirmación. Una captura posterior puede volver a importar una noticia eliminada si sigue publicada en su RSS.

Las suites `backend/test/validation/checklist.e2e.spec.ts` y `frontend/test/checklist.test.tsx` cubren las ampliaciones. Se mantiene la regresión de captura, geografía, diccionario, sentimiento, purga y P12. `backend/test/capture/capture-scheduler.spec.ts` utiliza reloj simulado; `backend/test/lifecycle/lifecycle.api.spec.ts` comprueba el job automático con fechas controladas.

La evidencia resumida verificable está en [checklist-2026-11-09.json](evidencias/checklist-2026-11-09.json). El Excel entregado registra esta versión de trabajo y la PR; no afirma que los cambios estén integrados en `main`. La fusión sigue siendo humana.
