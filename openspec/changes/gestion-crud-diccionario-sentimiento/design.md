## Context

HU-17 parte de `origin/main` en `704864488f742e666f6a7a3e6de0b3480add8374`. Ese estado no tiene módulo `dictionary` ni entidad Prisma para términos ponderados. La API ya usa NestJS, DTO validados, Swagger, servicios y repositorios Prisma. PR #40 (HU-14) y PR #41 (HU-16) siguen abiertas; ninguna se mezcla en esta propuesta, pero la implementación deberá actualizarse desde `main` si se integran primero.

Aplican [ADR-002](../../../docs/adr/ADR-002-stack-node-nest-prisma-jest.md), [ADR-004](../../../docs/adr/ADR-004-monolito-modular-y-separacion-de-responsabilidades.md) y [ADR-005](../../../docs/adr/ADR-005-estrategia-combinada-de-pruebas.md). ADR-003 se conserva porque no se modifica captura ni scheduling. No se requiere un ADR nuevo: el módulo `dictionary` ya aparece como límite funcional en `docs/architecture.md` y usa el stack aprobado.

```text
HTTP /api/v1/dictionary
          |
          v
 DictionaryController -> DictionaryService
                              |
                              v
                   DictionaryRepositoryPort
                              |
                              v
                 Prisma / PostgreSQL 16

 Sentiment (HU-05) -> DictionaryReaderPort
                              |
                              v
                   mismo repositorio, solo lectura
```

## Goals / Non-Goals

**Goals:**

- Fijar una entidad mínima, normalizada y persistente para términos o frases ponderadas.
- Completar creación, listado, detalle, actualización parcial y eliminación física con errores HTTP claros.
- Proteger invariantes mediante validación de servicio y restricciones PostgreSQL.
- Proporcionar a HU-05 una lectura inmutable sin acoplarla al CRUD, Nest HTTP o Prisma.
- Mantener OpenAPI y pruebas sincronizados.

**Non-Goals:**

- Añadir autenticación, autorización, UI, auditoría o historial.
- Elegir contenido editorial, importar diccionarios o crear seeds.
- Implementar el algoritmo de sentimiento o persistir resultados en noticias.
- Añadir paginación, filtros, búsquedas, borrado lógico o restauración.

## Decision Status

| Decisión | Estado | Fundamento |
| --- | --- | --- |
| Entidad con `id`, `term`, `language` y `weight` | Aprobada por el encargo Sprint 3 | Contrato MVP indicado |
| Idiomas `es` y `en`, peso entero `[-5, 5]` | Aprobada por el encargo Sprint 3 | Contrato MVP indicado |
| PostgreSQL 16, Prisma 6, NestJS 10.4 y Jest 29 | Aprobada por arquitectura/ADR | Baseline vigente |
| Normalización canónica conservando diacríticos | Propuesta para revisión | Evita duplicados técnicos sin conflar `sí`/`si` |
| Unicidad por idioma y término | Propuesta para revisión | Permite vocabularios distintos y evita doble peso ambiguo |
| PATCH parcial y DELETE físico | Propuesta para revisión | CRUD mínimo sin historial no solicitado |
| CRUD sin autenticación inventada | Restricción de alcance | El producto aún no tiene seguridad aprobada |
| Puerto interno de lectura por idioma | Propuesta coordinada con HU-05 | Separa análisis de HTTP y Prisma |
| Diccionario vacío sin seed | Restricción explícita | El contenido requiere revisión humana |

La revisión humana de estos artefactos debe aceptar expresamente las decisiones propuestas y el riesgo temporal de exponer operaciones administrativas dentro del perímetro actual. Si se exige autorización antes del CRUD, se necesita otra capacidad y el `apply` de HU-17 debe detenerse.

## Decisions

### Modelo mínimo y restricciones reales

El estado objetivo de Prisma es conceptualmente:

```text
DictionaryEntry
- id: String, UUID estable
- term: String, forma canónica
- language: DictionaryLanguage(es, en)
- weight: Int, -5..5
- unique(language, term)
```

No se añaden timestamps porque la historia no pide auditoría y ningún comportamiento los consume. La migración añadirá un enum o restricción equivalente para `es/en`, una restricción `CHECK` de peso y una restricción de longitud canónica entre 1 y 200 caracteres, además de la unicidad compuesta. Prisma valida la forma habitual; PostgreSQL conserva las invariantes frente a carreras o escrituras ajenas al servicio.

La migración se creará durante `apply`, después de actualizar la rama desde el `main` vigente. No se fija ahora un timestamp porque HU-14 y HU-16 pueden incorporar migraciones antes. No se editará ninguna migración histórica.

