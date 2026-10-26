# Consultas de humor

## Purpose

Permitir consultar y explicar el humor de noticias analizadas según su procedencia geográfica y su fecha, conservando la evidencia del último análisis.

## ADDED Requirements

### Requirement: Procedencia explícita de la fuente
El sistema SHALL permitir asignar o retirar un país de una fuente RSS mediante una selección administrativa. SHALL usar ese país en las consultas sin inferirlo del contenido o del dominio. Las fuentes existentes sin país SHALL permanecer sin asignar.

#### Scenario: País asignado
- **GIVEN** una fuente sin país y noticias capturadas de ella
- **WHEN** el administrador asigna Chile a esa fuente
- **THEN** esas noticias pertenecen a Chile y Sudamérica en las consultas
- **AND** sus metadatos, categorías y análisis permanecen conservados

#### Scenario: Sin país conocido
- **GIVEN** una fuente sin país
- **WHEN** se consulta el mundo
- **THEN** sus noticias pueden contribuir al total global
- **AND** la respuesta distingue la ausencia de país sin inventar una ubicación

### Requirement: Consulta geográfica y cobertura
El sistema SHALL consultar el resultado global, por continente o por país. SHALL promediar solo los últimos valores persistidos de noticias con coincidencias del diccionario, distinguiendo noticias sin analizar y analizadas sin evidencia. Un conjunto sin evidencia SHALL devolver ausencia de promedio, no neutralidad.

#### Scenario: Promedio con cobertura parcial
- **GIVEN** noticias con valores 1 y -0.5 con coincidencias, otra con cero coincidencias y otra sin analizar
- **WHEN** se consulta el conjunto
- **THEN** su promedio es 0.25
- **AND** se muestran dos noticias con evidencia, una sin evidencia y una sin analizar

#### Scenario: Cero con evidencia
- **GIVEN** una noticia cuyo análisis tiene coincidencias y valor cero
- **WHEN** se consulta su país
- **THEN** contribuye al promedio como neutral

#### Scenario: Sin resultados
- **GIVEN** una selección sin noticias con evidencia
- **WHEN** se consulta su humor
- **THEN** el promedio está ausente y se indica la cobertura disponible

### Requirement: Evolución y detalle coherentes
El sistema SHALL agrupar por fecha de publicación, usando captura si falta, y consultar un intervalo de fechas. SHALL usar el último análisis guardado de cada noticia y permitir identificar las noticias y su evidencia que componen cada resultado temporal.

#### Scenario: Fecha y último análisis
- **GIVEN** una noticia publicada el día A y reanalizada el día B
- **WHEN** se consulta su evolución
- **THEN** el último resultado contribuye al día A
- **AND** no se crean puntos adicionales por reanálisis

#### Scenario: Sin publicación
- **GIVEN** una noticia sin fecha de publicación
- **WHEN** se consulta el intervalo que incluye su captura
- **THEN** aparece en la fecha de captura y su detalle identifica esa fecha efectiva

#### Scenario: Selección temporal
- **GIVEN** noticias dentro y fuera del intervalo seleccionado
- **WHEN** se consulta el resultado y sus detalles
- **THEN** solo intervienen las noticias dentro del intervalo

### Requirement: Evidencia del mismo análisis persistido
El sistema SHALL conservar las palabras, idioma, pesos y ocurrencias elegidas junto al último valor analizado en una misma actualización. SHALL utilizar esa evidencia en las consultas sin recalcular contra un diccionario posterior. Los análisis anteriores sin palabras guardadas SHALL identificarse como evidencia de palabras no disponible.

#### Scenario: Diccionario modificado después
- **GIVEN** una noticia analizada con una palabra de peso 3
- **WHEN** el administrador cambia o elimina esa entrada del diccionario
- **THEN** la consulta conserva el peso y palabra del análisis guardado hasta un reanálisis explícito

#### Scenario: Análisis histórico
- **GIVEN** un valor persistido antes de esta capacidad sin palabras guardadas
- **WHEN** se consulta el resultado
- **THEN** el valor participa si tiene coincidencias
- **AND** se informa que sus palabras no están disponibles sin fabricar evidencia

### Requirement: Compatibilidad y validación
El sistema SHALL rechazar filtros y países inválidos sin alterar datos. SHALL preservar los contratos existentes de fuentes, noticias, sentimiento, captura, diccionario y clasificación, así como sus migraciones y datos históricos.

#### Scenario: Filtro inválido
- **GIVEN** una fecha imposible, un intervalo invertido o un país desconocido
- **WHEN** se solicita una consulta
- **THEN** responde con un error de entrada sin ejecutar una modificación

#### Scenario: Actualización de esquema
- **GIVEN** una base con fuentes, noticias, categorías y valores anteriores
- **WHEN** se aplica la nueva migración
- **THEN** conserva todos esos datos y no asigna países ni palabras automáticamente
