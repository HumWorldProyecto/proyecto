## 1. Base y trazabilidad

- [x] 1.1 Verificar `origin/main`, `origin/hu05/analisis-sentimiento-noticias`, HEAD `bbbf7d857ce27125588a244534b206ffc0197183` y worktree aislado.
- [x] 1.2 Leer Issue #11, arquitectura, ADR-002, ADR-004, ADR-005 y contratos HU-05/HU-17.
- [x] 1.3 Confirmar ausencia de cambios en dependencias, Prisma, News, Capture, scheduling y otros worktrees.

## 2. Especificación

- [x] 2.1 Definir endpoint, DTO, respuesta, idiomas y semántica `200`.
- [x] 2.2 Definir validaciones `400`, límite Unicode de 10.000 y respuesta `413`.
- [x] 2.3 Definir ausencia de coincidencias, diccionario vacío y determinismo.
- [x] 2.4 Definir `503` para fallo del diccionario y `500` sanitizado para otros fallos.
- [x] 2.5 Definir ausencia de persistencia y fronteras con News, RSS, deduplicación y scheduling.
- [x] 2.6 Validar `analisis-directo-texto-api` con OpenSpec strict antes de implementar.

## 3. Caso de uso y DTO

- [x] 3.1 Crear DTO de entrada con `text` string no vacío e idioma `es | en`.
- [x] 3.2 Crear DTO de salida exacto `{ score, matchedTerms }`.
- [x] 3.3 Implementar `DirectSentimentAnalysisService` sobre `SentimentAnalyzerPort`.
- [x] 3.4 Enviar el texto como un único segmento y no duplicar reglas HU-05.
- [x] 3.5 Aplicar el límite de 10.000 puntos de código antes del motor.

## 4. API y composición

- [x] 4.1 Implementar `POST /api/v1/sentiment/analyze` con respuesta `200`.
- [x] 4.2 Mapear validación a `400`, exceso a `413`, diccionario a `503` y fallo inesperado a `500`.
- [x] 4.3 Sanitizar todos los errores HTTP.
- [x] 4.4 Registrar controller y servicio en `SentimentModule` sin nuevos accesos a datos.
- [x] 4.5 Documentar entrada, salida, límites y errores mediante Swagger.
- [x] 4.6 Regenerar `docs/openapi.json` desde la aplicación real.

## 5. Pruebas unitarias

- [x] 5.1 Probar delegación exacta con idiomas `es` e `en` y un segmento.
- [x] 5.2 Probar el límite exacto, exceso y caracteres Unicode suplementarios.
- [x] 5.3 Probar propagación de resultado, neutralidad y fallo del analizador.
- [x] 5.4 Probar mapeo HTTP `413`, `503` y `500` sin filtrar detalles.
- [x] 5.5 Probar la composición resoluble de módulo, controller, servicio y puerto.

## 6. E2E e integración PostgreSQL 16

- [x] 6.1 Probar resultado real positivo/negativo y aislamiento explícito `es/en`.
- [x] 6.2 Probar sin coincidencias, diccionario vacío y texto válido sin tokens.
- [x] 6.3 Probar cuerpo ausente/malformado, tipos, texto vacío y lenguaje inválido.
- [x] 6.4 Probar límite exacto y `413` por exceso.
- [x] 6.5 Probar determinismo y cambios posteriores del diccionario.
- [x] 6.6 Provocar un fallo real de lectura PostgreSQL y comprobar `503` sanitizado.
- [x] 6.7 Verificar que el análisis no crea ni modifica noticias ni persiste texto/resultado.
- [x] 6.8 Verificar ruta, schemas y códigos mediante el documento OpenAPI generado.

## 7. Regresión y calidad

- [x] 7.1 Ejecutar Prisma validate y generate.
- [x] 7.2 Ejecutar build TypeScript.
- [x] 7.3 Ejecutar Jest completo con cobertura global mínima del 80 %.
- [x] 7.4 Ejecutar pruebas aplicables con PostgreSQL 16 real descartable.
- [x] 7.5 Validar OpenSpec strict y `git diff --check`.
- [x] 7.6 Comprobar que no hay dependencias, migraciones ni cambios fuera de alcance.
- [x] 7.7 Confirmar conformidad con arquitectura y ADR-002, ADR-004 y ADR-005.

## 8. Versionado y CI

- [x] 8.1 Crear un commit de especificación antes del código.
- [x] 8.2 Crear un commit separado de implementación validada.
- [x] 8.3 Publicar solo `hu10/analisis-directo-texto-api`, sin force push.
- [x] 8.4 Ejecutar `workflow_dispatch` sobre la rama y comprobar `backend-tests` y `check`.
- [x] 8.5 No abrir PR a `main` mientras HU-17/HU-05 no estén integradas.

## Evidencia local

- Base verificada: `origin/hu05/analisis-sentimiento-noticias` y HEAD inicial `bbbf7d857ce27125588a244534b206ffc0197183`; `origin/main` permaneció en `704864488f742e666f6a7a3e6de0b3480add8374`.
- OpenSpec strict, Prisma validate/generate y build TypeScript aprobados en Node 24.
- Jest completo: 59 suites y 525 pruebas aprobadas.
- Cobertura global: 98,48 % statements, 93,85 % branches, 98,89 % functions y 98,44 % lines.
- PostgreSQL real descartable `16.15`, sin volumen, con las tres migraciones existentes y el flujo HU-10 E2E aprobado.
- Fallo real de lectura PostgreSQL provocado y restaurado dentro del test; respuesta `503` sanitizada comprobada.
- OpenAPI generado desde NestJS: `POST /api/v1/sentiment/analyze`, DTO de request/response, límite 10.000 y respuestas `200/400/413/500/503`.
- Sin cambios en dependencias, Prisma, News, Capture, scheduling, frontend, arquitectura o ADR.
- GitHub Actions `workflow_dispatch` sobre `dd16946f07da4ee4ea069d836b943c3a0e70cc77`: ejecución [#38012130739](https://github.com/HumWorldProyecto/proyecto/actions/runs/38012130739), jobs `backend-tests` y `check` aprobados.
- PR #42 (HU-17) continúa abierta y HU-05 aún no tiene PR; no se abrió PR de HU-10 a `main`.
