## Context

El explorador concentraba consulta pública y formularios de gestión. El entorno de seis ejemplos reconstruye sus fixtures y utiliza una caducidad de siete días para el ensayo.

## Goals / Non-Goals

- Separar exploración, catálogo y caducidad con navegación interna.
- Conservar fuentes, noticias y análisis de validación entre arranques.
- Reutilizar captura, parser, diccionario, almacenamiento y permisos.

## Decisions

- Usar una base y un volumen propios de Compose. El seed inicial es transaccional y solo corre antes de que exista la configuración de captura.
- Usar el scheduler existente con intervalo inicial de 60 minutos. El análisis de validación procesa pendientes del catálogo por tandas y escribe únicamente si la noticia continúa pendiente.
- Conservar la clave en memoria entre vistas. Las operaciones de catálogo y caducidad siguen autorizándose en el backend.

## Risks / Trade-offs

- La disponibilidad de los feeds y la continuidad del equipo afectan la recolección.
- El idioma por feed es una configuración editorial. El diccionario necesita ajustes según los resultados observados.
