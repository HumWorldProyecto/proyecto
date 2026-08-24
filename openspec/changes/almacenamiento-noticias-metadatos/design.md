## Context

La motivación y el alcance funcional se describen en `proposal.md`; los comportamientos verificables están en `specs/almacenamiento-noticias-metadatos/spec.md`. El repositorio todavía no declara una pila tecnológica de persistencia.

HU-01 (`captura-automatica-rss`, en curso) y HU-02 (`actualizacion-manual-rss`, en curso) entregan cero o más ítems RSS interpretados a un límite abstracto de salida, sin definir su contrato interno definitivo ni su persistencia. HU-04 cierra ese límite: define el puerto de entrada que recibe esos ítems y su comportamiento de almacenamiento.

```text
HU-01 (automática)  --\
                        >--  entrega de ítems RSS interpretados
HU-02 (manual)      --/            |
                                    v
                     puerto de entrada (definido por HU-04)
                                    |
                          ¿título y enlace presentes? --no--> descartar ítem
                                    |
                                   sí
                                    v
                  ¿ya existe noticia con ese guid/enlace? --sí--> ignorar recaptura
                                    |
                                   no
                                    v
                 almacenar noticia + metadatos proporcionados
                                    |
                                    v
                 estructura consultable (interfaz concreta: historia futura)
```

## Goals / Non-Goals

**Goals:**

- Definir el puerto de entrada (límite sustituible) que reemplaza la referencia abstracta que HU-01 y HU-02 dejaron pendiente.
- Garantizar que la identidad de una noticia (guid, o enlace si no hay guid) se resuelva de forma atómica frente a entregas concurrentes, evitando duplicados por condiciones de carrera entre la captura automática y la manual.
- Mantener el almacenamiento independiente de la tecnología concreta elegida, para permitir sustituirla sin cambiar el comportamiento especificado.

**Non-Goals:**

- Elegir la tecnología concreta de almacenamiento (motor relacional, documental u otro) en este documento; se deja como decisión pendiente.
- Diseñar la interfaz de consulta o análisis (API, UI u otra); corresponde a una historia futura.
- Rediseñar el registro de fuentes de HU-15 o la periodicidad de HU-18.
- Resolver la política de solapamiento entre ejecuciones automáticas y manuales; ese comportamiento pertenece a HU-01/HU-02 y permanece pendiente allí. Este diseño solo garantiza que, cualquiera sea esa política, dos entregas concurrentes de la misma noticia no produzcan dos registros.

## Decisions

Las decisiones aprobadas son elecciones técnicas de este cambio y no añaden requisitos funcionales a `spec.md`. Las decisiones pendientes se documentan como alternativas o preguntas abiertas y no constituyen compromisos de implementación.

### Decisiones APROBADAS

#### Definir un puerto de entrada como límite sustituible

HU-04 expondrá un puerto de entrada (interfaz) que HU-01 y HU-02 invocan para entregar ítems RSS interpretados. El puerto es sustituible por cualquier implementación de almacenamiento sin cambiar el comportamiento especificado. Esto reemplaza el "límite abstracto de salida" que ambas historias dejaron sin contrato definitivo.

#### Identidad de noticia: guid con fallback a enlace

Se usará el `guid` del ítem RSS cuando esté presente; si no está presente, se usará el enlace (`link`). Se descartaron alternativas como un hash de título+fuente+fecha porque el `guid` y el enlace ya son identificadores provistos directamente por la fuente y evitan depender de la estabilidad del título ante correcciones menores.

#### Recaptura ignorada, sin actualización del registro existente

Una entrega que corresponde a una noticia ya almacenada no modifica el registro existente ni crea uno nuevo. Esta elección prioriza simplicidad e idempotencia sobre reflejar correcciones posteriores de la fuente; si en el futuro se necesita reflejar correcciones, requerirá una decisión explícita que cambie este comportamiento aprobado.

#### Descartar ítems sin título o sin enlace antes de almacenar

Un ítem sin título o sin enlace se descarta sin almacenarse, ya que ambos campos son necesarios para presentar la noticia y para resolver su identidad.

