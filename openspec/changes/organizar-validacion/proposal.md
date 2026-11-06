## Why

La validación del equipo requiere noticias reales de varios días y una interfaz que separe la consulta pública de la gestión de fuentes y de la caducidad.

## What Changes

- Añadir vistas de catálogo y administración, con búsqueda y operaciones de fuentes RSS.
- Preparar un entorno de validación persistente con 50 medios y 53 feeds comprobados.
- Capturar periódicamente y analizar pendientes en el entorno de validación usando el motor existente.

## Capabilities

### New Capabilities

- `entorno-validacion`: navegación de gestión y recolección conservada entre reinicios.

### Modified Capabilities

## Impact

Afecta al frontend, la preparación local de Docker y la automatización habilitada para validación. Conserva los contratos de la API, los permisos, la base de los ejemplos y la política de caducidad configurable.
