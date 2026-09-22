## 1. Contratos de fuentes y resultados

- [ ] 1.1 Extender `SourceRegistryPort` con una consulta por `sourceId` que distinga resultados `missing`, `inactive` y `eligible`, sin cambiar `getEligibleSources()`.
- [ ] 1.2 Adaptar `PrismaSourceRegistry` para resolver la selección por ID mediante el repositorio de HU-15, sin exponer Prisma ni acoplar captura a `SourcesService`.
- [ ] 1.3 Definir el resultado tipado de captura por fuente con finalización `completed`, `sourceId` e `itemsParsed`.
- [ ] 1.4 Definir categorías estables para `timeout`, `fetch/upstream`, `parse/invalid-rss`, `source-not-found`, `source-inactive`, `source-busy` y `unexpected`, sin depender de `Error.message`.
- [ ] 1.5 Adaptar los errores del fetcher y parser existentes para conservar causas internas y exponer únicamente sus categorías controladas.

## 2. Unidad compartida de captura y solapamiento

- [ ] 2.1 Extraer o evolucionar la lógica privada actual hacia una unidad inyectable de captura de una única `EligibleSource`.
- [ ] 2.2 Reutilizar en esa unidad `HttpRssFetcher`, `RssOnlyParser` y `CaptureOutputPort`, sin crear fetcher, parser o persistencia alternativos.
- [ ] 2.3 Evitar una comprobación previa con `SourceAccessibilityChecker`; la unidad debe realizar una sola descarga mediante el fetcher seguro existente.
- [ ] 2.4 Asignar el `sourceId` estable a los ítems interpretados y calcular `itemsParsed` antes de entregarlos al puerto de salida.
- [ ] 2.5 Mantener `CaptureOutputPort` como `Promise<void>` y no introducir `storedCount` ni cambios en las reglas de deduplicación de HU-04.
- [ ] 2.6 Implementar un guard en memoria compartido por `sourceId`, con adquisición atómica y liberación en `finally`.
- [ ] 2.7 Rechazar una segunda activación sobre la misma fuente sin iniciarla ni encolarla, permitiendo capturas simultáneas de fuentes diferentes.
- [ ] 2.8 Adaptar `CaptureOrchestratorService` para que HU-01 reutilice la unidad compartida y conserve snapshot, recorrido secuencial y aislamiento por fuente.
- [ ] 2.9 Mantener sin cambios funcionales `AutomaticCaptureJob`, `CaptureScheduler` y la periodicidad de HU-18; una fuente ocupada se omite sin detener las fuentes posteriores.

## 3. Caso de uso y API REST de HU-02

- [ ] 3.1 Implementar el caso de uso manual que recibe un `sourceId`, consulta `SourceRegistryPort` e invoca la unidad compartida únicamente para una selección `eligible`.
- [ ] 3.2 Garantizar que `missing` finaliza sin solicitudes externas con la categoría `source-not-found`.
- [ ] 3.3 Garantizar que `inactive` finaliza sin solicitudes externas con la categoría `source-inactive`.
- [ ] 3.4 Garantizar que el caso de uso nunca obtiene ni captura otras fuentes configuradas.
- [ ] 3.5 Añadir `POST /api/v1/sources/:id/capture` como operación síncrona sin body.
- [ ] 3.6 Añadir el DTO de éxito con `sourceId`, `status: "completed"` e `itemsParsed`, documentando que no representa filas persistidas.
- [ ] 3.7 Mapear éxito a `200`, fuente inexistente a `404`, fuente inactiva u ocupada a `409`, RSS inválido/fetch/upstream a `502`, timeout a `504` e inesperado a `500`.
- [ ] 3.8 Usar mensajes HTTP públicos genéricos que no expongan URLs, DNS/IP, mensajes internos, stack ni detalles del upstream.
- [ ] 3.9 Documentar el endpoint, parámetros, DTO y todas sus respuestas mediante Swagger/OpenAPI.
- [ ] 3.10 Registrar controller, caso de uso, guard y unidad compartida en `CaptureModule` sin ciclos ni `forwardRef`.
- [ ] 3.11 Mantener diferida la autenticación/autorización sin introducir usuarios, roles, guards o dependencias de seguridad.

