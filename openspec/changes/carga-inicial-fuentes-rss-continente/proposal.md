## Why

HumWorld necesita una carga inicial reproducible de fuentes RSS asociadas a una cobertura continental explícita para comenzar la captura con diversidad geográfica. El modelo actual conserva fuentes anteriores sin geografía y el CRUD solo exige URL, por lo que la incorporación debe ser compatible, repetible y separada del arranque de la aplicación.

## What Changes

- Añadir a `RssSource` un continente opcional mediante un enum cerrado con `AFRICA`, `ASIA`, `EUROPE`, `NORTH_AMERICA`, `SOUTH_AMERICA` y `OCEANIA`; esta taxonomía es una decisión de producto del Equipo 5 y no una lista impuesta por la Issue.
- Crear una migración Prisma nueva que añada la columna nullable sin modificar migraciones históricas ni inventar un backfill para fuentes existentes.
- Incorporar un manifiesto estático versionado cuya lista definitiva de URLs se completará solo después de aprobación humana y que exigirá al menos una fuente RSS por cada continente aprobado.
- Proporcionar un seed explícito, offline, idempotente y transaccional, ejecutado intencionalmente después de las migraciones y nunca durante el arranque de NestJS.
- Reutilizar la normalización vigente de URLs, impedir duplicados normalizados, preservar identificadores y estados existentes, y abortar toda la carga ante un conflicto entre una URL existente y un continente diferente.
- Mantener sin cambios el contrato REST y OpenAPI de fuentes y el contrato `{ id, url }` consumido por la captura automática y manual.
- Mantener fuera de alcance `country`, `region`, Antártida, Channel/Media, filtros geográficos REST, dashboards, sentimiento, IPTC, HU-08, HU-11 y cualquier llamada de red durante migraciones, seed, build o pruebas.

## Capabilities

### New Capabilities

- `carga-inicial-fuentes-rss-continente`: persistencia opcional del continente en fuentes RSS y carga inicial explícita, completa, idempotente, offline y transaccional sobre la taxonomía aprobada.

### Modified Capabilities

Ninguna. El CRUD vigente de fuentes y los flujos de captura conservan sus requisitos y contratos observables.

## Impact

- `backend/prisma/schema.prisma` y una migración Prisma nueva para el enum y la columna nullable.
- Manifiesto y ejecutor de seed dentro del módulo `sources`, compilados con el toolchain TypeScript existente y ejecutados explícitamente con Node, sin dependencias nuevas.
- Pruebas unitarias del manifiesto y la lógica de carga, pruebas de integración con PostgreSQL real, regresión de `sources`/`SourceRegistryPort` y regresión HU-01/HU-02/HU-03.
- ADR-002, ADR-003, ADR-004 y ADR-005 son aplicables y se respetan; no se modifica ninguna decisión arquitectónica aceptada ni se requiere un ADR nuevo.
- No cambian endpoints, DTO, filtros, Swagger/OpenAPI, `News`, `capture`, `package.json`, dependencias ni el arranque de NestJS.
