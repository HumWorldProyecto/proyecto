# Validación previa a la presentación

Revisión del 25/11/2026. La evidencia técnica se distingue de la aceptación formal del profesor. Se conservan las definiciones de los 28 casos del Excel original.

Resultado: **25 SI y 3 PARCIAL**. Los parciales 7, 8 y 22 requieren repetir una espera real. La revisión anterior del 09/11 marcaba estos casos SI sobre pruebas de temporización controlada. Este recuento más estricto no significa una regresión del código.

Los casos 1 y 5 se satisfacen en **evaluación local**: administración sin clave y borrado de fuente con noticias. El modo normal conserva las claves P12 y desactiva las fuentes sin borrar sus noticias. La condición se consigna en el Excel y se explica al profesor.

Regresión actual: 82 suites / 867 pruebas backend con PostgreSQL 16; 8 suites / 42 pruebas frontend. Cobertura superior al 80 % en los cuatro indicadores. El archivo de evidencia recoge los porcentajes. La comprobación OpenSpec strict y el resultado de CI del SHA final se adjuntan a la entrega. La PR #53 sigue pendiente de fusión humana.

## Evidencia por caso

| Caso | Resultado | Evidencia y límite |
| --- | --- | --- |
| 1 | SI | SI condicionado: frontend de evaluación local sin clave verificado el 25/11. Normal conserva P12. No se presenta como administración pública en producción. |
| 2 | SI | Carga limpia en PostgreSQL 16: 50 medios, 53 fuentes, seis continentes y cero fuentes sin país, idioma o categoría editorial IPTC. |
| 3 | SI | Frontend real: Medio presentación Equipo 5 y BBC Business registrados con país GB, Europa derivada, idioma en y categoría editorial Economía. Consulta API confirma el registro. |
| 4 | SI | Listado/detalle/active comprobados por E2E; búsqueda y estado desde catálogo web. Metadatos de fuente disponibles en la respuesta. |
| 5 | SI | SI en evaluación local: E2E borra fuente y sus noticias de forma transaccional, conserva otra fuente/noticia y responde 404 al repetir. Normal: desactivación conserva noticias. |
| 6 | SI | Frontend real: captura individual de BBC Business, 53 ítems. Captura múltiple HU-03 de Business/Health: 53 y 57 ítems, dos completadas. E2E adicional usa RSS controlado. |
| 7 | PARCIAL | PARCIAL: programador y job cubiertos con reloj controlado; colección real conserva siete días de captura. Falta introducir un ítem identificable en un RSS controlado y esperar el intervalo real sin captura manual. |
| 8 | PARCIAL | PARCIAL: frontend guardó 30 y volvió a 15 minutos; GET y reinicio confirman 15. Regresión de cadencia pasa con reloj simulado. Falta registrar una ejecución real posterior al cambio. |
| 9 | SI | Detalle web de noticia BBC Education muestra título, descripción, fuente, publicación 24/11, captura 25/11, GB/Europa, categoría Educación y score -0,4 guardado. |
| 10 | SI | Pruebas del motor y persistencia en ES/EN; navegador guardó análisis en inglés de noticia capturada. |
| 11 | SI | Motor independiente probado con lotes de referencia; texto excelente avance y RSS controlado producen score 0,7 y 2 coincidencias. |
| 12 | SI | POST /api/v1/sentiment y /sentiment/analyze devuelven el mismo score 0,7 en E2E con PostgreSQL 16. |
| 13 | SI | CRUD del diccionario web/REST cubierto por regresión actual. Alta/cambio en navegador constan en evidencia 09/11. El 25/11 se comprobó la pantalla y sus 61 entradas; no se cambió el diccionario real. |
| 14 | SI | Pruebas de diccionario y sentimiento verifican cambios en análisis nuevos y conservación de análisis guardados hasta reanalizar. |
| 15 | SI | Filtros de fuente y día comprobados en web: BBC Education, 24/11, tres noticias y media -0,4. REST y frontend automatizados cubren fechas, geografía y categoría. La entrada manual Desde/Hasta debe repetirse en el navegador de presentación: la automatización no consiguió completar esos campos. |
| 16 | SI | DELETE /api/v1/news con body UUID y DELETE /news/:id: 204, consulta posterior 404, conserva fuente. UI exige confirmación; pruebas en base aislada. |
| 17 | SI | Web: agrupación por continente para BBC Business, Europa +0,2666714286 con siete noticias con evidencia. Promedio ponderado validado por regresión. |
| 18 | SI | Web: selección 24/11 actualizó resumen, mapa, nube y ranking de Education, de 23 a tres noticias. API independiente confirma el mismo filtro. |
| 19 | SI | Ranking conserva abs(score/N). Corrección de presentación muestra aportes hasta seis decimales o notación científica. Regresión comprueba 1/20045 visible como +0,00005, sin alterar el score. |
| 20 | SI | Web: BBC Business muestra siete términos influyentes, siete noticias con evidencia. Ponderación y navegación a noticias contrastadas con pruebas; los aportes pequeños mantienen precisión. |
| 21 | SI | Frontend guardó 36500 días y volvió a desactivar la caducidad. Vista previa siempre cero caducadas en colección real. GET/reinicio confirman retentionDays=null. Sin purgar noticias reales. |
| 22 | PARCIAL | PARCIAL: job horario comprobado con fechas controladas en PostgreSQL 16 y conserva límite/vigentes. Falta esperar una ejecución automática real de una hora en ensayo aislado con caducadas. |
| 23 | SI | Purgado manual y confirmación web cubiertos por regresión aislada. Ensayo restaurable en 54179 preparado: seis noticias ficticias, una caducada. Vista previa web real verificada; el clic de purga no se ejecutó en este recorrido. |
| 24 | SI | Cliente HTTP independiente en E2E verifica POST 201, GET/PUT/PATCH 200, DELETE 204 sin cuerpo y metadatos persistidos. |
| 25 | SI | API pública y frontend coinciden para source=BBC Business: 53 noticias, siete con evidencia, media +0,2666714286. Regresión cubre global, continente, país y detalle de noticia. |
| 26 | SI | E2E obtiene 404 para UUID inexistente y 400 para validación inválida; respuestas publicadas en Swagger, sin escrituras indebidas. |
| 27 | SI | Reinicio real 25/11 de los tres servicios: 20098 noticias y hashes idénticos de noticias, fuentes, medios, diccionario y ambas configuraciones. Volumen conservado. |
| 28 | SI | Flujo real frontend: alta medio/fuente Business, captura 53 ítems, 53 análisis guardados, siete con evidencia y siete palabras, dashboard +0,2666714286. API con filtro source coincide. Regresión usa lote controlado. |