#### Aislar el almacenamiento por ítem dentro de una misma entrega

El fallo al almacenar un ítem (por ejemplo, por datos esenciales faltantes) se contiene a ese ítem y no interrumpe el procesamiento de los demás ítems de la misma entrega, en línea con el aislamiento por fuente ya aprobado en HU-01/HU-02.

#### Garantizar unicidad de identidad ante escritura concurrente

La operación de verificar si una noticia ya existe y, en caso contrario, almacenarla, deberá ejecutarse de forma atómica respecto a esa identidad (por ejemplo, mediante una restricción de unicidad garantizada por el almacenamiento elegido), de modo que dos entregas concurrentes de la misma noticia -una automática y otra manual, o dos automáticas- no produzcan dos registros. El mecanismo concreto se define junto con la tecnología de almacenamiento.

#### Estructura consultable sin interfaz concreta en este cambio

El almacenamiento se estructura de forma que una noticia y sus metadatos puedan recuperarse (por ejemplo, mediante acceso directo al almacenamiento en pruebas), pero este cambio no define ni construye una interfaz de consulta o análisis concreta. Esa interfaz es una historia futura que se apoyará en esta estructura.

### Decisiones PENDIENTES

#### Tecnología concreta de almacenamiento

No se ha seleccionado un motor relacional, documental u otra tecnología de persistencia. La elección condiciona el mecanismo concreto de unicidad atómica y debe resolverse antes de comprometer tareas de implementación detalladas.

#### Metadatos operacionales adicionales

No se ha decidido si se conservará el ítem RSS crudo o metadatos operacionales adicionales (por ejemplo, el origen de la entrega -automática o manual- o el instante de captura) más allá de los metadatos que exige `spec.md`. No son necesarios para cumplir los requisitos aprobados.

#### Interfaz de consulta y análisis

No se ha definido cuándo ni cómo se expondrá una interfaz de consulta o análisis sobre las noticias almacenadas. Se asume que será una historia futura que consumirá la estructura consultable definida aquí.

#### Política de retención

No se ha definido si existirá una política de expiración o purga de noticias almacenadas, o si se conservan indefinidamente.

## Risks / Trade-offs

- **[Dos entregas concurrentes de la misma noticia podrían crear duplicados si la verificación de identidad no es atómica]** → Exigir que la tecnología de almacenamiento elegida garantice unicidad atómica por identidad (por ejemplo, una restricción de unicidad), no solo una comprobación previa en memoria.
- **[El `guid` puede ser inestable o inconsistente entre entregas de algunas fuentes]** → Usar el enlace como respaldo, ya reflejado en el requisito aprobado; vigilar en pruebas de contrato los casos de `guid` ausente o cambiante.
- **[La tecnología de almacenamiento no está elegida]** → No comprometer tareas de implementación detalladas hasta resolver esta decisión pendiente; mantener el puerto de entrada como límite sustituible mientras tanto.
- **[No existe todavía una interfaz de consulta para verificar de extremo a extremo que las noticias quedan "disponibles"]** → Verificar la disponibilidad mediante acceso directo al almacenamiento en las pruebas de este cambio, sin comprometer una interfaz concreta.
- **[La política de solapamiento entre capturas automática y manual permanece pendiente en HU-01/HU-02]** → La garantía de unicidad atómica de este diseño hace que el resultado de un solapamiento sea seguro (sin duplicados) independientemente de cómo se resuelva esa política más adelante.

## Migration Plan

No se requiere migración de datos, al tratarse de una capacidad nueva. El plan concreto de despliegue e inicialización del esquema de almacenamiento se definirá junto con la tecnología elegida, sin alterar el registro de fuentes de HU-15 ni la periodicidad de HU-18.

## Open Questions

- ¿Qué tecnología concreta de almacenamiento se utilizará?
- ¿Se conservarán el ítem RSS crudo o metadatos operacionales adicionales (origen de la entrega, instante de captura) además de los exigidos por `spec.md`?
- ¿Cuándo y mediante qué historia se definirá la interfaz de consulta y análisis sobre las noticias almacenadas?
- ¿Existirá una política de retención o purga de noticias almacenadas?
