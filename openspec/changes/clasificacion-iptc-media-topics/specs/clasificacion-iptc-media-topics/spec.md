## Purpose

Definir el comportamiento observable de la clasificación de noticias mediante IPTC Media Topics y su disponibilidad junto con cada noticia, sin alterar la captura RSS existente.

## ADDED Requirements

### Requirement: Catálogo oficial de clasificación

El sistema SHALL utilizar exclusivamente los 17 conceptos raíz activos de IPTC Media Topics incluidos en la publicación oficial aprobada para HU-16. Cada tema SHALL conservar su QCode, URI canónica y etiqueta oficial en español. El sistema MUST NOT crear identificadores bajo el esquema `medtop:` ni aceptar como clasificación un código ajeno al catálogo aprobado.

#### Scenario: Catálogo inicial aprobado

- **GIVEN** la publicación IPTC aprobada para HU-16
- **WHEN** el sistema carga su catálogo de clasificación
- **THEN** dispone exactamente de los 17 conceptos raíz aprobados
- **AND** cada concepto conserva el QCode, la URI y la etiqueta oficial correspondientes

#### Scenario: Código ajeno al catálogo

- **GIVEN** un resultado de clasificación contiene un código no incluido en el catálogo aprobado
- **WHEN** el sistema valida ese resultado
- **THEN** no asocia el código ajeno a la noticia

### Requirement: Clasificación automática de noticias nuevas

El sistema SHALL evaluar automáticamente y por separado el título y la descripción disponibles de cada noticia identificable nueva mediante `editorial-manifest.md` versión 1. Después SHALL combinar ambas colecciones, eliminar duplicados y producir de cero a varios QCodes oficiales en orden estable, sin modificar los metadatos originales de la noticia.

#### Scenario: Una noticia satisface la regla de un tema

- **GIVEN** una noticia identificable nueva cuyo título o descripción satisface la regla aprobada de un tema IPTC
- **WHEN** el sistema procesa la noticia
- **THEN** asigna el QCode oficial de ese tema

#### Scenario: Una noticia satisface reglas de varios temas

- **GIVEN** una noticia identificable nueva cuyo contenido satisface las reglas aprobadas de varios temas IPTC
- **WHEN** el sistema procesa la noticia
- **THEN** asocia todos los QCodes oficiales aplicables sin duplicados

#### Scenario: Resultado determinista

- **GIVEN** el mismo título, descripción, catálogo y versión de reglas
- **WHEN** el sistema clasifica ese contenido en ejecuciones diferentes
- **THEN** produce la misma colección ordenada de QCodes

#### Scenario: Coincidencias distribuidas entre título y descripción

- **GIVEN** el título satisface la regla aprobada de un tema
- **AND** la descripción satisface la regla aprobada de otro tema
- **WHEN** el sistema clasifica ambos campos por separado y combina sus resultados
- **THEN** devuelve ambos QCodes sin duplicados y en orden oficial

#### Scenario: Una frase no cruza campos

- **GIVEN** el último token del título y el primer token de la descripción formarían juntos una frase del manifiesto
- **AND** ninguno de los dos campos contiene por sí solo esa frase completa
- **WHEN** el sistema clasifica la noticia
- **THEN** no considera esa combinación entre campos una coincidencia

#### Scenario: Metadatos originales preservados

- **GIVEN** una noticia con título y descripción
- **WHEN** el sistema normaliza el texto para compararlo con las reglas
- **THEN** conserva sin cambios el título y la descripción almacenados

### Requirement: Contrato editorial bilingüe y exacto

El clasificador SHALL aplicar literalmente las variantes, los disparadores españoles e ingleses y las exclusiones de `editorial-manifest.md`. Una coincidencia SHALL ser una secuencia completa de tokens dentro de un único campo y una exclusión SHALL anular solo la ocurrencia contenida. El sistema MUST NOT interpretar abreviaturas ni derivar reglas ausentes del manifiesto.

#### Scenario: Disparador español exacto

