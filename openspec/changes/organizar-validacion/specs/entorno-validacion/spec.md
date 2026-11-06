## ADDED Requirements

### Requirement: Navegación de gestión separada
La web SHALL ofrecer espacios separados para explorar noticias, gestionar medios y fuentes y administrar caducidad.

#### Scenario: Gestionar con las claves existentes
- **GIVEN** una clave válida de consulta o gestión
- **WHEN** la persona cambia entre catálogo y administración
- **THEN** conserva la clave en memoria y la API mantiene sus comprobaciones de lectura y escritura

### Requirement: Catálogo y captura persistente
El entorno de validación SHALL preparar un catálogo público de RSS y conservar las noticias capturadas entre reinicios.

#### Scenario: Reiniciar después de capturar
- **GIVEN** un entorno de validación que ya contiene noticias
- **WHEN** se reinicia sobre el mismo volumen
- **THEN** conserva los registros y su configuración y reanuda la captura periódica

#### Scenario: Conservar el material para la demo
- **GIVEN** una base de validación recién preparada
- **WHEN** se ejecuta el trabajo periódico de caducidad
- **THEN** la política inicial desactivada conserva las noticias

### Requirement: Análisis de pendientes del catálogo
En validación, HumWorld SHALL analizar noticias pendientes de los feeds catalogados con el idioma configurado.

#### Scenario: Ya existe un análisis
- **GIVEN** una noticia con análisis guardado
- **WHEN** se ejecuta el procesamiento de pendientes
- **THEN** el resultado guardado se conserva
