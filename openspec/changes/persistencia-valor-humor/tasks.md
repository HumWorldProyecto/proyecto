## 1. Aprobación y reconciliación

- [x] 1.1 Aprobar como un único contrato las cuatro columnas anulables, el POST de activación, la respuesta `{ newsId, sentiment }`, la lectura nullable en GET y la política last-write-wins sin historial.
- [x] 1.2 Antes de implementar, actualizar referencias remotas y reconciliar la rama con `main`, HU-17/HU-05 y cualquier HU-14/HU-16 ya integrada, sin arrastrar historias no integradas a un PR.
- [x] 1.3 Confirmar que el timestamp/nombre de migración HU-06 no colisiona con ninguna migración remota nueva.

## 2. Persistencia y dominio

- [x] 2.1 Añadir a Prisma los cuatro campos nullable de sentimiento reutilizando `DictionaryLanguage` y `Decimal(5,4)`.
- [x] 2.2 Crear una migración aditiva sin defaults ni backfill, con constraints de rango, coherencia todo-o-nada y score cero cuando no hay coincidencias.
- [x] 2.3 Definir el tipo inmutable de sentimiento persistido y la conversión explícita de Decimal a number.
- [x] 2.4 Definir `NewsSentimentRepositoryPort` sin dependencias de Prisma, NestJS HTTP ni detalles del diccionario.
- [x] 2.5 Implementar el adaptador Prisma que actualiza solo los cuatro campos, devuelve la fila persistida y diferencia inexistencia de fallo de datos.

## 3. Caso de uso y composición

- [x] 3.1 Implementar `AnalyzeAndPersistNewsSentimentService` reutilizando `NewsSentimentAnalysisService` sin duplicar algoritmo o normalización.
- [x] 3.2 Garantizar el orden analizar-después-persistir y cero escrituras ante fallo de News, diccionario o motor.
- [x] 3.3 Implementar reemplazo atómico del último resultado y propagación controlada de fallos de persistencia.
- [x] 3.4 Registrar puerto, adaptador y caso de uso en `SentimentModule`, conservando HU-05 y sin impedir la incorporación posterior de los exports HU-10.
- [x] 3.5 Verificar que dos reanálisis no pueden producir un estado parcial o mezclar campos.

## 4. API y lectura

- [x] 4.1 Crear DTO de request con idioma explícito `es | en` y validación del UUID de ruta.
- [x] 4.2 Crear DTO de resultado con `{ newsId, sentiment: { score, matchedTerms, language, analyzedAt } }`.
- [x] 4.3 Implementar `POST /api/v1/news/:id/sentiment` y mapear de forma sanitizada `200`, `400`, `404`, `503` y `500`.
- [x] 4.4 Extender el dominio, repositorio y DTO de News con `sentiment` nullable sin eliminar campos existentes.
- [x] 4.5 Regenerar `docs/openapi.json` desde la aplicación y verificar POST, GET, esquemas y códigos.

## 5. Compatibilidad y preservación

- [x] 5.1 Verificar la migración combinada y que una columna `mediaTopicQcodes` existente se conserva al persistir `sentiment`; resolver el mapeo conjunto cuando HU-16 se integre.
- [x] 5.2 Probar que la escritura de sentimiento preserva ID, fuente, textos, enlaces, GUID, fechas y Media Topics.
- [x] 5.3 Probar que el upsert de un duplicado continúa con `update: {}` y no borra sentimiento.
- [x] 5.4 Confirmar diff funcional vacío en captura RSS, deduplicación, scheduling, HU-10 y dependencias.

## 6. Pruebas unitarias

- [x] 6.1 Cubrir resultados positivos, negativos, neutrales y sin evidencia en `es` y `en`.
- [x] 6.2 Cubrir noticia inexistente y fallos de lectura, diccionario, motor y persistencia sin neutralidad falsa.
- [x] 6.3 Cubrir orden de llamadas, una única invocación HU-05, payload exacto y resultado devuelto por persistencia.
- [x] 6.4 Cubrir reanálisis con nuevo score, coincidencias, idioma y fecha; cambios de diccionario sin reanálisis.
- [x] 6.5 Cubrir mapeo News nunca analizada, Decimal, neutralidad con evidencia y conservación de campos.
- [x] 6.6 Cubrir validación y mapeo HTTP `200/400/404/503/500` con errores sanitizados.
- [x] 6.7 Cubrir composición NestJS real sin acceso Prisma desde controller o servicio.