- **GIVEN** el título o la descripción contiene un disparador español completo del manifiesto
- **AND** esa ocurrencia no está contenida en una exclusión de la categoría
- **WHEN** el sistema clasifica la noticia
- **THEN** asigna el QCode de la categoría correspondiente

#### Scenario: Disparador inglés exacto

- **GIVEN** el título o la descripción contiene un disparador inglés completo del manifiesto
- **AND** esa ocurrencia no está contenida en una exclusión de la categoría
- **WHEN** el sistema clasifica la noticia
- **THEN** asigna el QCode de la categoría correspondiente

#### Scenario: Subcadena no válida

- **GIVEN** el texto contiene los caracteres de un disparador solo como parte de otro token
- **WHEN** el sistema clasifica la noticia
- **THEN** no considera esa subcadena una coincidencia

#### Scenario: Ocurrencia dentro de una exclusión

- **GIVEN** una ocurrencia de un disparador está contenida en una frase excluida para esa categoría
- **WHEN** el sistema clasifica la noticia
- **THEN** ignora esa ocurrencia
- **AND** conserva cualquier otra coincidencia no excluida de la misma categoría

#### Scenario: Vocabulario no declarado

- **GIVEN** el texto contiene una palabra semánticamente relacionada pero ausente del manifiesto
- **WHEN** el sistema clasifica la noticia
- **THEN** no asigna un tema por esa palabra

#### Scenario: Transformación lingüística no autorizada

- **GIVEN** una coincidencia solo sería posible mediante stemming, lematización, fuzzy matching, traducción, inferencia semántica o interpretación de negación
- **WHEN** el sistema clasifica la noticia
- **THEN** no asigna un tema por esa transformación

#### Scenario: Abreviatura de variantes no autorizada

- **GIVEN** una regla o entrada contiene notación como `(s)`, `/a` o `/as`
- **WHEN** el sistema evalúa el manifiesto
- **THEN** no interpreta esa notación como generadora de variantes

#### Scenario: Orden oficial de múltiples resultados

- **GIVEN** el texto activa varias categorías aprobadas
- **WHEN** el sistema produce la clasificación
- **THEN** elimina QCodes duplicados
- **AND** ordena los resultados por la parte numérica del QCode de menor a mayor

### Requirement: Noticia sin clasificación

El sistema SHALL conservar una noticia identificable cuando su contenido no permita asignar un tema oficial. La ausencia de clasificación SHALL representarse mediante una colección vacía y MUST NOT sustituirse por un tema genérico inventado.

#### Scenario: Texto sin coincidencias

- **GIVEN** una noticia identificable cuyo título y descripción no satisfacen ninguna regla aprobada
- **WHEN** el sistema procesa la noticia
- **THEN** almacena la noticia sin temas asociados

#### Scenario: Texto ausente

- **GIVEN** una noticia identificable sin título ni descripción disponibles
- **WHEN** el sistema procesa la noticia
- **THEN** almacena la noticia sin temas asociados

### Requirement: Fallo de clasificación no bloqueante

Un fallo interno del clasificador MUST NOT impedir el intento de persistencia de una noticia identificable ni interrumpir el procesamiento de los demás ítems del lote. El sistema SHALL registrar el error de clasificación de forma controlada, tratar esa noticia como no clasificada y conservar separado el manejo existente de fallos de persistencia. Un fallo real de Prisma o PostgreSQL MUST NOT convertirse en una colección vacía ni ocultarse como un resultado correcto del clasificador.

#### Scenario: El clasificador falla

- **GIVEN** una noticia identificable nueva
- **WHEN** ocurre un fallo interno al intentar clasificarla
- **THEN** el sistema intenta persistirla sin temas asociados
- **AND** continúa procesando los ítems siguientes

#### Scenario: Fallo de clasificación durante captura manual o automática

- **GIVEN** una ejecución de captura manual o automática entrega varios ítems identificables
- **AND** el clasificador falla para uno de ellos
- **WHEN** la ejecución procesa el lote
- **THEN** el fallo no cambia el contrato ni el resultado de la operación de captura
- **AND** no impide procesar los demás ítems

