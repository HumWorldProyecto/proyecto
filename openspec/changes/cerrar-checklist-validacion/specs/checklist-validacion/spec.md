## ADDED Requirements

### Requirement: Administración local explícita
El sistema SHALL permitir administración sin clave y eliminar fuente junto a sus noticias únicamente cuando HUMWORLD_VALIDATION_MODE y HUMWORLD_EVALUATION_MODE tengan ambas el valor 1.

#### Scenario: Configuración normal o una sola bandera
- **WHEN** falta cualquiera de las dos banderas
- **THEN** P12 exige las claves vigentes y DELETE de una fuente conserva sus noticias

#### Scenario: Evaluación local
- **WHEN** ambas banderas están habilitadas en el compose ligado a 127.0.0.1
- **THEN** la web identifica el modo local, permite gestión sin clave y confirma antes de eliminar una fuente con sus noticias

### Requirement: Metadatos y compatibilidad REST
El sistema SHALL conservar contratos existentes y añadir país/continente derivado, medio, idioma y categoría editorial IPTC opcionales de fuente, así como rutas compatibles con el checklist.

#### Scenario: Flujo persistido y consultas
- **WHEN** se registra una fuente con metadatos, se capturan noticias y se guarda su análisis
- **THEN** se pueden consultar detalle y filtros geográficos, temporales, de fuente y categoría, GET y POST sentiment, y la caducidad mediante GET config

#### Scenario: Eliminación individual
- **WHEN** se elimina una noticia existente mediante DELETE news con UUID en el cuerpo o en la ruta
- **THEN** se devuelve 204, su consulta devuelve 404 y se conserva su fuente

### Requirement: Gestión y visualización coherentes
La interfaz SHALL permitir CRUD del diccionario, configurar periodicidad, analizar y borrar noticias y mantener los mismos filtros en resumen, mapa, nube y ranking.

#### Scenario: Día y continente
- **WHEN** se selecciona un día o se agrupa el mapa por continente
- **THEN** el resultado del día se consulta para todos los componentes y el continente promedia por número de noticias con evidencia

#### Scenario: Conservación tras reinicio
- **WHEN** se reinician los servicios conservando el volumen
- **THEN** noticias, fuentes, medios, diccionario y configuración mantienen sus valores, incluso metadatos opcionales retirados por el usuario
