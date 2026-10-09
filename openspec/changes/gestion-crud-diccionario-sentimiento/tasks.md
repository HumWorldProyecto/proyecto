## 1. Revisión humana y sincronización

- [x] 1.1 Aprobar normalización, límite de 200 caracteres, peso cero, unicidad, PATCH y DELETE físico.
- [x] 1.2 Aceptar expresamente el límite de seguridad actual o detener `apply` hasta especificar autenticación/autorización.
- [x] 1.3 Confirmar que no se añadirá seed editorial, auditoría, versionado, filtros ni paginación en HU-17.
- [x] 1.4 Antes de implementar, actualizar referencias y reconciliar la rama con `origin/main`, PR #40 y PR #41 si fueron integradas.
- [x] 1.5 Confirmar que no existe otro modelo, migración o módulo `dictionary` antes de crear el incremento.

## 2. Dominio y normalización

- [x] 2.1 Crear los tipos `DictionaryLanguage`, `DictionaryEntry` y la proyección inmutable para análisis.
- [x] 2.2 Implementar el normalizador NFKC, minúsculas por idioma, separadores Unicode, colapso y `trim`, conservando diacríticos.
- [x] 2.3 Implementar validación de forma no vacía, máximo 200 caracteres, idioma `es/en` y peso entero `[-5, 5]`.
- [x] 2.4 Crear errores de dominio diferenciados para entrada inválida, inexistencia y duplicado.

## 3. Prisma y PostgreSQL

- [x] 3.1 Añadir `DictionaryEntry` y el idioma al esquema Prisma sin modificar modelos existentes.
- [x] 3.2 Crear una migración aditiva posterior a todas las migraciones presentes en `main`, sin editar historial ni insertar filas.
- [x] 3.3 Añadir restricciones PostgreSQL para idioma, peso, longitud y unicidad `(language, term)`.
- [x] 3.4 Definir `DictionaryRepositoryPort` con create, findAll, findById, update y delete.
- [x] 3.5 Implementar el repositorio Prisma y traducir la colisión concurrente única a conflicto de dominio.
- [x] 3.6 Mantener actualizaciones atómicas y demostrar rollback ante validación, inexistencia, duplicado o fallo PostgreSQL.

## 4. Puerto de lectura coordinado con HU-05

- [x] 4.1 Definir `DictionaryReaderPort.listByLanguage(language)` separado del CRUD.
- [x] 4.2 Devolver snapshots inmutables, filtrados y ordenados por término e identificador.
- [x] 4.3 Registrar ambos puertos en `DictionaryModule` sin exponer Prisma al consumidor.
- [x] 4.4 Probar que cambios posteriores no mutan snapshots previos y sí aparecen en nuevas lecturas.

## 5. Servicio y API REST

- [x] 5.1 Implementar `DictionaryService` para creación, listado, detalle, PATCH y DELETE.
- [x] 5.2 Crear DTO de creación para `term`, `language` y `weight`, descartando propiedades ajenas mediante el whitelist vigente.
- [x] 5.3 Crear DTO de PATCH parcial que exija al menos un campo y reutilice toda validación.
- [x] 5.4 Crear DTO de respuesta con exactamente `id`, `term`, `language` y `weight`.
- [x] 5.5 Implementar las cinco rutas bajo `/api/v1/dictionary` con códigos `201/200/204/400/404/409/500`.
- [x] 5.6 Documentar en Swagger la forma, errores y limitación de autorización administrativa.
- [x] 5.7 Importar `DictionaryModule` en la composición de la aplicación sin modificar News ni Capture.
- [x] 5.8 Regenerar `docs/openapi.json` y comprobar que no aparecen endpoints adicionales.

## 6. Pruebas unitarias y de contrato

- [x] 6.1 Cubrir normalización, diacríticos, puntuación, espacios, vacío y longitud.
- [x] 6.2 Cubrir idiomas, pesos `-5`, `0`, `5`, decimales y valores fuera de rango.
- [x] 6.3 Cubrir creación, listado vacío/ordenado, detalle, PATCH parcial y DELETE.
- [x] 6.4 Cubrir duplicado tras normalizar, duplicado por PATCH y misma forma en idiomas distintos.
- [x] 6.5 Cubrir UUID mal formado, UUID ausente, PATCH vacío y conservación ante cada rechazo.
- [x] 6.6 Cubrir mapeo controlado de fallos inesperados sin exposición de detalles internos.
- [x] 6.7 Verificar DTO, controller y documento OpenAPI, incluida la ausencia de autenticación ficticia.

## 7. Integración PostgreSQL 16 y E2E

- [x] 7.1 Aplicar todas las migraciones sobre PostgreSQL 16 vacío y verificar diccionario con cero filas.
- [x] 7.2 Aplicar HU-17 sobre el esquema anterior con datos y demostrar que RSS, News y configuraciones se conservan.
- [x] 7.3 Verificar restricciones reales de idioma, peso, longitud y unicidad, incluida carrera concurrente.
- [x] 7.4 Ejecutar CRUD completo con repositorio real y comprobar orden determinista.
- [x] 7.5 Ejecutar E2E de las cinco rutas y todos los códigos HTTP aprobados.
- [x] 7.6 Verificar el puerto de lectura real por idioma y su snapshot.
- [x] 7.7 Si HU-14 o HU-16 están integradas, ejecutar sus pruebas PostgreSQL y reconciliar solo fixtures/aserciones de migración necesarias.

## 8. Verificación final

- [x] 8.1 Ejecutar `openspec validate gestion-crud-diccionario-sentimiento --strict`.
- [x] 8.2 Ejecutar Prisma validate/generate y revisar el SQL de migración.
- [x] 8.3 Ejecutar build, Jest completo y cobertura global mínima del 80 %.
- [x] 8.4 Ejecutar pruebas con PostgreSQL 16 real descartable.
- [x] 8.5 Ejecutar `git diff --check` y comprobar ausencia de dependencias, secretos, seed y cambios fuera de alcance.
- [x] 8.6 Verificar conformidad con arquitectura, ADR-002, ADR-004 y ADR-005 antes de marcar tareas.

## Evidencia

- `origin/main` permaneció en `704864488f742e666f6a7a3e6de0b3480add8374`; PR #40 y PR #41 seguían abiertas, por lo que no fue necesaria reconciliación.
- PostgreSQL `16.15` descartable: migración completa sobre base vacía y migración HU-17 sobre esquema anterior con una fuente, una noticia y una configuración preservadas; diccionario inicial con cero filas.
- Jest completo: 51 suites y 469 pruebas aprobadas.
- Cobertura global: 98,32 % statements, 93,47 % branches, 98,76 % functions y 98,27 % lines.
- Las seis rutas OpenAPI previas permanecen y solo se añaden las dos rutas del recurso `dictionary` que contienen las cinco operaciones aprobadas.
- No se añadieron dependencias, secretos, seed, autenticación ficticia ni cambios en News, Capture, frontend o scheduling.
