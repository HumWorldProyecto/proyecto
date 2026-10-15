## Context

La motivación y el alcance funcional se describen en [proposal.md](./proposal.md); los comportamientos verificables están en [spec.md](./specs/carga-inicial-fuentes-rss-continente/spec.md).

Actualmente `RssSource` identifica cada fuente por una URL única y conserva `id`, `active` y sus relaciones con `News`. No existe un atributo geográfico. El CRUD administrativo normaliza y valida URLs, mientras que `SourceRegistryPort` expone a los casos de captura únicamente `{ id, url }`. HU-14 debe añadir una clasificación continental opcional y una carga inicial reproducible sin ampliar esos contratos.

La lista definitiva de feeds fue aprobada el 2026-10-01 después de completar la curación descrita en este diseño. La implementación del manifiesto queda habilitada únicamente para ese dataset; cualquier sustitución o incorporación futura requerirá una nueva revisión explícita y no se inferirá durante la implementación.

ADR aplicables:

- **ADR-002 — PostgreSQL + Prisma ORM**: el nuevo enum, la columna nullable y la migración se modelarán con Prisma; la carga persistirá mediante `PrismaClient` dentro de una transacción.
- **ADR-003 — Fuentes RSS sin web scraping**: cada entrada aprobada deberá ser un feed RSS real y el seed no descargará feeds ni páginas. HU-14 no modifica el fetcher ni el parser de captura.
- **ADR-004 — Monolito modular**: los artefactos del seed residirán bajo el módulo `sources`; no se crea un servicio desplegable separado ni se conecta el seed al arranque de NestJS.
- **ADR-005 — REST + JSON + OpenAPI**: no se añade ni modifica ningún endpoint, DTO, filtro o esquema OpenAPI.

No hay contradicción con decisiones aceptadas ni se propone cambiar el estado de ADR-006. HU-14 no introduce una decisión arquitectónica nueva que requiera otro ADR.

## Goals / Non-Goals

**Goals:**

- Evolucionar el esquema de forma compatible con fuentes existentes mediante `continent` nullable.
- Representar el conjunto cerrado de continentes aprobado por producto sin añadir entidades geográficas prematuras.
- Proporcionar una carga explícita, offline, idempotente y atómica que reutilice la normalización de URLs existente.
- Mantener estables los límites del módulo `sources`, el CRUD público y los contratos de captura.
- Hacer demostrables mediante pruebas la migración, la validación del manifiesto, la idempotencia, la preservación de estado y el rollback.

**Non-Goals:**

- Añadir país, región, Antártida, `Channel`, `Media` o una tabla geográfica.
- Exponer continente en REST/OpenAPI o incorporarlo a `SourceRegistryPort`.
- Copiar el continente a `News` o cambiar persistencia, deduplicación, scheduling, fetch o parsing.
- Consultar Internet desde migraciones, seed, build o pruebas.
- Elegir las URLs de los feeds antes de su aprobación humana.
- Añadir dependencias, scripts de `package.json` o ejecución automática durante el arranque.

## Decisions

### 0. Dataset editorial aprobado y evidencia de curación

El 2026-10-01 quedó aprobado el siguiente conjunto inicial, con una fuente por cada continente admitido:

| Continente | URL aprobada |
| --- | --- |
| `AFRICA` | `https://africanews.com/feed/rss` |
| `ASIA` | `https://www.straitstimes.com/news/asia/rss.xml` |
| `EUROPE` | `https://www.euronews.com/rss?format=mrss&level=theme&name=news` |
| `NORTH_AMERICA` | `https://moxie.foxnews.com/google-publisher/latest.xml` |
| `SOUTH_AMERICA` | `https://en.mercopress.com/rss/` |
| `OCEANIA` | `https://www.theguardian.com/australia-news/rss` |

Las seis URLs fueron verificadas en un proceso controlado con el comportamiento real de producción de `HttpRssFetcher` y `RssOnlyParser`, incluyendo la normalización, resolución de destino, política SSRF, fijación del Agent, redirecciones seguras y validación de raíz RSS. La selección no usa scraping.