## 7. PostgreSQL 16 y E2E

- [x] 7.1 Aplicar todas las migraciones sobre PostgreSQL 16 vacío y validar Prisma.
- [x] 7.2 Aplicar HU-06 sobre un esquema anterior con noticias preexistentes y comprobar cuatro NULL sin alterar datos.
- [x] 7.3 Validar en PostgreSQL los constraints de score, coincidencias, estado completo y ausencia de evidencia.
- [x] 7.4 Ejecutar POST seguido de GET para positivo, negativo, neutral, sin coincidencias, español e inglés.
- [x] 7.5 Verificar reanálisis explícito, reemplazo total, cambio de idioma y fecha nueva.
- [x] 7.6 Verificar noticia inexistente y eliminación concurrente sin creación accidental.
- [x] 7.7 Provocar fallos reales de diccionario y persistencia, comprobar respectivamente `503` y `500`, ausencia de estado parcial y preservación del valor anterior.
- [x] 7.8 Verificar concurrencia con resultados completos y política de última escritura confirmada.
- [x] 7.9 Verificar captura duplicada y preservación de Media Topics, IDs, textos y fechas.
- [x] 7.10 Ejecutar la secuencia combinada de migraciones HU-14/HU-16/HU-17/HU-06 en PostgreSQL 16 descartable.

## 8. Regresión y cierre

- [ ] 8.1 Ejecutar regresiones HU-01, HU-02, HU-03, News, HU-14, HU-16, HU-17, HU-05, HU-07 y HU-10 disponibles en la base reconciliada.
- [x] 8.2 Ejecutar Prisma validate/generate y build con Node 24 y Prisma 6.
- [x] 8.3 Ejecutar Jest completo y confirmar cobertura global mínima del 80 %.
- [x] 8.4 Ejecutar `openspec validate persistencia-valor-humor --strict`.
- [x] 8.5 Ejecutar `git diff --check` y revisar ausencia de secretos, dependencias y cambios fuera de alcance.
- [x] 8.6 Verificar conformidad con arquitectura, ADR-002, ADR-004 y ADR-005 antes de marcar tareas.
- [ ] 8.7 Publicar únicamente la rama HU-06, ejecutar GitHub Actions y documentar SHA, jobs y evidencia PostgreSQL.
- [x] 8.8 Verificar el gate de PR: abrir con `Closes #7` solo cuando las dependencias estén integradas; en caso contrario, no abrirla.

## Evidencia local

- Contrato aprobado por el encargo de implementación; `origin/main`, HU-17 y HU-05 son ancestros de la rama. HU-14 y HU-16 continúan fuera de `main`.
- Prisma validate/generate, build y migrate deploy aprobados con Node `24.20.0`, Prisma `6.19.3` y PostgreSQL `16.15`.
- Jest completo: 60 suites y 531 pruebas aprobadas.
- Cobertura global: 98,52 % statements, 94,15 % branches, 98,91 % functions y 98,48 % lines.
- PostgreSQL real: esquema vacío, actualización de noticia histórica, constraints, fallos reales de diccionario/escritura y secuencia combinada HU-14/HU-16/HU-17/HU-06 aprobados.
- OpenSpec strict y comprobación de whitespace aprobados; diff funcional vacío en captura, scheduling, dependencias y frontend.
- La regresión productiva de HU-14, HU-16, HU-07 y HU-10 queda pendiente hasta que sus ramas se integren en la base; se validó su compatibilidad contractual y de migraciones aplicable.
- La publicación y GitHub Actions se documentarán después del commit de implementación. No se abre PR mientras HU-17 y HU-05 sigan fuera de `main`.
