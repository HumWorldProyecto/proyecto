## 1. Verificación y auditoría

- [x] 1.1 Verificar `origin/main`, HU-05 en `bbbf7d857ce27125588a244534b206ffc0197183`, rama y worktree aislado.
- [x] 1.2 Verificar Issue #8 y estado de PR #40, #41 y #42.
- [x] 1.3 Leer arquitectura, ADR vigentes, Definition of Done y configuración OpenSpec.
- [x] 1.4 Auditar puertos, servicios, adaptador, módulo y pruebas de HU-05/HU-17.
- [x] 1.5 Confirmar que HU-05 ya satisface funcionalmente los criterios HU-07.

## 2. Especificación

- [x] 2.1 Definir análisis de noticias `es` y `en` con idioma explícito.
- [x] 2.2 Definir aislamiento de diccionarios, ausencia de mezcla y cero sin coincidencias.
- [x] 2.3 Definir asociación por `newsId`, determinismo y preservación de News.
- [x] 2.4 Definir noticia inexistente y fallos de lectura no neutrales.
- [x] 2.5 Definir reutilización obligatoria y límites sin endpoint, detección ni persistencia.
- [x] 2.6 Validar `analisis-bilingue-noticias` con OpenSpec strict antes de añadir pruebas.

## 3. Evidencia reutilizada de HU-05

- [x] 3.1 Reutilizar cobertura de noticia inexistente y diccionario vacío.
- [x] 3.2 Reutilizar cobertura de ausencia de coincidencias y segmentos independientes.
- [x] 3.3 Reutilizar cobertura de asociación al `newsId` y ausencia de escritura.
- [x] 3.4 Reutilizar cobertura unitaria de propagación de fallos y determinismo del motor.

## 4. Aceptación bilingüe nueva

- [x] 4.1 Probar noticias españolas e inglesas positivas y negativas en PostgreSQL 16.
- [x] 4.2 Probar la misma forma con pesos distintos en `es` y `en`.
- [x] 4.3 Probar exclusión de entradas del idioma opuesto.
- [x] 4.4 Probar resultado asociado al `newsId` correcto y determinismo.
- [x] 4.5 Probar preservación completa de las filas News.
- [x] 4.6 Probar fallos reales de acceso a News y diccionario con restauración garantizada.
- [x] 4.7 Confirmar que no hace falta modificar código productivo.

## 5. Validación local

- [x] 5.1 Ejecutar Prisma validate y generate.
- [x] 5.2 Ejecutar build TypeScript.
- [x] 5.3 Ejecutar Jest completo y cobertura global mínima del 80 %.
- [x] 5.4 Ejecutar integración con PostgreSQL 16 real, aislado y sin volumen.
- [x] 5.5 Ejecutar OpenSpec strict y `git diff --check`.
- [x] 5.6 Comprobar diff vacío en código productivo, Prisma, dependencias, OpenAPI, News y Capture.
- [x] 5.7 Confirmar conformidad con arquitectura, ADR-002, ADR-004 y ADR-005.

## 6. Versionado y CI

- [x] 6.1 Crear `spec: define HU-07 bilingual news sentiment` antes de las pruebas nuevas.
- [x] 6.2 Crear `test: verify HU-07 bilingual news sentiment` separado.
- [ ] 6.3 Publicar solo `hu07/analisis-bilingue-noticias`, sin force push.
- [ ] 6.4 Ejecutar GitHub Actions y comprobar `backend-tests` y `check`.
- [ ] 6.5 No abrir PR a `main` mientras HU-05 siga pendiente de integración.

## Evidencia local

- Base verificada: `origin/main` en `704864488f742e666f6a7a3e6de0b3480add8374` y `origin/hu05/analisis-sentimiento-noticias` en `bbbf7d857ce27125588a244534b206ffc0197183`.
- Issue #8 abierta; PR #40, #41 y #42 abiertas y sin merge durante la preparación.
- OpenSpec strict aprobado antes de añadir la suite de aceptación.
- Prisma validate/generate y build TypeScript aprobados en Node 24.
- Aceptación HU-07: 1 suite y 4 pruebas aprobadas.
- Jest completo: 57 suites y 503 pruebas aprobadas.
- Cobertura global: 98,43 % statements, 93,79 % branches, 98,86 % functions y 98,38 % lines.
- PostgreSQL real descartable `16.15`, sin volumen, con las tres migraciones existentes aplicadas.
- Fallos reales de las tablas `news` y `dictionary_entries` provocados y restaurados dentro de `finally`; ambos produjeron errores controlados.
- Diff productivo vacío: sin cambios en `backend/src/**`, Prisma, dependencias, OpenAPI, News, Capture, scheduling, frontend, arquitectura o ADR.