#### Scenario: Fallo real de persistencia después de clasificar

- **GIVEN** el clasificador devuelve una colección válida o vacía para una noticia identificable
- **WHEN** Prisma o PostgreSQL falla al persistirla
- **THEN** el sistema aplica el manejo existente de error de persistencia para ese ítem
- **AND** no transforma el fallo en una clasificación vacía
- **AND** continúa procesando los demás ítems según la política vigente

### Requirement: Persistencia e idempotencia de la clasificación

El sistema SHALL persistir los QCodes asignados junto con la noticia. Una repetición de la misma identidad dentro de la misma fuente MUST NOT crear otra noticia ni duplicar temas, y SHALL conservar la clasificación previamente almacenada.

#### Scenario: Clasificación conservada después de reiniciar

- **GIVEN** una noticia almacenada con uno o más temas IPTC
- **WHEN** la aplicación se reinicia y la noticia vuelve a consultarse
- **THEN** devuelve los mismos temas asociados

#### Scenario: Ítem duplicado de la misma fuente

- **GIVEN** una fuente ya produjo una noticia con una identidad y clasificación almacenadas
- **WHEN** la misma fuente entrega nuevamente esa identidad
- **THEN** el sistema mantiene una sola noticia
- **AND** no duplica ni reemplaza silenciosamente su clasificación original

#### Scenario: Noticias históricas después de la migración

- **GIVEN** una noticia almacenada antes de HU-16
- **WHEN** se aplica la migración de clasificación
- **THEN** se conservan su identificador y metadatos
- **AND** su clasificación inicial es una colección vacía

### Requirement: Clasificación disponible junto con cada noticia

La consulta existente de noticias SHALL devolver una propiedad `mediaTopics` en cada noticia. Cada elemento SHALL incluir `qcode`, `uri` y `label` oficiales. La propiedad SHALL estar presente como colección vacía cuando la noticia no tenga clasificación, y los campos y códigos HTTP existentes SHALL conservar su comportamiento.

#### Scenario: Noticia con un tema

- **GIVEN** existe una noticia almacenada con un tema IPTC
- **WHEN** se consulta el listado de noticias
- **THEN** la respuesta HTTP 200 incluye la noticia
- **AND** `mediaTopics` contiene el QCode, la URI y la etiqueta oficial del tema

#### Scenario: Noticia con varios temas

- **GIVEN** existe una noticia almacenada con varios temas IPTC
- **WHEN** se consulta el listado de noticias
- **THEN** `mediaTopics` contiene cada tema una sola vez y en orden estable

#### Scenario: Noticia no clasificada

- **GIVEN** existe una noticia almacenada sin temas asociados
- **WHEN** se consulta el listado de noticias
- **THEN** la respuesta contiene `mediaTopics: []` para esa noticia

#### Scenario: Contrato existente preservado

- **GIVEN** una noticia con los metadatos RSS ya soportados
- **WHEN** se consulta el listado después de HU-16
- **THEN** los campos existentes mantienen sus nombres, valores y nulabilidad
- **AND** la clasificación se añade sin crear otro endpoint

### Requirement: Captura RSS preservada

La incorporación de la clasificación MUST NOT modificar el contrato de salida de captura, la interpretación RSS, la deduplicación, la planificación automática ni los endpoints de captura manual y múltiple.

#### Scenario: Flujo de captura con clasificación

- **GIVEN** un feed que podía capturarse antes de HU-16
- **WHEN** se ejecuta la misma captura después de incorporar la clasificación
- **THEN** se mantienen el estado y los conteos observables de la captura
- **AND** la noticia identificable continúa llegando a la persistencia mediante el contrato existente

#### Scenario: DedupeKey sin cambios

- **GIVEN** dos ítems que antes de HU-16 resolvían la misma identidad dentro de una fuente
- **WHEN** ambos se procesan con clasificación habilitada
- **THEN** la regla existente de deduplicación mantiene una sola noticia
