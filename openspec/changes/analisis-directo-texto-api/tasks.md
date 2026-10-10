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

- [ ] 3.1 Crear DTO de entrada con `text` string no vacío e idioma `es | en`.
- [ ] 3.2 Crear DTO de salida exacto `{ score, matchedTerms }`.
- [ ] 3.3 Implementar `DirectSentimentAnalysisService` sobre `SentimentAnalyzerPort`.
- [ ] 3.4 Enviar el texto como un único segmento y no duplicar reglas HU-05.
- [ ] 3.5 Aplicar el límite de 10.000 puntos de código antes del motor.

## 4. API y composición

- [ ] 4.1 Implementar `POST /api/v1/sentiment/analyze` con respuesta `200`.
- [ ] 4.2 Mapear validación a `400`, exceso a `413`, diccionario a `503` y fallo inesperado a `500`.
- [ ] 4.3 Sanitizar todos los errores HTTP.
- [ ] 4.4 Registrar controller y servicio en `SentimentModule` sin nuevos accesos a datos.
- [ ] 4.5 Documentar entrada, salida, límites y errores mediante Swagger.
- [ ] 4.6 Regenerar `docs/openapi.json` desde la aplicación real.

## 5. Pruebas unitarias

- [ ] 5.1 Probar delegación exacta con idiomas `es` e `en` y un segmento.
- [ ] 5.2 Probar el límite exacto, exceso y caracteres Unicode suplementarios.
- [ ] 5.3 Probar propagación de resultado, neutralidad y fallo del analizador.
- [ ] 5.4 Probar mapeo HTTP `413`, `503` y `500` sin filtrar detalles.
- [ ] 5.5 Probar la composición resoluble de módulo, controller, servicio y puerto.

## 6. E2E e integración PostgreSQL 16

- [ ] 6.1 Probar resultado real positivo/negativo y aislamiento explícito `es/en`.
- [ ] 6.2 Probar sin coincidencias, diccionario vacío y texto válido sin tokens.
- [ ] 6.3 Probar cuerpo ausente/malformado, tipos, texto vacío y lenguaje inválido.
- [ ] 6.4 Probar límite exacto y `413` por exceso.
- [ ] 6.5 Probar determinismo y cambios posteriores del diccionario.
- [ ] 6.6 Provocar un fallo real de lectura PostgreSQL y comprobar `503` sanitizado.
- [ ] 6.7 Verificar que el análisis no crea ni modifica noticias ni persiste texto/resultado.
- [ ] 6.8 Verificar ruta, schemas y códigos mediante el documento OpenAPI generado.

## 7. Regresión y calidad

- [ ] 7.1 Ejecutar Prisma validate y generate.
- [ ] 7.2 Ejecutar build TypeScript.
- [ ] 7.3 Ejecutar Jest completo con cobertura global mínima del 80 %.
- [ ] 7.4 Ejecutar pruebas aplicables con PostgreSQL 16 real descartable.
- [ ] 7.5 Validar OpenSpec strict y `git diff --check`.
- [ ] 7.6 Comprobar que no hay dependencias, migraciones ni cambios fuera de alcance.
- [ ] 7.7 Confirmar conformidad con arquitectura y ADR-002, ADR-004 y ADR-005.

## 8. Versionado y CI

- [ ] 8.1 Crear un commit de especificación antes del código.
- [ ] 8.2 Crear un commit separado de implementación validada.
- [ ] 8.3 Publicar solo `hu10/analisis-directo-texto-api`, sin force push.
- [ ] 8.4 Ejecutar `workflow_dispatch` sobre la rama y comprobar `backend-tests` y `check`.
- [ ] 8.5 No abrir PR a `main` mientras HU-17/HU-05 no estén integradas.
