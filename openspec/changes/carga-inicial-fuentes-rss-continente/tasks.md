## 1. Aprobar el dataset de fuentes

- [x] 1.1 Recibir del Equipo 5 la lista explícitamente aprobada de URLs y continentes, sin inventar ni incorporar candidatos no revisados.
- [x] 1.2 Verificar en un proceso de curación separado que cada URL aprobada sea RSS público real —no Atom—, HTTP/S sin autenticación, estable/canónica y preferentemente HTTPS.
- [x] 1.3 Verificar en la curación que cada feed aprobado cumpla la política SSRF vigente, sea interpretable por `RssOnlyParser` y no requiera scraping, sin trasladar llamadas de red al seed.
- [x] 1.4 Confirmar que la lista aprobada cubra `AFRICA`, `ASIA`, `EUROPE`, `NORTH_AMERICA`, `SOUTH_AMERICA` y `OCEANIA`, excluya Antártida y asocie cada continente por origen editorial, no por hosting.
- [x] 1.5 Obtener la revisión humana final del dataset y bloquear toda implementación del manifiesto hasta completar esta puerta.

## 2. Evolucionar el esquema y la migración Prisma

- [x] 2.1 Añadir al esquema Prisma el enum `Continent` con exactamente los seis valores aprobados.
- [x] 2.2 Añadir `continent Continent?` a `RssSource` sin modificar `News`, relaciones ni restricciones existentes.
- [x] 2.3 Generar una migración Prisma nueva para crear el enum y la columna nullable, sin editar migraciones históricas.
- [x] 2.4 Revisar que la migración sea aditiva y no contenga backfill, DML, URLs ni operaciones de red.
- [x] 2.5 Ejecutar `prisma validate` y `prisma generate` y revisar que el cliente exponga el enum previsto.

## 3. Crear y validar el manifiesto versionado

- [x] 3.1 Crear el tipo inmutable de entrada `{ url, continent }` reutilizando `Continent` del cliente Prisma.
- [x] 3.2 Crear `initial-rss-sources.manifest.ts` exclusivamente con las URLs y asociaciones aprobadas en la sección 1.
- [x] 3.3 Implementar la validación de presencia de URL y de pertenencia al conjunto exacto de continentes aprobados.
- [x] 3.4 Reutilizar `SourceUrlNormalizer` para obtener la representación normalizada de cada URL antes de persistir.
- [x] 3.5 Detectar y rechazar URLs duplicadas después de normalizar, antes de abrir una transacción.
- [x] 3.6 Validar que el manifiesto incluya al menos una fuente por cada uno de los seis continentes.
- [x] 3.7 Devolver desde el validador una colección normalizada e inmutable y errores controlados que no escriban datos.

## 4. Implementar la carga transaccional e idempotente

- [x] 4.1 Definir el resultado resumido del seeder y un error controlado que identifique conflictos de continente sin exponer secretos.
- [x] 4.2 Ejecutar la validación completa del manifiesto antes de iniciar cualquier operación de persistencia.
- [x] 4.3 Procesar la colección validada en orden determinista dentro de una única transacción interactiva de Prisma.
- [x] 4.4 Crear como activa una fuente cuya URL normalizada no exista, asignando su continente aprobado.
- [x] 4.5 Asignar el continente a una fuente existente con `continent: null` sin cambiar su identificador ni su estado.
- [x] 4.6 Tratar como no-op una fuente existente con el mismo continente, sin duplicarla ni actualizarla innecesariamente.
- [x] 4.7 Detectar una fuente existente con otro continente, lanzar el conflicto controlado y abortar la transacción completa.
- [x] 4.8 Garantizar que ninguna ruta del seeder reactive fuentes inactivas ni modifique `id` o datos de `News`.
- [x] 4.9 Propagar fallos de persistencia tras el rollback y producir contadores coherentes de creadas, enriquecidas y sin cambios.

## 5. Proporcionar la ejecución explícita y offline

- [x] 5.1 Crear `load-initial-rss-sources.ts` para construir `PrismaClient`, invocar el seeder y cerrar siempre la conexión.
- [x] 5.2 Hacer que el entry point termine con código distinto de cero y un diagnóstico controlado ante validación, conflicto o fallo de persistencia.
- [x] 5.3 Verificar que el loader compilado se ejecute con `node dist/sources/seed/load-initial-rss-sources.js` después de las migraciones.
- [x] 5.4 Confirmar que el loader no se importe desde `main.ts` ni `SourcesModule`, no haga llamadas de red y no requiera cambios en dependencias o `package.json`.