### Una sola forma canónica almacenada

El normalizador recibe el término y el idioma:

1. aplica Unicode NFKC;
2. convierte a minúsculas mediante el locale del idioma (`es` o `en`);
3. sustituye cada secuencia que no sea letra ni número Unicode por un espacio;
4. colapsa espacios y aplica `trim`;
5. conserva marcas diacríticas y letras normalizadas.

La API devuelve y almacena esa forma canónica en `term`; no mantiene una segunda variante de presentación que pueda divergir. Se admiten una o varias palabras. Una forma vacía o superior a 200 caracteres Unicode se rechaza. El mismo normalizador deberá ser consumido por HU-05 para que escritura y matching compartan semántica.

Se descarta eliminar diacríticos: en español conflaría formas con significados distintos. También se descartan stemming, lematización, fuzzy matching y traducción porque pertenecen al análisis, no al CRUD, y añadirían reglas no aprobadas.

### API mínima

| Operación | Endpoint | Éxito | Errores de dominio |
| --- | --- | --- | --- |
| Crear | `POST /api/v1/dictionary` | `201` + entrada | `400`, `409`, `500` |
| Listar | `GET /api/v1/dictionary` | `200` + arreglo | `500` |
| Detalle | `GET /api/v1/dictionary/:id` | `200` + entrada | `400`, `404`, `500` |
| Actualizar | `PATCH /api/v1/dictionary/:id` | `200` + entrada | `400`, `404`, `409`, `500` |
| Eliminar | `DELETE /api/v1/dictionary/:id` | `204` sin cuerpo | `400`, `404`, `500` |

POST acepta `{ term, language, weight }`; el whitelist vigente descarta propiedades ajenas y estas no se persisten ni se devuelven. PATCH acepta cualquiera de esos campos y exige al menos uno después del whitelist. PATCH calcula la entidad candidata completa, normaliza y valida antes de escribir; el repositorio debe realizar una sola actualización. No se añade PUT porque no existe una diferencia funcional aprobada que justifique dos mecanismos de actualización.

El listado deliberadamente no pagina ni filtra. Devuelve todas las entradas en orden `language ASC`, `term ASC`, `id ASC`. Una historia posterior podrá añadir consultas sin modificar este contrato base.

### Duplicados y concurrencia

La clave funcional es `(language, term canónico)`. El servicio puede comprobarla para producir un error claro, pero la restricción única de PostgreSQL es la defensa definitiva. El adaptador Prisma traducirá la colisión concurrente conocida a un conflicto de dominio y el controller a `409`.

PATCH excluye el propio identificador al comprobar duplicados. Cualquier fallo conserva la fila anterior. Una misma cadena en `es` y `en` es válida porque cada análisis leerá exclusivamente el idioma solicitado.

### Eliminación y efecto sobre análisis

DELETE es físico. No existe historial, seed ni relación desde noticias en HU-17. Una eliminación modifica los snapshots posteriores y no muta uno ya entregado. HU-06 deberá persistir resultados sin FK hacia entradas vivas, de modo que eliminar vocabulario no invalide análisis históricos. Si se requiere auditoría o reproducibilidad editorial, deberá aprobarse versionado en otra historia.

### Contratos separados de lectura y escritura

`DictionaryRepositoryPort` encapsulará CRUD para `DictionaryService`. `DictionaryReaderPort` expondrá solo `listByLanguage(language)` y una proyección inmutable `{ id, term, language, weight }`. La implementación Prisma puede satisfacer ambos tokens sin que HU-05 vea operaciones de escritura.

No habrá caché en el MVP. Cada análisis obtiene un snapshot al empezar; una mutación completada se observa en la siguiente lectura. Esto evita definir invalidación y hace verificable el comportamiento cuando cambia una entrada.

### Límite de seguridad

“Administrador” es el actor narrativo de la Issue #18, pero no existe identidad autenticada en el repositorio. HU-17 no añadirá un header secreto, API key codificada, rol simulado ni guard permisivo. Swagger indicará que la autorización administrativa está pendiente. En despliegues reales, el perímetro de red deberá limitar estas rutas hasta que exista una historia de seguridad; esa medida operacional no se implementa aquí.

### Composición y dependencias

`DictionaryModule` registrará el servicio y los dos puertos y será importado por `AppModule`. HU-05 podrá importar el módulo o el token de lectura una vez integrada HU-17. No se modifica `NewsModule`, `CaptureModule`, `NewsService`, clasificación IPTC ni los contratos RSS.

