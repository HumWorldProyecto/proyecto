# HumWorld — Equipo 5

## Objetivo

HumWorld captura noticias exclusivamente mediante fuentes RSS y las almacena para su consulta. El producto evolucionará progresivamente para calcular el sentimiento o humor de esas noticias y permitir consultas y dashboards geográficos.

## Equipo

- Benjamin Gallegos
- Eduardo Diaz
- Felipe Sanhueza
- Daniel Rossel
- Felipe Levi
- Tomas Heilenkotter

## Estado actual

El incremento de Sprint 1 está integrado en `main` mediante el [PR #29](https://github.com/HumWorldProyecto/proyecto/pull/29), con CI post-merge verde.

Capacidades implementadas actualmente:

- Gestión CRUD y desactivación lógica/reactivación de fuentes RSS.
- Configuración global de periodicidad.
- Captura automática RSS.
- Almacenamiento y deduplicación de noticias.
- Consulta de noticias mediante `GET /api/v1/news`.
- Documentación Swagger/OpenAPI.
- Persistencia PostgreSQL con Prisma.
- Pruebas automáticas e integración continua.

El análisis de sentimiento, los dashboards, el frontend, Channel/Media, el diccionario, el purgado y las demás capacidades futuras todavía no están implementados.

## Stack actual

- Node.js 24
- TypeScript 5
- NestJS 10
- PostgreSQL 16
- Prisma 6
- Jest 29
- Docker Compose
- GitHub Actions
- OpenSpec
- Swagger/OpenAPI

## Puesta en marcha local

Desde la raíz del repositorio, iniciar PostgreSQL:

```bash
docker compose up -d
```

La base de datos queda expuesta en `localhost:5433`. El backend utiliza esta URL local:

```text
postgresql://humworld:humworld@localhost:5433/humworld?schema=public
```

Desde `backend/`:

```bash
export DATABASE_URL='postgresql://humworld:humworld@localhost:5433/humworld?schema=public'
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
node dist/main.js
```

- Swagger: <http://localhost:3000/api/docs>
- API: <http://localhost:3000/api/v1>

## Calidad

- Cobertura global mínima contractual: **80 %**.
- El PR #29 reportó **343/343 tests**.
- Cobertura del incremento: Statements **97.92 %**, Branches **92.57 %**, Functions **98.33 %** y Lines **97.86 %**.
- El workflow post-merge de `main` finalizó correctamente.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Registros de decisiones arquitectónicas](docs/adr/)
- [Planificación](docs/planificacion/)
- [Trazabilidad de requisitos](docs/requisitos/)
- [OpenSpec](openspec/)
