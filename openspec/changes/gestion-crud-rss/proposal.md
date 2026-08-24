## Why

HumWorld necesita que un administrador pueda mantener vigente el conjunto de fuentes RSS utilizado por la captura, ya que HU-01 y HU-02 asumen la existencia de "fuentes registradas" sin definir todavía cómo se crean, consultan, actualizan o eliminan. HU-15 cierra ese contrato: define la gestión administrativa (CRUD) de fuentes RSS.

## What Changes

- Incorporar un caso de uso de creación de fuentes RSS que valide la URL de forma sintáctica (formato válido) y de accesibilidad HTTP antes de aceptar el registro.
- Rechazar la creación o actualización de una fuente hacia una URL que ya pertenece a otra fuente registrada (la URL es única entre fuentes).
- Incorporar un caso de uso de consulta que permita obtener una fuente registrada por su identificador y listar el conjunto de fuentes registradas.
- Incorporar un caso de uso de actualización de los datos de una fuente existente, revalidando la URL (sintaxis y accesibilidad HTTP, y unicidad) cuando esta cambia.
- Incorporar un caso de uso de eliminación lógica (desactivación) de una fuente existente: la fuente deja de formar parte del conjunto de fuentes registradas que consumen HU-01 y HU-02, pero su registro y las noticias ya almacenadas asociadas a ella (HU-04) se conservan; la desactivación es reversible mediante reactivación.
- Rechazar las operaciones de consulta, actualización o eliminación dirigidas a un identificador de fuente que no existe.
- Definir el contrato interno definitivo del "conjunto de fuentes registradas" que HU-01 y HU-02 consumen hoy mediante un límite abstracto, sin comprometer todavía una interfaz de entrada concreta (API, UI u otra).
- Mantener fuera de este cambio la autorización y el control de acceso del administrador, la interfaz concreta de entrada (API/UI/CLI), la gestión de la periodicidad de captura (HU-18), la ejecución de la captura en sí (HU-01/HU-02) y la persistencia de noticias y sus metadatos (HU-04).

## Capabilities

### New Capabilities

- `gestion-crud-rss`: creación, consulta, actualización y desactivación administrativa de fuentes RSS, con validación de URL (sintáctica y de accesibilidad HTTP), unicidad de URL entre fuentes, rechazo de operaciones sobre fuentes inexistentes, y exposición del conjunto de fuentes registradas activas mediante un límite abstracto para HU-01 y HU-02.

### Modified Capabilities

Ninguna.

## Impact

- Casos de uso administrativos de gestión de fuentes RSS (crear, consultar, actualizar, desactivar), disparados por un administrador de HumWorld.
- Contrato interno definitivo del límite abstracto de "conjunto de fuentes registradas" que consumen HU-01 y HU-02; su interfaz de entrada concreta (API/UI) no se define en este cambio.
- Modelo de datos de la fuente RSS (URL, estado activo/inactivo, y demás campos administrativos); la tecnología concreta de persistencia se aborda en `design.md`.
- Pruebas de comportamiento para creación con validación de URL, rechazo de duplicados, consulta, actualización con revalidación de URL, desactivación reversible y rechazo de operaciones sobre fuentes inexistentes.
