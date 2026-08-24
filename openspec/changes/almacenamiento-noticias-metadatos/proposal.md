## Why

HumWorld necesita conservar las noticias que produce la captura RSS (HU-01 y HU-02) junto con sus metadatos, ya que ambas historias entregan ítems interpretados a un límite abstracto de salida sin definir su persistencia. HU-04 cierra ese límite: define cómo se almacenan las noticias capturadas para que queden disponibles para consultas y análisis posteriores.

## What Changes

- Incorporar la persistencia de cada ítem RSS interpretado entregado por HU-01 o HU-02, junto con los metadatos que proporciona su fuente RSS.
- Definir el contrato interno del límite abstracto de entrada que HU-01 y HU-02 usan para entregar sus ítems, reemplazando la referencia abstracta que ambas historias dejaron pendiente.
- Descartar sin almacenar cualquier ítem que llegue sin los datos esenciales para identificarlo (título o enlace), sin interrumpir el almacenamiento de los demás ítems entregados en la misma entrega.
- Ignorar la recaptura de una noticia ya almacenada: cuando un ítem entregado corresponde a una noticia ya persistida, el registro existente se conserva sin modificarse y no se crea un registro adicional.
- Aislar el almacenamiento de cada ítem de una misma entrega, de modo que el fallo al almacenar uno MUST NOT impedir almacenar los demás ítems de esa entrega.
- Conservar únicamente los metadatos disponibles en el ítem RSS interpretado (sin obtener contenido adicional mediante scraping, en línea con la restricción ya aprobada en HU-01/HU-02).
- Estructurar el almacenamiento de forma consultable, sin definir ni construir en este cambio una interfaz de consulta o análisis concreta (API, UI u otra); esa interfaz pertenece a una historia futura.
- Mantener fuera de este cambio la gestión y validación administrativa de fuentes (HU-15), la periodicidad (HU-18), los mecanismos de disparo de captura (HU-01/HU-02), la política de solapamiento entre ejecuciones concurrentes, y cualquier interfaz concreta de consulta o análisis.

## Capabilities

### New Capabilities

- `almacenamiento-noticias-metadatos`: persistencia de las noticias capturadas junto con sus metadatos RSS, con descarte de ítems sin datos esenciales, con la recaptura de una noticia ya almacenada ignorada, con aislamiento de fallos por ítem dentro de una misma entrega, y con una estructura de almacenamiento consultable para su uso por historias futuras de consulta y análisis.

### Modified Capabilities

Ninguna.

## Impact

- Contrato interno definitivo del límite abstracto de salida que HU-01 y HU-02 dejaron sin definir para la entrega de ítems RSS interpretados.
- Modelo de datos y almacenamiento de noticias y sus metadatos; la tecnología concreta de persistencia no está declarada todavía en el repositorio y se aborda en `design.md`.
- Pruebas de comportamiento para almacenamiento con metadatos, descarte por datos esenciales faltantes, recaptura ignorada de una noticia existente y aislamiento de fallos por ítem.