Esta validación de red pertenece a la curación previa del dataset y no se traslada al seed. El manifiesto versionará las URL aprobadas y el seed será completamente offline: normalizará y validará su estructura local, pero no volverá a consultarlas por Internet. Cuando una de estas fuentes sea utilizada por la captura normal, `HttpRssFetcher` volverá a aplicar DNS, política SSRF, fijación de destino, redirecciones y descarga, y `RssOnlyParser` validará e interpretará el documento recibido en esa ejecución.

### 1. El continente será un enum Prisma nullable en `RssSource`

El esquema previsto es:

```prisma
enum Continent {
  AFRICA
  ASIA
  EUROPE
  NORTH_AMERICA
  SOUTH_AMERICA
  OCEANIA
}

model RssSource {
  id        String     @id @default(uuid())
  url       String     @unique
  active    Boolean    @default(true)
  continent Continent?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  news News[]

  @@map("rss_sources")
}
```

La nulabilidad permite aplicar la migración sin atribuir geografía a fuentes preexistentes y mantiene válido el alta administrativa basada únicamente en URL. Un enum evita valores libres y materializa exactamente la taxonomía aprobada.

Alternativas descartadas:

- Una tabla `Continent`: añade identidad, CRUD y relaciones que HU-14 no necesita para un conjunto cerrado.
- `String?`: admitiría valores fuera de la taxonomía y trasladaría la integridad a lógica dispersa.
- Un campo obligatorio con backfill: obligaría a inventar datos para registros existentes.
- Copiar el valor a `News`: duplicaría información y abriría problemas de consistencia; una futura consulta geográfica podrá usar `News.sourceId -> RssSource.continent`.

### 2. La evolución se hará con una migración nueva, aditiva y sin backfill

Se generará una migración Prisma nueva que cree el enum y añada `rss_sources.continent` como nullable. No se modificarán migraciones históricas. La migración no incluirá DML, URLs ni llamadas externas y deberá funcionar tanto sobre una base vacía como sobre una base con fuentes y noticias existentes.

La ausencia de índice adicional es intencional: HU-14 no introduce consultas ni filtros por continente. Si una historia posterior demuestra esa necesidad, el índice se evaluará en su propio cambio.

Alternativa descartada: incluir la carga como SQL dentro de la migración. Mezclaría evolución estructural con un dataset sujeto a aprobación editorial, dificultaría la repetición y acoplaría la migración a contenido variable.

### 3. El dataset será un manifiesto TypeScript estático y versionado

El manifiesto previsto estará en `backend/src/sources/seed/initial-rss-sources.manifest.ts` y declarará entradas inmutables con forma `{ url, continent }`. Importará el tipo `Continent` generado por Prisma para evitar duplicar el conjunto de valores. Se poblará exclusivamente con el dataset aprobado en la decisión 0.

Antes de persistir, un validador puro en `backend/src/sources/seed/initial-rss-sources.validator.ts`:

1. comprobará que cada entrada incluya URL y continente admitido;
2. normalizará cada URL con `SourceUrlNormalizer`;
3. rechazará duplicados después de normalizar;
4. comprobará que los seis continentes estén representados al menos una vez; y
5. devolverá una colección normalizada e inmutable para la fase transaccional.

La validación completa ocurrirá antes de abrir la transacción, de modo que un manifiesto inválido no cause escrituras.

Durante la curación humana, cada URL candidata deberá verificarse como RSS público real —no Atom—, accesible por HTTP o HTTPS sin autenticación, preferentemente HTTPS, estable/canónica, compatible con las políticas SSRF existentes y parseable por `RssOnlyParser`. El continente se justificará por el origen editorial del medio, no por la ubicación del hosting, y no se usará scraping. Esa comprobación editorial puede usar los componentes existentes en un proceso controlado, pero sus resultados se versionarán como decisión de datos; el seed nunca repetirá la comprobación por red.

