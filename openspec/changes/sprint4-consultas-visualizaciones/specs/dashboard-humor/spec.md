# Dashboard de humor

## Purpose

Presentar las consultas de humor en una interfaz web donde se pueda explorar su distribución geográfica, evolución y evidencia sin confundir ausencia de datos con neutralidad.

## ADDED Requirements

### Requirement: Filtros y contexto compartidos
La interfaz SHALL permitir consultar mundo, continente o país e intervalo temporal, conservando el contexto entre resumen, evolución, mapa, nube y noticias. SHALL comunicar carga, error recuperable y falta de datos sin presentar resultados de otra selección como actuales.

#### Scenario: Cambio de selección
- **GIVEN** un resultado global visible
- **WHEN** se selecciona un país y un intervalo
- **THEN** todas las vistas usan esa selección
- **AND** la interfaz distingue el tiempo de espera y un posible error

### Requirement: Mapa mundial de valores
La interfaz SHALL representar geográficamente el humor por país, diferenciar visualmente valores positivos, neutrales y negativos y distinguir países sin evidencia. SHALL ofrecer valores y cobertura legibles sin depender exclusivamente del color o de la interacción con el mapa.

#### Scenario: Países con y sin evidencia
- **GIVEN** países con valores positivos, negativos, cero y sin promedio
- **WHEN** se muestra el mapa
- **THEN** los cuatro estados son distinguibles con una leyenda
- **AND** los valores y nombres también se pueden consultar como texto

#### Scenario: País sin geometría
- **GIVEN** un país con noticias que no está representado a la escala cartográfica disponible
- **WHEN** se consulta la distribución
- **THEN** sus valores siguen disponibles en la lista geográfica sin ser descartados del resultado

### Requirement: Evolución y exploración del resultado
La interfaz SHALL mostrar valores a lo largo del tiempo y permitir acceder al detalle de las noticias que los forman. SHALL explicar que la fecha corresponde a la noticia y el resultado a su último análisis.

#### Scenario: Explorar un día
- **GIVEN** varios días con noticias analizadas
- **WHEN** el usuario elige un día
- **THEN** puede identificar sus noticias, valores y contribuciones
- **AND** un día sin evidencia no se representa como un cero analizado

### Requirement: Palabras influyentes
La interfaz SHALL mostrar una nube de palabras del análisis persistido, con tamaño que refleje su influencia en el conjunto consultado y detalle de su contribución. SHALL informar de análisis históricos sin palabras guardadas y de conjuntos sin palabras disponibles.

#### Scenario: Influencia desigual
- **GIVEN** dos palabras con distintas magnitudes de contribución
- **WHEN** se muestra la nube
- **THEN** la palabra de mayor influencia tiene mayor tamaño
- **AND** ambas exponen su contribución de forma legible

#### Scenario: Evidencia ausente
- **GIVEN** noticias sin coincidencias o sin palabras históricas guardadas
- **WHEN** se consulta la nube
- **THEN** se explica la ausencia o cobertura parcial sin inventar palabras

### Requirement: Noticias influyentes
La interfaz SHALL ordenar las noticias con evidencia por la magnitud de su contribución al promedio consultado, identificando cada noticia, procedencia, fecha, valor y contribución con signo. SHALL permitir consultar su detalle sin ejecutar un reanálisis ni capturar páginas externas.

#### Scenario: Ranking explicable
- **GIVEN** tres noticias con evidencia cuyos valores son 1, -0.6 y 0.2
- **WHEN** se consulta el ranking
- **THEN** su orden es 1, -0.6 y 0.2
- **AND** sus contribuciones son sus respectivos valores divididos por tres

#### Scenario: Contenido seguro y accesible
- **GIVEN** un título RSS con marcado y un enlace con un protocolo no permitido
- **WHEN** se muestra el detalle
- **THEN** el contenido no ejecuta marcado ni expone un enlace ejecutable inseguro
- **AND** los controles de selección y detalle pueden operarse con teclado
