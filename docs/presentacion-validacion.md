# Presentación y validación de HumWorld

La primera parte dura **14 minutos** y se realiza en el **frontend**. GitHub, Swagger y las pruebas de API quedan para la segunda parte con el Excel. El horario comunicado es el lunes desde las 10:20, hora Santiago, por Zoom y en la sala del equipo. Al terminar, permanecer en la sala.

## Antes de compartir pantalla

1. Arrancar Docker Desktop y ejecutar desde el repositorio `./scripts/Iniciar-validacion.ps1`. Abrir **http://127.0.0.1:54176/**. Este es el entorno con noticias reales. La gestión debe mostrar **Evaluación local**. Si se requiere demostrar P12, cambiar después al modo con claves y explicarlo.
2. Abrir en otra pestaña **http://127.0.0.1:54179/** después de `./scripts/Iniciar-validacion.ps1 -Ensayo`. Es el mismo frontend con seis noticias ficticias restaurables para la purga. Identificar ambas pestañas por su puerto para no confundirlas.
3. Mantener la colección real sin caducidad. Comprobar Administración → Caducidad y purgado: campo vacío, cero caducadas. No aplicar siete días sobre la colección real.
4. En el ensayo, reponer las seis fixtures justo antes de presentar con el comando del README. Su antigüedad es controlada y relativa al arranque. Esta colección no sustituye las noticias reales recogidas durante varios días.
5. Revisar en Explorar los campos **Desde/Hasta** en el navegador que se compartirá por Zoom. Seleccionar fechas con el calendario, pulsar Consultar y comprobar que el intervalo mostrado y los recuentos cambian. En el recorrido automatizado no se pudieron completar esos campos nativos; la selección de día desde evolución sí se comprobó. Si los campos no funcionan manualmente, registrar el fallo y corregirlo antes de exponer.
6. No limpiar ni reiniciar la base. Tener un respaldo de PostgreSQL fuera del ZIP. Conservar `.env.validacion` fuera de pantalla, Git y Canvas.
7. Tener abiertos el Excel final, el guion y la PR #53 con su CI del commit entregado. El estado de la rama debe coincidir con el manifiesto de entrega. Solicitar revisión del último cambio y fusión humana antes de usar `main` como versión final.
8. Acordar un presentador que navega y otro que controla el tiempo. Compartir la ventana del navegador; no mostrar archivos con claves. Mantener pausas de 2–3 segundos en cada resultado y desplazarse una pantalla a la vez.

## Recorrido de 14 minutos

| Minuto | Acción en pantalla y explicación | Historias | Checks |
| --- | --- | --- | --- |
| 0:00–0:45 | Abrir Explorar, pulsar Limpiar y esperar. «HumWorld recoge noticias RSS y guarda un indicador de sentimiento. Hemos conservado noticias capturadas en distintos días». Señalar total, analizadas y sin evidencia. | HU-04/05/06/14 | 1/2/9/11/27 |
| 0:45–2:15 | Elegir un periodo reciente, Consultar; comparar con el rango completo. Agrupar mapa por Continente, seleccionar Europa o Sudamérica y después un país. Explicar que el país procede de la fuente RSS. | HU-08/09/11 | 15/17/18 |
| 2:15–3:30 | Seleccionar un día desde «Cómo cambia el pulso». Mostrar que cambian resumen, mapa, nube y ranking. Volver al rango completo. Abrir una palabra y su noticia relacionada. | HU-09/11/12/13 | 18/19/20 |
| 3:30–4:15 | En una noticia mostrar valor guardado, coincidencias, palabras/pesos, fuente, publicación, captura y categoría. «−1 es sentimiento negativo y +1 positivo. Sin coincidencias no hay evidencia; un cero con coincidencias es neutral». | HU-04/05/06/07/16 | 9/10/11/15 |
| 4:15–6:15 | Medios y fuentes → Medios: crear un medio de presentación. Fuentes RSS: registrar una dirección aún no usada con medio, país, idioma y categoría. Capturar ahora y esperar el mensaje. Si ya existe, buscarla y reutilizarla; no intentar darla de alta dos veces. | HU-02/14/15, gestión de medios | 3/4/6/28 |
| 6:15–7:00 | Seleccionar dos fuentes activas, Capturar fuentes seleccionadas y mostrar el resultado por fuente. Explicar que leer ítems no significa crear siempre noticias nuevas: la deduplicación evita repetirlas. Mostrar pausar/reactivar o editar metadatos de la fuente de ensayo. | HU-01/02/03/15 | 4/5/6/28 |
| 7:00–7:45 | Explorar → Limpiar → seleccionar la fuente capturada → Consultar. Esperar hasta que no queden análisis pendientes, actualizar consulta y mostrar noticias, humor y nube. | HU-04/05/06/12/13 | 9/11/19/20/28 |
| 7:45–10:45 | Demostrar el diccionario y el reanálisis de la misma noticia con el procedimiento inferior: crear frase, analizar, cambiar peso, analizar, eliminar solo la frase creada y restaurar el análisis. | HU-05/06/07/17 | 10/13/14 |
| 10:45–11:30 | Administración → Captura automática. Mostrar la periodicidad y guardar un cambio permitido. Explicar que la captura programada sigue ese intervalo; no simular una espera de quince minutos durante la demo. Conservar su evidencia para el Excel. | HU-01/18 | 7/8 |
| 11:30–13:15 | Cambiar a la pestaña de ensayo 54179 y explicar que sus datos son ficticios restaurables. Administración → Caducidad: siete días, seis noticias y una caducada. Purgar y confirmar solo ahí; mostrar cinco noticias y que desaparece la antigua. Explicar que el job automático se revisa cada hora. | HU-19/20/21 | 21/22/23 |
| 13:15–14:00 | Volver a la colección real 54176, mostrar que sigue conservada y resumir el flujo medio → RSS → noticia → análisis → visualizaciones. Pasar al Excel. | Flujo completo | 27/28 |