Alternativas descartadas:

- JSON/YAML externo: requeriría validación de tipos y resolución/copia de recursos en build; TypeScript ya forma parte del toolchain.
- Descargar una lista remota: impediría ejecuciones offline y reproducibles.
- Validar feeds en cada seed: introduciría fallos por red y mezclaría curación con persistencia.

### 4. La carga será un ejecutable explícito compilado con el toolchain existente

`backend/src/sources/seed/initial-rss-sources.seeder.ts` coordinará validación y persistencia. `backend/src/sources/seed/load-initial-rss-sources.ts` será un entry point pequeño que construya `PrismaClient`, invoque el seeder, informe un resumen no sensible, cierre el cliente y finalice con código distinto de cero ante un error.

El operador ejecutará primero las migraciones, compilará con `npm run build` y luego invocará:

```text
node dist/sources/seed/load-initial-rss-sources.js
```

No se añadirá un script a `package.json`, no se usará `prisma db seed`, `ts-node` o `tsx`, y el entry point no se importará desde `main.ts` ni `SourcesModule`. De este modo el arranque de NestJS queda libre de efectos laterales.

El acceso directo a `PrismaClient` se limita a esta herramienta de infraestructura de datos. Los controladores y servicios de aplicación continúan pasando por sus puertos y repositorios. Ampliar `SourceRepositoryPort` solo para una operación administrativa offline expondría semántica de seed al dominio operativo y se descarta por acoplamiento innecesario.

### 5. La persistencia usará una única transacción con política de conflicto estricta

Después de validar todo el manifiesto, el seeder ejecutará una única transacción interactiva de Prisma. Para cada URL normalizada, en orden determinista:

- si no existe, creará `RssSource` con `active: true` y el continente del manifiesto;
- si existe con `continent: null`, actualizará solo `continent`;
- si existe con el mismo continente, no escribirá;
- si existe con otro continente, lanzará un error de conflicto controlado y abortará la transacción completa.

Nunca se actualizarán `id` ni `active`; en particular, una fuente inactiva permanecerá inactiva. La restricción única vigente sobre `url` seguirá siendo la defensa final ante concurrencia. Cualquier excepción revierte la carga completa; un error de concurrencia o serialización se reportará y el operador podrá repetir la operación, sin resolución automática de conflictos semánticos.

Se prefiere una sola transacción frente a upserts independientes porque HU-14 exige que un conflicto tardío no deje una cobertura parcial. Se descarta también un `upsert` que sobrescriba continente o active, porque ocultaría conflictos y podría reactivar fuentes deshabilitadas.

### 6. Los contratos REST, OpenAPI y de captura no cambiarán

Los DTO de `sources`, `SourcesController`, `SourcesService`, `SourceRepositoryPort` y `SourceRegistryPort` conservarán sus contratos actuales. El repositorio podrá seguir proyectando los campos vigentes e ignorar `continent` en las respuestas. `EligibleSource` permanecerá como `{ id, url }`.

El seed no reutiliza `SourceAccessibilityChecker` en tiempo de ejecución porque ese componente realiza comprobaciones de destino y red; sí reutiliza `SourceUrlNormalizer`, que aplica la representación URL ya usada por el módulo. No se modifican `capture`, el scheduler, `RssOnlyParser`, `HttpRssFetcher` ni la persistencia de `News`.

### 7. La verificación combinará pruebas unitarias, de integración y regresión

Se prevén estos niveles:

