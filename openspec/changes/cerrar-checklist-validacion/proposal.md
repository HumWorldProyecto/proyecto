## Why

La revisión de 28 casos del Excel señala brechas de interfaz, metadatos y rutas compatibles. El equipo necesita verificar los resultados con evidencia actual y conservar las noticias acumuladas.

## What Changes

- Completar el diccionario, la periodicidad y las acciones de noticias desde la web.
- Añadir metadatos opcionales de fuente y filtros de fuente/categoría sin retirar campos ni rutas existentes.
- Sincronizar mapa, resumen y nube al seleccionar un día; ofrecer agregación por continente.
- Añadir alias GET/POST sentiment, detalle y borrado de noticias y lectura conjunta de configuración.
- Activar gestión anónima y eliminación de fuente/noticias únicamente con las dos banderas explícitas de evaluación local aprobadas por el usuario.

## Capabilities

### New Capabilities

- `checklist-validacion`: contratos compatibles y recorrido completo de evaluación local.

### Modified Capabilities

## Impact

Afecta frontend, API, dos migraciones aditivas y compose de validación ligado a 127.0.0.1. La configuración normal conserva P12 y DELETE lógico de fuentes. No cambia migraciones anteriores, P10 ni el algoritmo de sentimiento; tampoco reinicia ni vacía la base real.