Este reparto permite mostrar la funcionalidad principal sin intentar repetir las 28 pruebas completas dentro de los 15 minutos. HU-10 es análisis de texto mediante API y se demuestra en la segunda parte. Las operaciones destructivas adicionales se reservan para el ensayo y el double-check.

## Valores y rutas que conviene tener a mano

Preparación comprobada el 25/11/2026: **20.098 noticias**, todas analizadas, capturadas en **siete fechas distintas**, desde el 6 al 25 de noviembre. Es una fotografía de esa revisión: la cantidad seguirá aumentando si Docker permanece encendido. No se afirma captura ininterrumpida durante todos esos días.

En esta preparación se creó **Medio presentación Equipo 5**, con **https://feeds.bbci.co.uk/news/business/rss.xml**, país **GB**, idioma **Inglés** y categoría editorial **Economía, negocios y finanzas**. Se capturaron 53 noticias: siete con evidencia, 46 sin evidencia y promedio **+0,2666714286**. Es un RSS externo: el contenido y la cantidad pueden cambiar. Para repetir un alta nueva, **https://feeds.bbci.co.uk/news/science_and_environment/rss.xml** estaba libre en la revisión; comprobarlo en Buscar fuente antes de usarlo. Categoría: Ciencia y tecnología, país GB, idioma Inglés. Si ya está registrada, reutilizarla y explicar la deduplicación del catálogo.

Para la captura múltiple se usaron Business y **https://feeds.bbci.co.uk/news/health/rss.xml**: ambas completadas, con 53 y 57 ítems leídos. No prometer esos números para el lunes.

## Diccionario desde el frontend, sobre la misma noticia

La fuente **https://feeds.bbci.co.uk/news/education/rss.xml** está pausada para conservar el ejemplo. No eliminarla. Si no aparece entre las opciones del explorador, pulsar **Limpiar**, esperar la carga y volver a seleccionar.

1. En 54176 → Explorar → Limpiar → Fuente RSS: BBC Education → Consultar → en evolución, seleccionar **24 nov 2026**. Aparecen tres noticias, una con evidencia y promedio **−0,40**.
2. Abrir **Frustration after generator failure forces school to close again**. Mostrar valor **−0,40**, una coincidencia, término `failure`, idioma `en` y peso **−2**. Cerrar el detalle.
3. Administración → Diccionario. Buscar `generator failure` para comprobar que no existe. Crear **generator failure**, idioma **Inglés**, peso **−5**. No modificar el término general `failure`.
4. Volver a Explorar, abrir la misma noticia. El resultado guardado todavía debe ser **−0,40**. «Cambiar el diccionario no cambia automáticamente los análisis ya guardados».
5. Idioma del análisis: **Inglés** → **Analizar y guardar**. Mostrar **−1,00**, una coincidencia de la frase `generator failure`. El motor prefiere la frase completa y no duplica la palabra solapada `failure`.
6. Administración → Diccionario → Buscar término: **generator failure**. En su fila cambiar el peso a **−1** → Guardar entrada. Volver a la misma noticia y Analizar y guardar en Inglés: **−0,20**.
7. Volver al diccionario y eliminar **solo la frase que acabamos de crear**, confirmando su nombre. Reanalizar la noticia en Inglés: vuelve a **−0,40**, con `failure` y peso −2. Esto deja el ejemplo restaurado.

