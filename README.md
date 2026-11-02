# HumWorld — Equipo 5

## Objetivo

HumWorld captura noticias exclusivamente mediante fuentes RSS, guarda su análisis de sentimiento y permite explorar resultados geográficos, temporales y su evidencia.

## Equipo

- Benjamin Gallegos
- Eduardo Diaz
- Felipe Sanhueza
- Daniel Rossel
- Felipe Levi
- Tomas Heilenkotter

## Estado actual

Al 20 de octubre de 2026 están integradas 13/21 historias: Sprints 1, 2 y 3 completos. Sprint 3 se cerró mediante las PR [#42](https://github.com/HumWorldProyecto/proyecto/pull/42), [#43](https://github.com/HumWorldProyecto/proyecto/pull/43) y [#44](https://github.com/HumWorldProyecto/proyecto/pull/44), con CI posterior verde. El incremento Sprint 4 de esta rama reúne HU-08/09/11/12/13 y requiere revisión y fusión humanas.

Capacidades implementadas actualmente:

- Gestión CRUD y desactivación lógica/reactivación de fuentes RSS.
- Configuración global de periodicidad.
- Captura automática RSS.
- Actualización manual individual mediante `POST /api/v1/sources/:id/capture`.
- Actualización manual múltiple, carga inicial de fuentes por continente y clasificación IPTC Media Topics.
- Almacenamiento y deduplicación de noticias.
- Consulta de noticias mediante `GET /api/v1/news`.
- Documentación Swagger/OpenAPI.
- Persistencia PostgreSQL con Prisma.
- Pruebas automáticas e integración continua.
- Diccionario administrable, análisis español/inglés, análisis directo y persistencia del último sentimiento.
- En este incremento Sprint 4: consultas por mundo/continente/país, evolución, mapa, nube y ranking con evidencia guardada; interfaz React y asignación explícita de país de fuente.

HU-19/20/21 de caducidad y purgado siguen pendientes. Ver el [avance, calendario y plan](docs/planificacion/avance-2026-10-20.md). No se presenta Sprint 4 como Done antes de su integración.

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
- React, Vite, Leaflet y Chart.js; Vitest y React Testing Library.

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

Para explorar el dashboard, iniciar `npm ci` y `npm run dev` desde `frontend/` y abrir http://localhost:5173. Alternativa Docker completa y separada de la base habitual: [guía Sprint 4](docs/sprint4-dashboard.md).

## Calidad

- Cobertura global mínima contractual: **80 %**.
- Sprint 4: backend **728 pruebas / 73 suites**; cobertura 98,67 % statements, 94,15 % branches, 99,17 % functions y 98,60 % lines.
- Frontend: **16 pruebas**; cobertura 100 % statements/functions/lines y 92,85 % branches.
- Prisma y migraciones verificadas desde vacío y desde main con PostgreSQL 16. Contratos anteriores preservados.
- GitHub Actions comprueba backend, frontend y OpenSpec. La revisión y fusión deben ser humanas.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Registros de decisiones arquitectónicas](docs/adr/)
- [Planificación](docs/planificacion/)
- [Trazabilidad de requisitos](docs/requisitos/)
- [OpenSpec](openspec/)
# Práctica P12: acceso a fuentes RSS

Las operaciones de fuentes RSS requieren `X-API-Key`; consulta admite ambos perfiles y las escrituras requieren gestión. Incluye captura manual y geografía de fuentes. Antes de arrancar, define `HUMWORLD_API_KEY_READ` y `HUMWORLD_API_KEY_WRITE` con valores distintos; no hay claves predeterminadas. La web las recibe durante el uso y solo en memoria. Consulta [la guía P12](docs/practicas/P12-secretos-acceso-api.md) para configuración, permisos, Swagger, rotación y evidencia de CI. Las demás familias conservan sus contratos.
# Cierre y demo final

Caducidad, purga y medios se describen en [la guía de demo](docs/demo-final.md). El estado verificable de fechas e integración está en [el cierre Sprint 5](docs/planificacion/cierre-sprint5-2026-10-31.md) y el análisis real de calidad en [Sonar local](docs/calidad/sonar-sprint5.md). La rama probada no se declara Done antes de revisión e integración humanas.