## Cerrar las esperas reales

- **7:** en un entorno de ensayo, registrar un RSS controlado, configurar 15 minutos, añadir un ítem con GUID y título únicos después de configurar el intervalo, no pulsar captura manual y conservar hora de configuración/publicación/captura. Comprobar que aparece desde el frontend y que su captura corresponde al ciclo automático.
- **8:** cambiar la periodicidad desde el frontend, anotar la hora y el valor, observar la siguiente ejecución y contrastar la nueva cadencia. No basta guardar o recargar el valor. Repetir con un nuevo ítem identificable si se combina con el caso 7.
- **22:** usar únicamente el ensayo 54179, con una noticia de captura antigua y otra vigente. Esperar el job horario desde el arranque sin pulsar purga manual. Registrar hora anterior/posterior y comprobar que desaparece solo la antigua. La colección real sigue sin caducidad.

No marcar estos casos SI por el paso del tiempo sin conservar la evidencia. Actualizar el Excel después del ensayo. La captura y las purgas se detienen mientras Docker o el equipo están apagados.

## Repeticiones durante la validación

La parte inicial de 10–15 minutos utiliza el frontend. El [guion](presentacion-validacion.md) asigna pantallas a historias y checks. Las pruebas API 12 y 24–26 se reservan para la segunda parte. La entrada manual de los campos Desde/Hasta debe comprobarse en el navegador usado para Zoom; la selección de un día desde la evolución sí se comprobó en el recorrido real.

Antes de borrados, confirmar el entorno: 54176 es la colección real y 54179 es el ensayo con fixtures restaurables. La purga manual del caso 23 ya tiene prueba automatizada con PostgreSQL, pero su botón quedó preparado para el ensayo manual. La noticia de ejemplo de Education permanece conservada.

La evidencia reproducible está en [checklist-2026-11-25.json](evidencias/checklist-2026-11-25.json). Los registros del [09/11](evidencias/checklist-2026-11-09.json) se conservan como antecedentes fechados. El Excel final y el ZIP deben indicar el mismo commit que se revisó; el ZIP se crea con los archivos versionados y excluye claves, dependencias y datos privados.
