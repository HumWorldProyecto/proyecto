## 1. Decisiones editoriales

- [x] 1.1 Aprobar el alcance de los 17 conceptos raíz oficiales de IPTC Media Topics publicados el 2026-07-02.
- [x] 1.2 Aprobar la asignación automática determinista sobre título y descripción, con cero a varios temas y fallback vacío.
- [x] 1.3 Definir el manifiesto editorial v1 en español e inglés con todas las variantes literales, disparadores, exclusiones locales, dos casos positivos y dos negativos por QCode.
- [x] 1.4 Confirmar que HU-16 no incluye clasificación manual, servicio externo, backfill ni reclasificación de duplicados.

## 2. Sincronización con `main` y HU-14

- [x] 2.1 Actualizar la futura rama de implementación desde el `origin/main` vigente y verificar los SHA antes de tocar código.
- [x] 2.2 Si HU-14 ya está integrada, conservar `RssSource.continent`, ordenar la migración HU-16 después de `20261001000000_add_rss_source_continent` y reconciliar los fixtures compartidos sin modificar el alcance de HU-14.
- [x] 2.3 Confirmar que no existe una migración o campo de clasificación paralelo antes de crear el nuevo incremento.

## 3. Catálogo y límite `classification`

- [x] 3.1 Crear los tipos de tema y el catálogo local con exactamente los 17 QCodes, URI y etiquetas oficiales, fecha de publicación y atribución CC BY 4.0.
- [x] 3.2 Crear `MediaTopicClassifierPort` independiente de NestJS, Prisma y servicios externos.
- [x] 3.3 Implementar el normalizador y todas las variantes literales del manifiesto aprobado, sin abreviaturas interpretables, dependencias nuevas ni modificación de título o descripción.
- [x] 3.4 Implementar el clasificador determinista para cero a varios QCodes, eliminando duplicados y conservando un orden estable.
- [x] 3.5 Crear `ClassificationModule` y exportar el binding del puerto para consumo de `NewsModule`.

## 4. Persistencia Prisma/PostgreSQL

- [x] 4.1 Añadir al modelo `News` una colección no nula de QCodes con default vacío, sin cambiar sus claves ni relaciones actuales.
- [x] 4.2 Crear una migración aditiva nueva que añada la colección y limite sus valores a los 17 QCodes oficiales, sin editar migraciones históricas.
- [x] 4.3 Adaptar los tipos y el contrato de `NewsRepositoryPort` para recibir y devolver la clasificación sin depender de Prisma.
- [x] 4.4 Adaptar `PrismaNewsRepository` para filtrar códigos inválidos, eliminar duplicados, persistir temas solo al crear y mapear temas al leer.
- [x] 4.5 Mantener `update: {}` para identidades duplicadas y demostrar que IDs, metadatos y clasificación original se conservan.

## 5. Orquestación no bloqueante

- [x] 5.1 Importar `ClassificationModule` desde `NewsModule` e inyectar el puerto en `NewsService`.
- [x] 5.2 Clasificar título y descripción por separado antes del upsert, combinar QCodes, eliminar duplicados y ordenar el resultado.
- [x] 5.3 Ante texto no clasificable o fallo del clasificador, registrar el fallo cuando corresponda, continuar la persistencia con una colección vacía y procesar el resto del lote.
- [x] 5.4 Mantener el `try/catch` de clasificación separado del manejo de errores de repositorio para que Prisma/PostgreSQL nunca se convierta en fallback `[]`.
- [x] 5.5 Mantener sin cambios `CaptureOutputPort`, `RssItem`, `NewsCaptureOutputAdapter`, parser, jobs, servicios y controladores de captura.

## 6. Contrato REST/OpenAPI

- [x] 6.1 Añadir el tipo de respuesta de tema con `qcode`, `uri` y `label`.
- [x] 6.2 Añadir `mediaTopics` siempre presente en `NewsResponseDto`, incluida la colección vacía.
- [x] 6.3 Sincronizar Swagger/OpenAPI y conservar todos los campos, nulabilidad y códigos HTTP existentes de `GET /api/v1/news`.
- [x] 6.4 Confirmar que HU-16 no crea endpoints, filtros ni operaciones de escritura adicionales.

## 7. Pruebas unitarias

- [x] 7.1 Verificar igualdad exacta, unicidad y orden de los 17 QCodes, URI y etiquetas contra el snapshot oficial aprobado.
- [x] 7.2 Cubrir cada variante literal, disparador y exclusión, incluidos los 34 casos positivos y 34 negativos del manifiesto editorial v1.
- [x] 7.3 Cubrir clasificación separada de título/descripción, unión posterior, frases que no cruzan campos, normalización, límites de palabra/frase, texto vacío, múltiples temas, eliminación de duplicados, orden estable y determinismo.
- [x] 7.4 Cubrir que `NewsService` registra el error, persiste `[]` y continúa el lote cuando no hay coincidencia o el clasificador falla.
- [x] 7.5 Cubrir que un error real del repositorio conserva su logging y aislamiento propios y no se convierte en fallback `[]`.
- [x] 7.6 Cubrir la clasificación válida, el filtrado defensivo de códigos ajenos y la conservación del manejo de errores del repositorio.
- [x] 7.7 Actualizar DTO, controlador y adaptador solo donde cambie la forma de la noticia, manteniendo las regresiones de metadatos e identidad.

## 8. Pruebas reales con PostgreSQL 16

- [x] 8.1 Aplicar todas las migraciones sobre una base PostgreSQL 16 vacía y comprobar el esquema final.
- [x] 8.2 Aplicar la migración HU-16 sobre el esquema anterior con noticias existentes y demostrar que IDs, metadatos y relaciones se conservan con clasificación `[]`.
- [x] 8.3 Verificar persistencia y lectura de cero, uno y varios QCodes oficiales.
- [x] 8.4 Verificar rechazo de códigos ajenos, ausencia de duplicados y default no nulo.
- [x] 8.5 Verificar idempotencia por `(sourceId, dedupeKey)` y preservación de la clasificación original al repetir una identidad.

## 9. E2E y regresiones de captura

- [x] 9.1 Añadir un E2E captura → clasificación → persistencia → `GET /api/v1/news` sin insertar directamente la noticia demostrada.
- [x] 9.2 Cubrir en API una noticia con un tema, varios temas y `mediaTopics: []`, incluyendo la forma exacta de cada objeto.
- [x] 9.3 Demostrar que un fallo del clasificador no bloquea la noticia ni los ítems siguientes.
- [x] 9.4 Ejecutar regresiones de captura automática, manual y múltiple, deduplicación y metadatos REST sin cambiar sus contratos.
- [x] 9.5 Si HU-14 está integrada, ejecutar también sus pruebas de continente y seed para descartar regresiones cruzadas.

## 10. Verificación final

- [x] 10.1 Ejecutar `openspec validate clasificacion-iptc-media-topics --strict`.
- [x] 10.2 Ejecutar Prisma validate y generate con la versión fijada del proyecto.
- [x] 10.3 Ejecutar build, Jest completo y cobertura global mínima del 80 %.
- [x] 10.4 Ejecutar las pruebas de integración contra PostgreSQL 16 real y conservar evidencia reproducible.
- [x] 10.5 Ejecutar `git diff --check` y revisar que no existan dependencias, secretos o cambios fuera de HU-16.
- [x] 10.6 Comprobar la conformidad final con `docs/architecture.md`, ADR-002, ADR-003, ADR-004 y ADR-005 antes de marcar tareas.
