## Context

La motivación y el alcance funcional se describen en `proposal.md`; los comportamientos verificables están en `specs/gestion-crud-rss/spec.md`. El repositorio todavía no declara una pila tecnológica ni una implementación previa para el registro de fuentes RSS, por lo que este diseño introduce el primer modelo de datos y el primer punto de interacción directa de un administrador con HumWorld.

HU-01 y HU-02 ya consumen "el conjunto de fuentes registradas" mediante un límite abstracto sin contrato interno definitivo; este cambio cierra ese contrato. Ninguna de esas historias impone campos al modelo de la fuente: los "metadatos de fuente" que persiste HU-04 pertenecen al ítem RSS entregado por el feed, no a la entidad administrada aquí.

```text
Administrador
     |
     v
Casos de uso CRUD (crear / consultar / actualizar / desactivar / reactivar)
     |
     v
Registro de fuentes RSS (url, estado activo/inactivo, ...)
     |
     v
Límite abstracto: conjunto de fuentes registradas ACTIVAS
     |
     v
Consumido por HU-01 (captura automática) y HU-02 (actualización manual)
```

## Goals / Non-Goals

**Goals:**

- Definir el modelo mínimo de la entidad "fuente RSS" necesario para satisfacer los requisitos de `spec.md`.
- Definir el contrato interno definitivo del límite abstracto de "conjunto de fuentes registradas activas" que HU-01 y HU-02 dejaron pendiente.
- Mantener separada la validación de la URL (formato y accesibilidad) de la interpretación del feed (que pertenece a HU-01/HU-02).

**Non-Goals:**

- Diseñar la interfaz de entrada concreta (API, UI o CLI) para el administrador.
- Diseñar la autorización o el control de acceso del rol administrador.
- Rediseñar la captura, el parseo o la periodicidad (HU-01, HU-02, HU-18).
- Definir persistencia, duplicados o metadatos de noticias (HU-04); solo se garantiza que sus registros no se alteran al desactivar una fuente.
- Añadir borrado físico, historial de cambios o auditoría de la fuente.

## Decisions

Las decisiones aprobadas fijan el comportamiento reflejado en `spec.md`. Las decisiones pendientes son elecciones de implementación que no cambian ese comportamiento observable.

### Decisiones APROBADAS

#### Modelo mínimo de la fuente RSS

Cada fuente registrada tiene, como mínimo: un identificador único, una URL y un estado (`activa` o `desactivada`). Otros campos administrativos (por ejemplo, un nombre descriptivo) pueden añadirse sin reglas de validación propias de este cambio, ya que ninguna historia consumidora los exige todavía.

#### Validación de URL en dos niveles, aplicada en creación y actualización

Toda operación que fija o modifica la URL de una fuente (creación, o actualización que cambia la URL) exige que la URL sea sintácticamente válida y que responda a una solicitud HTTP. Ambas comprobaciones se ejecutan de forma síncrona, con una finalización finita mediante timeout, reutilizando el mismo principio de finalización finita ya aprobado para HU-01/HU-02 (sin fijar aún su valor concreto).

Se descartó verificar en el alta que la URL sirva específicamente un feed RSS interpretable (reutilizando el parser de HU-01): acoplaría la gestión administrativa al comportamiento de interpretación de captura, y una fuente cuyo feed cambia de formato después del alta ya queda cubierta por el aislamiento de fallos por fuente que HU-01 aprobó.

#### Unicidad de URL sobre el conjunto completo de fuentes registradas

La URL se valida como única contra todas las fuentes registradas, estén activas o desactivadas. Comparar solo contra las activas permitiría URLs duplicadas "dormidas" que resurgirían como conflicto al reactivar una fuente.

#### Eliminación lógica mediante estado activo/desactivado, reversible

"Eliminar" una fuente se implementa como una transición de estado (`activa` → `desactivada`), no como un borrado físico del registro. Una fuente desactivada puede reactivarse (`desactivada` → `activa`). El registro y las noticias ya almacenadas asociadas a la fuente (HU-04) no se modifican en ninguna transición.

Se descartó el borrado físico: perdería la trazabilidad de qué fuente originó noticias ya almacenadas y no sería reversible ante un error del administrador.

#### Contrato del límite abstracto de fuentes registradas activas

El límite abstracto que consumen HU-01 y HU-02 se define como una operación de solo lectura que entrega una instantánea del conjunto de fuentes con estado `activa`, excluyendo las desactivadas. Es compatible con la "instantánea de fuentes por ejecución" ya aprobada en el diseño de HU-01: los cambios administrativos hechos mediante HU-15 se reflejan en instantáneas posteriores, no en una ejecución ya en curso.

No se compromete en este cambio una interfaz de entrada concreta (API/UI) para el administrador, siguiendo el mismo patrón ya usado por HU-01 y HU-02 para sus propios límites abstractos.

### Decisiones PENDIENTES

#### Tecnología de persistencia

No se ha seleccionado motor ni mecanismo de almacenamiento para el registro de fuentes.

#### Normalización de la URL para la comparación de unicidad

No se ha decidido si la comparación de unicidad normaliza la URL (mayúsculas/minúsculas del host, barra final, parámetros de consulta) o la compara tal como se almacena.

#### Valor concreto del timeout de accesibilidad HTTP

El mecanismo de finalización finita está aprobado; su duración concreta permanece abierta, igual que en HU-01/HU-02.

#### Interfaz de entrada concreta y autorización

Quedan sin seleccionar tanto el contrato de interfaz (API REST, UI administrativa u otro) como el mecanismo de autenticación/autorización que confirme que quien ejecuta las operaciones es un administrador.

#### Campos administrativos adicionales

No se ha decidido si la fuente incluye un nombre descriptivo u otros campos opcionales, ni sus reglas de validación si se incorporan.

## Risks / Trade-offs

- **[La verificación de accesibilidad HTTP síncrona puede ser lenta ante fuentes que responden con demora]** → Aplicar un timeout finito equivalente al ya aprobado para la captura por fuente en HU-01.
- **[Una fuente accesible en el alta puede dejar de responder después]** → No se re-verifica fuera de la creación/actualización; HU-01 ya aísla y tolera fallos por fuente en cada ejecución de captura.
- **[Comparar unicidad sin normalizar puede permitir URLs equivalentes pero no idénticas]** → Documentado como decisión pendiente; no bloquea el comportamiento ya aprobado en `spec.md`.
- **[Definir aquí el contrato definitivo del límite abstracto obliga a HU-01/HU-02, ya en curso, a adaptar su consumo]** → Coordinar la actualización de esas implementaciones para que consuman el contrato de "fuentes activas" definido en este cambio.

## Migration Plan

No existe registro previo de fuentes que migrar: este cambio introduce la entidad. La estrategia de despliegue concreta (por ejemplo, si HU-01/HU-02 deben actualizarse en el mismo despliegue o pueden seguir usando un límite abstracto provisional) se definirá al seleccionar la interfaz de entrada y la persistencia, sin alterar el comportamiento ya aprobado en `spec.md`.

## Open Questions

- ¿Qué tecnología de persistencia se utilizará para el registro de fuentes?
- ¿Se normaliza la URL antes de comparar unicidad, y con qué reglas?
- ¿Qué valor concreto tendrá el timeout de la verificación de accesibilidad HTTP?
- ¿Qué interfaz de entrada concreta (API/UI/CLI) y qué mecanismo de autorización expondrán estos casos de uso al administrador?
- ¿Se incorporarán campos administrativos adicionales (por ejemplo, un nombre descriptivo) y con qué validaciones?