- Pruebas unitarias del validador: taxonomía, cobertura completa, URL inválida, credenciales/protocolo prohibido, normalización y duplicados normalizados.
- Pruebas unitarias del seeder: creación, enriquecimiento de `null`, no-op con mismo continente, preservación de `id`/`active`, fuente inactiva, conflicto controlado y propagación de fallos.
- Pruebas de integración con PostgreSQL real: migración en base vacía; migración conservando fuentes/noticias existentes; primera carga; segunda carga idempotente; rollback total ante conflicto o fallo tardío; restricción única.
- Regresión del CRUD de fuentes y `SourceRegistryPort`, comprobando que no aparece continente en contratos y que las instantáneas siguen siendo `{ id, url }`.
- Regresión de HU-01, HU-02 y HU-03 para confirmar que captura y persistencia continúan sin dependencia geográfica.
- Validaciones de calidad: OpenSpec strict, `prisma validate`, `prisma generate`, build, Jest completo, cobertura global mínima de 80 % y `git diff --check`.

Las pruebas usarán manifiestos de fixture locales; no accederán a Internet ni dependerán de que los feeds aprobados estén disponibles en ese momento.

### 8. Archivos previstos

Nuevos:

- `backend/prisma/migrations/<timestamp>_add_rss_source_continent/migration.sql`
- `backend/src/sources/seed/initial-rss-sources.manifest.ts`
- `backend/src/sources/seed/initial-rss-sources.validator.ts`
- `backend/src/sources/seed/initial-rss-sources.seeder.ts`
- `backend/src/sources/seed/load-initial-rss-sources.ts`
- `backend/test/sources/initial-rss-sources.manifest.spec.ts`
- `backend/test/sources/initial-rss-sources.seeder.spec.ts`
- `backend/test/sources/initial-rss-sources.seeder.integration.spec.ts`

Modificados:

- `backend/prisma/schema.prisma`

Los nombres finales de la migración conservarán el timestamp generado por Prisma. No se prevén cambios en `package.json`, `package-lock.json`, módulos NestJS, DTO, controladores, captura, `News`, workflows ni documentación OpenAPI.

## Risks / Trade-offs

- **[Las URLs aprobadas pueden degradarse después de ser curadas]** → La selección se valida antes de versionarla, pero el seed permanece offline; la disponibilidad continua corresponde a captura y a futuros procesos de mantenimiento.
- **[Una clasificación previa puede discrepar del manifiesto]** → Se aborta toda la carga y se exige revisión humana; nunca se reasigna silenciosamente.
- **[Una transacción única mantiene bloqueos más tiempo que escrituras independientes]** → El dataset inicial será pequeño y la atomicidad pesa más; la validación costosa se realiza antes de abrirla.
- **[La carga directa con Prisma es específica de infraestructura]** → Se aísla bajo `sources/seed`, no se expone a la aplicación y se cubre con integración real.
- **[El enum cerrado exige una futura migración si cambia la taxonomía]** → Esa rigidez es deliberada para proteger el vocabulario aprobado; cualquier ampliación requerirá decisión de producto y un cambio separado.
- **[El comando requiere compilar antes de ejecutar]** → Se documentará el orden exacto y la prueba de integración verificará el artefacto compilable, sin añadir herramientas o dependencias.

## Migration Plan

1. Obtener aprobación humana de la lista final de URLs y conservar evidencia de que cada una cumple los criterios RSS, origen editorial, acceso y seguridad.
2. Añadir el enum y `RssSource.continent?` al esquema; generar una migración nueva y revisar que sea exclusivamente aditiva.
3. Probar la migración contra una base vacía y contra una base con fuentes y noticias anteriores, verificando que sus continentes quedan en `null`.
4. Implementar y probar manifiesto, validador, seeder y entry point sin conectarlos al arranque.
5. Ejecutar `prisma migrate deploy` mediante el procedimiento habitual del entorno.
6. Compilar el backend y ejecutar intencionalmente el loader una vez; revisar el resumen y la cobertura continental.
7. Repetir el loader para demostrar idempotencia y verificar que no cambian identificadores ni estados.

Antes de ejecutar el seed, el rollback consiste en revertir o corregir la migración según el procedimiento de despliegue aprobado. Después de una carga completada no se borrarán automáticamente fuentes: cualquier reversión de datos requiere identificar qué registros preexistían y una operación humana separada. Una carga fallida no necesita compensación porque la transacción revierte todas sus escrituras.
