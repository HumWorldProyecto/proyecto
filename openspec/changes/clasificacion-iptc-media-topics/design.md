## Context

La Issue #17 solo fija dos resultados observables: clasificar mediante IPTC Media Topics y hacer que la clasificación esté disponible junto con la noticia. En `origin/main` (`704864488f742e666f6a7a3e6de0b3480add8374`), `NewsService.saveCapturedItems` resuelve identidad y delega el upsert, `PrismaNewsRepository` crea la noticia una vez y no modifica duplicados, y `GET /api/v1/news` devuelve los metadatos RSS sin clasificación. Los flujos manual, múltiple y automático comparten `SourceCaptureService` y `CaptureOutputPort`.

La arquitectura ya reconoce `classification` como límite funcional y exige API → servicios → repositorios → PostgreSQL. Aplican [ADR-002](../../../docs/adr/ADR-002-stack-node-nest-prisma-jest.md), [ADR-003](../../../docs/adr/ADR-003-captura-rss-y-scheduling.md), [ADR-004](../../../docs/adr/ADR-004-monolito-modular-y-separacion-de-responsabilidades.md) y [ADR-005](../../../docs/adr/ADR-005-estrategia-combinada-de-pruebas.md). ADR-006 permanece propuesto y no autoriza cambiar NestJS 10.4.

## Official IPTC Data

IPTC define Media Topics como su taxonomía principal de materias para texto, con más de 1.200 términos, hasta cinco niveles y 17 conceptos raíz. Los NewsCodes usan identificadores independientes del idioma y permiten etiquetas traducidas. La publicación oficial consultada declara `dateReleased: 2026-07-02T12:00:00+00:00` y licencia CC BY 4.0.

Fuentes primarias:

