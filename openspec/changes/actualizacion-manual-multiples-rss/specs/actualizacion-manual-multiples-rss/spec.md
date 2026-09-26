## Purpose

Permitir que un administrador actualice manualmente varias fuentes RSS seleccionadas en una sola operación e incorpore las noticias disponibles sin capturar fuentes ajenas a esa selección.

## ADDED Requirements

### Requirement: Actualización manual de varias fuentes RSS
El sistema SHALL permitir iniciar manualmente, mediante una sola operación, la actualización de varias fuentes RSS seleccionadas.

#### Scenario: Selección de varias fuentes disponibles
- **GIVEN** que existen varias fuentes RSS disponibles para captura
- **WHEN** el administrador solicita en una sola operación la actualización manual de dos o más de ellas
- **THEN** el sistema inicia la captura manual de las fuentes identificadas en la selección

### Requirement: Alcance limitado a la selección
El sistema SHALL intentar capturar exclusivamente las fuentes RSS identificadas en la operación manual múltiple.

#### Scenario: Existen fuentes no seleccionadas
- **GIVEN** que el sistema contiene fuentes seleccionadas y fuentes no seleccionadas
- **WHEN** el administrador inicia la actualización manual múltiple
- **THEN** el sistema no inicia una captura como parte de esa operación para ninguna fuente no seleccionada

### Requirement: Incorporación de noticias disponibles
El sistema SHALL incorporar las noticias disponibles obtenidas correctamente desde todas las fuentes RSS seleccionadas que puedan ser capturadas.

#### Scenario: Todas las fuentes seleccionadas entregan noticias
- **GIVEN** que cada fuente seleccionada entrega un canal RSS válido con noticias disponibles
- **WHEN** finaliza la actualización manual múltiple
- **THEN** el sistema incorpora las noticias disponibles de cada una de las fuentes seleccionadas

#### Scenario: Una fuente seleccionada no contiene noticias nuevas
- **GIVEN** que una fuente seleccionada no contiene noticias nuevas y otra fuente seleccionada sí las contiene
- **WHEN** finaliza la actualización manual múltiple
- **THEN** el sistema incorpora las noticias disponibles de la segunda fuente sin inventar noticias para la primera

### Requirement: Captura limitada a RSS
El sistema SHALL obtener contenido de las fuentes seleccionadas exclusivamente mediante sus canales RSS y MUST NOT realizar web scraping de las páginas enlazadas.

#### Scenario: Una noticia contiene un enlace a una página web
- **GIVEN** que un ítem RSS contiene un enlace a una página web externa
- **WHEN** el sistema procesa el ítem durante la actualización manual múltiple
- **THEN** el sistema usa el contenido provisto por RSS sin descargar ni extraer contenido de la página enlazada

## Pending Human Approval (non-normative)

Esta sección no define todavía comportamiento contractual. Antes de implementar se deben aprobar y convertir en requisitos y escenarios verificables las siguientes decisiones:

- ruta del endpoint y forma exacta del request;
- forma del resultado por fuente y semántica HTTP de una operación parcialmente exitosa;
- comportamiento observable para fuente inexistente, inactiva, ocupada, con fallo upstream, con timeout y exitosa;
- política para identificadores repetidos;
- cardinalidad mínima aceptada.

Hasta esa aprobación, los escenarios anteriores no autorizan a suponer una política concreta para esos casos.