No se añade ninguna dependencia. La normalización usa primitivas Unicode de Node 24; validación, Swagger, Prisma y Jest ya existen.

## Files Expected During Implementation

**Nuevos previsibles:**

- `backend/src/dictionary/dictionary.module.ts`
- `backend/src/dictionary/controllers/dictionary.controller.ts`
- `backend/src/dictionary/services/dictionary.service.ts`
- `backend/src/dictionary/domain/dictionary-entry.ts`
- `backend/src/dictionary/domain/dictionary-term-normalizer.ts`
- `backend/src/dictionary/ports/dictionary-repository.port.ts`
- `backend/src/dictionary/ports/dictionary-reader.port.ts`
- `backend/src/dictionary/repositories/prisma-dictionary.repository.ts`
- `backend/src/dictionary/dto/create-dictionary-entry.dto.ts`
- `backend/src/dictionary/dto/update-dictionary-entry.dto.ts`
- `backend/src/dictionary/dto/dictionary-entry-response.dto.ts`
- `backend/src/dictionary/errors/**`
- `backend/prisma/migrations/<timestamp>_add_dictionary_entries/migration.sql`
- `backend/test/dictionary/**`

**Modificados previsibles:**

- `backend/prisma/schema.prisma`
- `backend/src/app.module.ts`
- `docs/openapi.json`

No se prevén cambios en `backend/src/news/**`, `backend/src/capture/**`, frontend, dependencias, arquitectura ni ADR.

## Test Strategy

- **Unitarias de dominio:** NFKC, minúsculas por idioma, puntuación, espacios, conservación de diacríticos, vacío, longitud, idiomas y rango/entero del peso.
- **Servicio:** crear, listar, detalle, PATCH parcial, DELETE, orden, duplicados, colisión al cambiar idioma/término y propagación controlada de fallos.
- **Controller/DTO:** códigos `201/200/204/400/404/409/500`, cuerpo exacto, UUID, PATCH vacío y Swagger.
- **PostgreSQL 16 real:** migración vacía y sobre esquema vigente, enum/restricciones, unicidad concurrente, CRUD, orden y cero filas iniciales.
- **E2E:** cinco rutas, casos de éxito y error, persistencia real, OpenAPI y ausencia de autenticación ficticia.
- **Puerto HU-05:** filtro por idioma, snapshot inmutable, orden estable y lectura posterior a una mutación.
- **Regresión:** suite completa, build, cobertura global mínima del 80 %, Prisma validate/generate, OpenSpec strict y `git diff --check`.

## Risks / Trade-offs

- **CRUD administrativo sin autorización.** Es una limitación real del producto. Se documenta y no se oculta con controles ficticios; aceptar exposición fuera de un perímetro restringido requiere una historia de seguridad.
- **Sin historial editorial.** DELETE y PATCH cambian análisis futuros y no permiten reproducir qué diccionario produjo un resultado. HU-06 deberá decidir si necesita versión o snapshot antes de prometer trazabilidad histórica.
- **Diccionario vacío.** Hasta que una persona cargue contenido revisado, HU-05 devolverá cero coincidencias. Es preferible a inventar un seed.
- **Conflictos de migración.** HU-14, HU-16 y HU-17 añaden migraciones. Se mitiga sincronizando desde `main`, creando un timestamp posterior y probando tanto base vacía como actualización.
- **Tamaño futuro.** El listado sin paginación es adecuado al MVP pero no escala indefinidamente. Una necesidad real deberá ampliar el contrato mediante otro cambio.

## Migration Plan

1. Antes de `apply`, actualizar referencias y reconciliar la rama con el `main` vigente, preservando migraciones HU-14/HU-16 si ya están integradas.
2. Crear el enum/modelo, las restricciones y la migración aditiva sin seeds ni cambios históricos.
3. Aplicar todas las migraciones sobre PostgreSQL 16 vacío y sobre una base con el esquema anterior.
4. Demostrar que tablas y datos de RSS, News, continente y temas IPTC —cuando existan— permanecen intactos.
5. Validar que el diccionario nace vacío y que un rollback transaccional conserva el estado anterior ante conflicto.

## Open Questions for Human Review

La implementación puede autorizarse en una única revisión si el equipo acepta:

1. normalización NFKC con puntuación como separador y diacríticos conservados;
2. máximo de 200 caracteres Unicode para la forma canónica;
3. unicidad `(language, term)` y peso cero permitido;
4. PATCH como única actualización y DELETE físico;
5. CRUD no autenticado por ausencia de una capacidad de seguridad, con el riesgo documentado;
6. ausencia total de seed, auditoría, versionado, filtros y paginación.