## 4. Pruebas unitarias

- [ ] 4.1 Probar en el registry los estados `missing`, `inactive` y `eligible`, además de la regresión de la instantánea activa de HU-01.
- [ ] 4.2 Probar que la unidad compartida usa exactamente el fetcher, parser y output existentes y no invoca `SourceAccessibilityChecker`.
- [ ] 4.3 Probar captura exitosa, asignación de `sourceId`, cálculo de `itemsParsed` y feed RSS válido vacío con `itemsParsed = 0`.
- [ ] 4.4 Probar las categorías tipadas de RSS inválido, fetch/upstream, timeout e inesperado sin comparar textos de mensajes.
- [ ] 4.5 Probar que no se solicitan las páginas enlazadas por los ítems ni se acepta Atom, HTML o RSS inválido.
- [ ] 4.6 Probar que el guard impide solapamiento manual-manual y manual-automático sobre el mismo `sourceId`, no encola y se libera después de éxito o error.
- [ ] 4.7 Probar que fuentes diferentes pueden usar el guard simultáneamente.
- [ ] 4.8 Probar que el caso de uso selecciona exclusivamente el ID solicitado y que `missing`/`inactive` no alcanzan fetcher, parser ni output.
- [ ] 4.9 Probar el controller, DTO y mapping HTTP `200/404/409/502/504/500`, incluyendo sanitización de respuestas.

## 5. Integración, E2E y regresión

- [ ] 5.1 Añadir integración PostgreSQL real para la selección por ID de una fuente inexistente, inactiva y activa elegible.
- [ ] 5.2 Añadir E2E del endpoint con RSS controlado: HU-02 → parser real → `CaptureOutputPort` real → HU-04 → PostgreSQL → `GET /api/v1/news`.
- [ ] 5.3 Probar E2E que una actualización manual no realiza solicitudes a otras fuentes registradas.
- [ ] 5.4 Probar E2E un RSS válido sin ítems con `200` e `itemsParsed = 0`.
- [ ] 5.5 Probar E2E una segunda captura con los mismos GUID/link: `200`, `itemsParsed` interpretado y ninguna fila duplicada.
- [ ] 5.6 Probar E2E fuente inexistente e inactiva sin solicitudes externas y con `404/409` respectivamente.
- [ ] 5.7 Probar E2E RSS inválido/Atom/HTML, error upstream y timeout con `502/504` y sin detalles internos.
- [ ] 5.8 Probar la concurrencia sobre el mismo `sourceId` y la respuesta manual `409` sin una segunda captura ni cola.
- [ ] 5.9 Verificar en OpenAPI la ruta, ausencia de body, parámetro `id`, DTO de éxito y respuestas documentadas.
- [ ] 5.10 Ejecutar regresiones de HU-01 para snapshot, secuencialidad, aislamiento, fuente ocupada y continuidad de fuentes posteriores.
- [ ] 5.11 Ejecutar regresiones del scheduler HU-01/HU-18 y de SSRF, DNS/IP, Agent fijado, redirects, deadline, RSS-only y deduplicación HU-04.

## 6. Verificación final

- [ ] 6.1 Ejecutar `prisma validate` y `prisma generate` sin modificar schema ni crear migraciones.
- [ ] 6.2 Ejecutar build y suite Jest completa sobre PostgreSQL 16, manteniendo cobertura global mínima del 80 %.
- [ ] 6.3 Confirmar que no se añadieron dependencias ni se implementaron HU-03, múltiples fuentes, Channel/Media, frontend, Atom, scraping, retries/backoff, sentimiento o clasificación IPTC.
- [ ] 6.4 Verificar conformidad final con la arquitectura modular, Swagger y los contratos aprobados de HU-01, HU-04, HU-15 y HU-18.
