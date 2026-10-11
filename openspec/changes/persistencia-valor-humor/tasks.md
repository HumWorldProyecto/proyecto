## 1. Aprobación y reconciliación

- [ ] 1.1 Aprobar como un único contrato las cuatro columnas anulables, el POST de activación, la respuesta `{ newsId, sentiment }`, la lectura nullable en GET y la política last-write-wins sin historial.
- [ ] 1.2 Antes de implementar, actualizar referencias remotas y reconciliar la rama con `main`, HU-17/HU-05 y cualquier HU-14/HU-16 ya integrada, sin arrastrar historias no integradas a un PR.
- [ ] 1.3 Confirmar que el timestamp/nombre de migración HU-06 no colisiona con ninguna migración remota nueva.

## 2. Persistencia y dominio

- [ ] 2.1 Añadir a Prisma los cuatro campos nullable de sentimiento reutilizando `DictionaryLanguage` y `Decimal(5,4)`.
- [ ] 2.2 Crear una migración aditiva sin defaults ni backfill, con constraints de rango, coherencia todo-o-nada y score cero cuando no hay coincidencias.
- [ ] 2.3 Definir el tipo inmutable de sentimiento persistido y la conversión explícita de Decimal a number.
- [ ] 2.4 Definir `NewsSentimentRepositoryPort` sin dependencias de Prisma, NestJS HTTP ni detalles del diccionario.
- [ ] 2.5 Implementar el adaptador Prisma que actualiza solo los cuatro campos, devuelve la fila persistida y diferencia inexistencia de fallo de datos.

## 3. Caso de uso y composición

- [ ] 3.1 Implementar `AnalyzeAndPersistNewsSentimentService` reutilizando `NewsSentimentAnalysisService` sin duplicar algoritmo o normalización.
- [ ] 3.2 Garantizar el orden analizar-después-persistir y cero escrituras ante fallo de News, diccionario o motor.
- [ ] 3.3 Implementar reemplazo atómico del último resultado y propagación controlada de fallos de persistencia.
- [ ] 3.4 Registrar puerto, adaptador y caso de uso en `SentimentModule` conservando los exports HU-05/HU-10.
- [ ] 3.5 Verificar que dos reanálisis no pueden producir un estado parcial o mezclar campos.

## 4. API y lectura

- [ ] 4.1 Crear DTO de request con idioma explícito `es | en` y validación del UUID de ruta.
- [ ] 4.2 Crear DTO de resultado con `{ newsId, sentiment: { score, matchedTerms, language, analyzedAt } }`.
- [ ] 4.3 Implementar `POST /api/v1/news/:id/sentiment` y mapear de forma sanitizada `200`, `400`, `404`, `503` y `500`.
- [ ] 4.4 Extender el dominio, repositorio y DTO de News con `sentiment` nullable sin eliminar campos existentes.
- [ ] 4.5 Regenerar `docs/openapi.json` desde la aplicación y verificar POST, GET, esquemas y códigos.

## 5. Compatibilidad y preservación

- [ ] 5.1 Integrar el modelo y mapeo HU-16 conservando simultáneamente `mediaTopicQcodes`/`mediaTopics` y `sentiment`.
- [ ] 5.2 Probar que la escritura de sentimiento preserva ID, fuente, textos, enlaces, GUID, fechas y Media Topics.
- [ ] 5.3 Probar que el upsert de un duplicado continúa con `update: {}` y no borra sentimiento.
- [ ] 5.4 Confirmar diff funcional vacío en captura RSS, deduplicación, scheduling, HU-10 y dependencias.

## 6. Pruebas unitarias

- [ ] 6.1 Cubrir resultados positivos, negativos, neutrales y sin evidencia en `es` y `en`.
- [ ] 6.2 Cubrir noticia inexistente y fallos de lectura, diccionario, motor y persistencia sin neutralidad falsa.
- [ ] 6.3 Cubrir orden de llamadas, una única invocación HU-05, payload exacto y resultado devuelto por persistencia.
- [ ] 6.4 Cubrir reanálisis con nuevo score, coincidencias, idioma y fecha; cambios de diccionario sin reanálisis.
- [ ] 6.5 Cubrir mapeo News nunca analizada, Decimal, neutralidad con evidencia y conservación de campos.
- [ ] 6.6 Cubrir validación y mapeo HTTP `200/400/404/503/500` con errores sanitizados.
- [ ] 6.7 Cubrir composición NestJS real sin acceso Prisma desde controller o servicio.

## 7. PostgreSQL 16 y E2E

- [ ] 7.1 Aplicar todas las migraciones sobre PostgreSQL 16 vacío y validar Prisma.
- [ ] 7.2 Aplicar HU-06 sobre un esquema anterior con noticias preexistentes y comprobar cuatro NULL sin alterar datos.
- [ ] 7.3 Validar en PostgreSQL los constraints de score, coincidencias, estado completo y ausencia de evidencia.
- [ ] 7.4 Ejecutar POST seguido de GET para positivo, negativo, neutral, sin coincidencias, español e inglés.
- [ ] 7.5 Verificar reanálisis explícito, reemplazo total, cambio de idioma y fecha nueva.
- [ ] 7.6 Verificar noticia inexistente y eliminación concurrente sin creación accidental.
- [ ] 7.7 Provocar fallos reales de diccionario y persistencia, comprobar `503`, ausencia de estado parcial y preservación del valor anterior.
- [ ] 7.8 Verificar concurrencia con resultados completos y política de última escritura confirmada.
- [ ] 7.9 Verificar captura duplicada y preservación de Media Topics, IDs, textos y fechas.
- [ ] 7.10 Ejecutar la secuencia combinada de migraciones HU-14/HU-16/HU-17/HU-06 en PostgreSQL 16 descartable.

## 8. Regresión y cierre

- [ ] 8.1 Ejecutar regresiones HU-01, HU-02, HU-03, News, HU-14, HU-16, HU-17, HU-05, HU-07 y HU-10 disponibles en la base reconciliada.
- [ ] 8.2 Ejecutar Prisma validate/generate y build con Node 24 y Prisma 6.
- [ ] 8.3 Ejecutar Jest completo y confirmar cobertura global mínima del 80 %.
- [ ] 8.4 Ejecutar `openspec validate persistencia-valor-humor --strict`.
- [ ] 8.5 Ejecutar `git diff --check` y revisar ausencia de secretos, dependencias y cambios fuera de alcance.
- [ ] 8.6 Verificar conformidad con arquitectura, ADR-002, ADR-004 y ADR-005 antes de marcar tareas.
- [ ] 8.7 Publicar únicamente la rama HU-06, ejecutar GitHub Actions y documentar SHA, jobs y evidencia PostgreSQL.
- [ ] 8.8 Abrir PR con `Closes #7` solo cuando sus dependencias estén integradas y el diff hacia `main` contenga exclusivamente HU-06.