- [IPTC Media Topics](https://iptc.org/standards/media-topics/)
- [IPTC Controlled Vocabulary — JSON-LD en español](https://cv.iptc.org/newscodes/mediatopic/?format=json&lang=es)
- [IPTC NewsCodes Guidelines](https://www.iptc.org/std/NewsCodes/guidelines/)

El alcance inicial recomendado usa exactamente estos datos oficiales:

| QCode | Etiqueta oficial en español | URI canónica |
| --- | --- | --- |
| `medtop:01000000` | Artes, cultura, entretenimiento y medios | `http://cv.iptc.org/newscodes/mediatopic/01000000` |
| `medtop:02000000` | Policía y justicia | `http://cv.iptc.org/newscodes/mediatopic/02000000` |
| `medtop:03000000` | Catástrofes y accidentes | `http://cv.iptc.org/newscodes/mediatopic/03000000` |
| `medtop:04000000` | Economía, negocios y finanzas | `http://cv.iptc.org/newscodes/mediatopic/04000000` |
| `medtop:05000000` | Educación | `http://cv.iptc.org/newscodes/mediatopic/05000000` |
| `medtop:06000000` | Medio ambiente | `http://cv.iptc.org/newscodes/mediatopic/06000000` |
| `medtop:07000000` | Salud | `http://cv.iptc.org/newscodes/mediatopic/07000000` |
| `medtop:08000000` | Interés humano, animales, insólito | `http://cv.iptc.org/newscodes/mediatopic/08000000` |
| `medtop:09000000` | Mano de obra | `http://cv.iptc.org/newscodes/mediatopic/09000000` |
| `medtop:10000000` | Estilo de vida y tiempo libre | `http://cv.iptc.org/newscodes/mediatopic/10000000` |
| `medtop:11000000` | Política | `http://cv.iptc.org/newscodes/mediatopic/11000000` |
| `medtop:12000000` | Religión y culto | `http://cv.iptc.org/newscodes/mediatopic/12000000` |
| `medtop:13000000` | Ciencia y tecnología | `http://cv.iptc.org/newscodes/mediatopic/13000000` |
| `medtop:14000000` | Sociedad | `http://cv.iptc.org/newscodes/mediatopic/14000000` |
| `medtop:15000000` | Deporte | `http://cv.iptc.org/newscodes/mediatopic/15000000` |
| `medtop:16000000` | Conflicto, guerra y paz | `http://cv.iptc.org/newscodes/mediatopic/16000000` |
| `medtop:17000000` | Meteorología | `http://cv.iptc.org/newscodes/mediatopic/17000000` |

IPTC proporciona la taxonomía, sus significados y traducciones; no define qué palabras de una noticia de HumWorld deben disparar cada tema. El contrato propio de HumWorld queda definido en `editorial-manifest.md`, separado de los datos oficiales.

## Goals / Non-Goals

**Goals:**

- Añadir clasificación automática determinista a noticias nuevas sin interrumpir la captura ni añadir integraciones.
- Guardar exclusivamente QCodes oficiales de los 17 temas raíz y resolver URI/etiqueta desde un catálogo local inmutable.
- Devolver de cero a varios temas junto con cada noticia mediante el endpoint existente.
- Mantener resultados reproducibles y verificables con PostgreSQL 16 real.

**Non-Goals:**

- Prometer precisión semántica equivalente a un modelo NLP.
- Inferir temas desde continente, fuente, GUID, enlace o fecha.
- Añadir clasificación manual, confianza, tema principal, filtros, analítica o backfill.
- Descargar la taxonomía desde IPTC en tiempo de ejecución.

## Decision Status

| Decisión | Estado | Fundamento |
| --- | --- | --- |
| Usar IPTC Media Topics y devolver la clasificación junto con la noticia | Aprobada por Issue #17 | Criterios de aceptación existentes |
| Mantener stack, capas y captura RSS actuales | Aprobada por arquitectura/ADR | Restricción del proyecto |
| Usar los 17 conceptos raíz de la publicación IPTC 2026-07-02 | Aprobada | Alcance confirmado para HU-16 |
| Clasificar automáticamente con reglas internas sobre título y descripción | Aprobada | Solución determinista y sin dependencias |
| Admitir varios temas y representar ausencia con `[]` | Aprobada | Contrato funcional confirmado |
| Clasificar solo noticias nuevas, sin backfill ni reclasificación de duplicados | Aprobada | Alcance confirmado para HU-16 |
| Soporte español/inglés y manifiesto exacto de términos/frases | Aprobada y definida | Contrato v1 en `editorial-manifest.md` |

La implementación queda autorizable con este contrato. Cualquier cambio posterior hacia clasificación manual, taxonomía completa o un clasificador externo exigirá actualizar los artefactos antes de codificar; una dependencia o integración nueva requerirá además la aprobación técnica indicada por la arquitectura.

## Decisions

### Catálogo local oficial y sin red en ejecución (APROBADA)

`backend/src/classification/catalog/iptc-media-topics.ts` contendrá los 17 QCodes, URI y etiquetas anteriores, la fecha de publicación y la atribución CC BY 4.0. El QCode será la identidad persistida. La URI se conservará exactamente como la publica IPTC, incluido el esquema `http` de la URI canónica; no se crearán códigos bajo el prefijo reservado `medtop:`.

Una actualización futura de IPTC se tratará como otro cambio revisable. HU-16 no consultará IPTC en cada captura ni cambiará resultados por una actualización remota no controlada.

### Clasificador automático determinista y sustituible (APROBADA)

El límite `classification` expondrá un `MediaTopicClassifierPort`. La implementación inicial será una función interna sin estado que reciba exclusivamente `title` y `description` y devuelva QCodes oficiales únicos en orden estable.

La política aprobada:

1. Clasificar título y descripción como dos campos independientes; un valor nulo se trata como texto vacío y ninguna frase puede cruzar el límite entre ambos.
2. Normalizar mayúsculas/minúsculas, diacríticos, HTML y separadores de cada campo solo para comparar; no modificar el contenido persistido.
3. Evaluar literalmente `editorial-manifest.md` versión 1, con todas las variantes escritas de forma explícita, sus disparadores españoles e ingleses y sus exclusiones locales por ocurrencia.
4. Combinar los QCodes obtenidos en ambos campos, asignar todos los temas aplicables, eliminar duplicados y ordenar por QCode, sin ranking ni confianza.
5. Devolver una colección vacía si ambos campos están vacíos o ninguna regla se cumple.

El matching se realiza por secuencias completas de tokens después de normalizar NFKD, diacríticos, mayúsculas, HTML, puntuación y espacios. Una exclusión anula solo la ocurrencia contenida en ella; cualquier otro disparador válido conserva el tema. No hay subcadenas, stemming, lematización, fuzzy matching, traducción, inferencia semántica, interpretación de negación ni umbrales. Los resultados se deduplican y ordenan por QCode. No se deducirán reglas de las etiquetas IPTC ni se agregarán palabras durante la codificación sin otro cambio revisado.

Se descartan para este incremento:

- La clasificación manual, porque exige un contrato de escritura, autorización y posiblemente frontend que Issue #17 no define.
- Un servicio externo o modelo NLP, porque introduce tecnología, dependencia, coste, credenciales, disponibilidad y tratamiento de datos no aprobados.

### Coordinación desde `NewsService` sin cambiar captura (APROBADA)

`NewsModule` importará `ClassificationModule` y `NewsService` dependerá del puerto del clasificador. Después de resolver la identidad y antes de llamar al repositorio, el servicio solicitará la clasificación del título y la descripción. `CaptureOutputPort`, `RssItem`, `NewsCaptureOutputAdapter`, `SourceCaptureService`, jobs y controladores de captura no cambiarán.

El `try/catch` del fallback envolverá únicamente la llamada al clasificador. Si esta falla, el servicio registrará un error sin contenido sensible y continuará la persistencia con cero temas. La llamada posterior al repositorio queda fuera de ese límite: cualquier error real de Prisma/PostgreSQL conserva el aislamiento por ítem y el logging de persistencia actuales, nunca se traduce a `[]` ni se registra como clasificación correcta. Así, un fallo de enriquecimiento no cambia el conteo, el estado ni la continuidad de las capturas manuales o automáticas y un fallo de datos no queda oculto.

### Persistencia aditiva en `News` (APROBADA)

El modelo `News` añadirá una colección no nula de QCodes, vacía por defecto. La migración añadirá una columna PostgreSQL `TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]` y una restricción que acepte únicamente los 17 QCodes oficiales. El servicio y el repositorio eliminarán duplicados y filtrarán defensivamente cualquier valor fuera del catálogo antes de escribir.

Se elige una colección en `News` porque HU-16 solo necesita 17 valores de referencia inmutables, no gestiona la taxonomía y no requiere consultar o editar entidades de temas. Esto evita tablas, seeds y loaders operativos adicionales. Si una historia futura incorpora niveles inferiores, administración o consultas complejas, deberá reevaluar el modelo.

La migración es aditiva: todas las noticias existentes quedan con `[]`. El upsert conserva `update: {}`; por ello una noticia duplicada mantiene su asignación original y no se reclasifica silenciosamente. No habrá backfill en HU-16.

### Contrato REST aditivo (APROBADA)

Cada `NewsResponseDto` añadirá:

```json
{
  "mediaTopics": [
    {
      "qcode": "medtop:11000000",
      "uri": "http://cv.iptc.org/newscodes/mediatopic/11000000",
      "label": "Política"
    }
  ]
}
```

El campo estará siempre presente y será `[]` para una noticia no clasificada. No se añade endpoint, parámetro, filtro ni operación de escritura. Los campos y códigos HTTP vigentes permanecen iguales y Swagger/OpenAPI documentará el objeto anidado.

## Files Expected During Implementation

**Nuevos:**

- `backend/src/classification/classification.module.ts`
- `backend/src/classification/catalog/iptc-media-topics.ts`
- `backend/src/classification/ports/media-topic-classifier.port.ts`
- `backend/src/classification/services/rule-based-media-topic-classifier.ts`
- `backend/src/classification/rules/media-topic-classification-rules.ts`
- `backend/src/classification/types/media-topic.ts`
- `backend/prisma/migrations/<timestamp>_add_news_media_topics/migration.sql`
- `backend/test/classification/**`

**Modificados:**

- `backend/prisma/schema.prisma`
- `backend/src/news/news.module.ts`
- `backend/src/news/services/news.service.ts`
- `backend/src/news/ports/news-repository.port.ts`
- `backend/src/news/repositories/prisma-news.repository.ts`
- `backend/src/news/types/news.ts`
- `backend/src/news/types/identified-captured-news-item.ts`
- `backend/src/news/dto/news-response.dto.ts`
- `backend/test/news/**`
- Pruebas de captura únicamente para demostrar que sus contratos y resultados no cambian.

No se prevén cambios en `backend/src/capture/**`, frontend, dependencias, `docs/architecture.md` ni ADR mientras se apruebe la alternativa recomendada.

## Test Strategy

- **Catálogo:** igualdad exacta contra los 17 QCodes, URI y etiquetas oficiales; unicidad; fecha de publicación y atribución.
- **Clasificador unitario:** los 34 ejemplos positivos y los 34 negativos de `editorial-manifest.md`, cada variante literal, disparador y exclusión, clasificación separada de título/descripción, unión posterior, normalización, texto vacío, múltiples temas, eliminación de duplicados, orden estable, determinismo y rechazo de códigos ajenos.
- **Servicio `news`:** clasificación antes de persistir, logging y persistencia con `[]` cuando no hay coincidencia o el clasificador falla, continuidad del lote y prueba separada que demuestra que un error real del repositorio no se convierte en fallback de clasificación.
- **Repositorio con PostgreSQL 16 real:** migración sobre base vacía y sobre esquema previo con noticias, default vacío, restricción de códigos, almacenamiento/lectura de múltiples QCodes, idempotencia y preservación de clasificación al repetir la identidad.
- **API/E2E:** `GET /api/v1/news` con uno, varios y cero temas; forma exacta del DTO/OpenAPI; campos existentes intactos.
- **Regresión de captura:** flujos automático, manual y múltiple, `CaptureOutputPort`, deduplicación y resultados de captura sin cambios.
- **Calidad:** OpenSpec strict, Prisma validate/generate, build, Jest completo, cobertura global mínima del 80 % y `git diff --check`.

## Risks / Trade-offs

- **Reglas léxicas con precisión limitada o sesgo lingüístico.** Mitigación: alcance lingüístico explícito, fixtures aprobados, reglas separadas y fallback vacío. Si la calidad requerida supera esta solución, detener `apply` y aprobar otra tecnología.
- **Falsos positivos por términos ambiguos.** Mitigación: priorizar frases y límites de palabra, exigir casos negativos y no asignar un tema por defecto.
- **Taxonomía oficial evoluciona.** Mitigación: snapshot local fechado, QCodes como identidad y actualización mediante cambio revisado.
- **Una noticia existente queda sin clasificación.** Mitigación: respuesta `[]` explícita y backfill fuera de HU-16; la revisión humana debe confirmar esta decisión.
- **Conflicto mecánico con HU-14.** Mitigación: actualizar desde `main` después del merge de PR #40, preservar `continent`, ordenar la nueva migración después de la de HU-14 y reconciliar `prisma-news.repository.integration.spec.ts`.

## Migration Plan

1. Antes de implementar, actualizar la rama HU-16 desde el `origin/main` vigente y comprobar si HU-14 ya fue integrada.
2. Añadir el campo con default vacío y la restricción de catálogo en una migración nueva, sin editar migraciones históricas.
3. Validar `prisma migrate deploy` sobre PostgreSQL 16 vacío y sobre una base con el esquema previo y noticias existentes.
4. Confirmar que IDs, metadatos, deduplicación y, si aplica, `RssSource.continent` se conservan.
5. No ejecutar backfill; las filas previas quedan con `[]`.

## Closed Editorial Decisions

No quedan preguntas editoriales abiertas para HU-16. `editorial-manifest.md` fija los dos idiomas, los disparadores, las exclusiones, los ejemplos verificables, el orden y el control de cambios. Se mantienen los 17 temas raíz, la clasificación automática y múltiple, `[]` sin coincidencias, ausencia de backfill y preservación de duplicados.