Si la frase ya existía por un ensayo anterior, comprobar antes su origen y limpiar únicamente esa entrada de ensayo. No borrar términos ajenos. El resto de las noticias conserva sus valores guardados.

Para mostrar español e inglés con referencias pequeñas, utilizar el ensayo: «Excelente avance científico para los hospitales» tiene **+0,70** y «Good progress for hospital research» **+0,80**, con el diccionario de fixtures intacto. Se calculan sobre título y descripción, no sobre el artículo completo de la web externa.

## Segunda parte: Excel y double-checks

Presentar el Excel del **mismo SHA del ZIP**. La revisión técnica del 25/11 deja **25 SI y 3 PARCIAL (7, 8, 22)**. Mostrar la hoja EVIDENCIA: explica el alcance, las pruebas, las condiciones y las esperas pendientes. No anunciar 28/28 aceptados ni confundir una prueba automática con la aceptación del profesor.

- **Casos 1/5:** explicar la evaluación local. Para repetir eliminación de fuente con noticias, crear una fuente específica en el ensayo, capturarla, eliminarla allí y comprobar que desaparecen fuente y noticias. Nunca usar la fuente Education conservada para el ejemplo.
- **Casos 7/8:** seguir el procedimiento de espera real del documento de validación. Conservar hora de cambio, identificador de ítem y captura programada, sin pulsar captura manual.
- **Caso 12 / HU-10:** Swagger o cliente HTTP, POST `/api/v1/sentiment`: `{"text":"excelente avance","language":"es"}` → score 0,7 y dos coincidencias con el diccionario inicial de esta colección. `{"text":"good progress","language":"en"}` → 0,8 y dos coincidencias. Confirmar primero que los pesos no han sido modificados.
- **Casos 13/14:** repetir la frase y mostrar que el histórico solo cambia al reanalizar. API y web comparten el diccionario.
- **Caso 16:** eliminar una noticia de las fixtures de ensayo y consultar su UUID para obtener 404. La restauración se hace con el seed de ensayo, no borrando toda la base.
- **Casos 21/23:** ensayo de seis noticias, política siete días, una caducada. Tras purgar quedan cinco; las fuentes se conservan. Reponer fixtures para otra repetición.
- **Caso 22:** evidencia separada del job automático tras una hora real. No usar el botón de purga manual como prueba de automatización.
- **Casos 24–26:** Swagger y respuestas reales. POST fuente 201; GET/PUT/PATCH 200; DELETE 204. UUID válido inexistente 404, datos inválidos 400. La documentación «Responses» describe posibilidades; «Server response» muestra lo ejecutado.
- **Caso 27:** evidencia de reinicio del 25/11: 20.098 noticias y hashes idénticos antes/después, conservando el volumen. No detener todo Docker ni otras aplicaciones durante la exposición.
- **P12:** solo al pasar a modo con claves. Consulta lista fuentes; escritura con consulta responde 403; gestión permite escribir; sin clave 401. Son claves estáticas enviadas en `X-API-Key`, no un login que genera tokens. No mostrar los secretos en Zoom. El diccionario no pertenece al alcance protegido original de P12.

## GitHub, ZIP y entrega en Canvas

1. Revisar el último SHA y CI de la PR #53. Benjamín (`BGallegos000`) es el revisor solicitado. La fusión debe hacerla una persona; no cerrar Issues manualmente.
2. Descargar el ZIP preparado a partir del commit revisado. Si cambia el código o se fusiona con cambios adicionales, volver a comprobar y regenerar ZIP, manifiesto y Excel. No entregar `main` antiguo como si incluyera estas mejoras.
3. Verificar que al descomprimir aparecen README, backend, frontend, scripts, OpenSpec, pruebas, migraciones y archivos Compose. No incluir `.env.validacion`, claves, `node_modules`, `.git` ni respaldos de noticias.
4. Subir en los entregables correspondientes de Canvas **el ZIP del repositorio** y **la última versión del Excel**. El guion es apoyo del equipo. No se ha realizado una subida automática a Canvas.
5. Entrar a Zoom con antelación, usar la sala del equipo y permanecer al terminar hasta la puesta en común.