## 6. Cubrir manifiesto y seeder con pruebas unitarias

- [x] 6.1 Probar que el manifiesto aprobado contiene exactamente la taxonomía permitida, cubre los seis continentes, excluye Antártida y conserva la correspondencia URL-continente aprobada.
- [x] 6.2 Probar el rechazo de cobertura incompleta, URL o continente ausente y valor continental no permitido.
- [x] 6.3 Probar el rechazo de URL inválida, protocolo no HTTP/S, credenciales y duplicados equivalentes después de normalizar.
- [x] 6.4 Probar la creación de una fuente inexistente con `active: true` y su continente.
- [x] 6.5 Probar el enriquecimiento de fuentes activas e inactivas con continente ausente, preservando identificador y estado.
- [x] 6.6 Probar el no-op y la repetición idempotente cuando la fuente ya tenga el mismo continente.
- [x] 6.7 Probar el conflicto controlado cuando la fuente tenga un continente diferente y comprobar que no se intenta reasignar.
- [x] 6.8 Probar la propagación de un fallo tardío y que el seeder no informe una ejecución parcial como exitosa.
- [x] 6.9 Probar que la validación precede a la transacción y que ningún test del seed necesita HTTP, DNS, fetcher o parser remotos.

## 7. Verificar migración y seed con PostgreSQL real

- [x] 7.1 Preparar fixtures locales y aislados para ejecutar las pruebas de integración sin acceso a Internet.
- [x] 7.2 Probar la migración completa sobre una base PostgreSQL vacía.
- [x] 7.3 Preparar una base en el estado anterior con fuentes activas, inactivas y noticias relacionadas.
- [x] 7.4 Aplicar la nueva migración sobre la base anterior y comprobar que fuentes, noticias, relaciones y estados se conservan con `continent: null`.
- [x] 7.5 Ejecutar el seed sobre una base sin sus URLs y comprobar creación, cobertura continental y restricción única.
- [x] 7.6 Repetir el mismo seed y comprobar que no cambian cantidad de filas, identificadores, estados ni continentes.
- [x] 7.7 Ejecutar el seed con fuentes preexistentes sin continente y comprobar enriquecimiento sin reactivación.
- [x] 7.8 Introducir un conflicto continental tardío y comprobar el rollback de todas las creaciones y actualizaciones de esa ejecución.
- [x] 7.9 Forzar un fallo de persistencia tardío y comprobar atomicidad, ausencia de datos parciales y posibilidad de repetición posterior.

## 8. Ejecutar regresiones de fuentes y captura

- [x] 8.1 Probar que el CRUD de fuentes continúa aceptando altas basadas únicamente en URL y no exige continente.
- [x] 8.2 Probar que respuestas REST, DTO y OpenAPI no incorporan continente ni filtros geográficos.
- [x] 8.3 Probar que `SourceRegistryPort` y `EligibleSource` continúan exponiendo exclusivamente `{ id, url }` para fuentes con y sin continente.
- [x] 8.4 Ejecutar las regresiones de HU-01, HU-02 y HU-03 y comprobar que scheduling, captura individual y captura múltiple no dependen de geografía.
- [x] 8.5 Comprobar que la persistencia y deduplicación de `News` conservan solo la referencia `sourceId` y no copian continente.

## 9. Validar calidad, alcance y arquitectura

- [x] 9.1 Validar `carga-inicial-fuentes-rss-continente` con OpenSpec en modo strict.
- [x] 9.2 Ejecutar nuevamente `prisma validate` y `prisma generate` sobre el resultado final.
- [x] 9.3 Ejecutar el build del backend y comprobar que el loader se emita en la ruta diseñada.
- [x] 9.4 Ejecutar las pruebas unitarias y de integración específicas de HU-14.
- [x] 9.5 Ejecutar la suite Jest completa con cobertura y confirmar el umbral global mínimo de 80 %.
- [x] 9.6 Ejecutar `git diff --check` y revisar que no haya cambios en dependencias, workflows, frontend, captura, scheduler, OpenAPI ni funcionalidad fuera de alcance.
- [x] 9.7 Revisar conformidad final con `docs/architecture.md` y ADR-002, ADR-003, ADR-004 y ADR-005, confirmando que no procede crear o modificar ADR.
