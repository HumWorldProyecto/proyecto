## Why

Completar HU-19 [#20](https://github.com/HumWorldProyecto/proyecto/issues/20), HU-20 [#21](https://github.com/HumWorldProyecto/proyecto/issues/21), HU-21 [#22](https://github.com/HumWorldProyecto/proyecto/issues/22) y la brecha de medios de HU-15 [#50](https://github.com/HumWorldProyecto/proyecto/issues/50). Issues y criterios releídos el 31-10-2026. El usuario autoriza caducidad desde captura, ausencia de borrados sin configuración, medios con varias fuentes y SonarQube local. El Sprint 5 planificado termina 01-11-2026.

## What Changes

- Periodo de permanencia configurable, vista previa y purga manual/automática compartida, solo noticias estrictamente anteriores al umbral.
- CRUD de medios y asociación de fuentes, sin borrar fuentes o noticias al quitar un medio.
- Interfaz administrativa con la clave efímera de P12; pruebas PostgreSQL, regresión, OpenAPI y demo descartable.
- Análisis SonarQube local reproducible con evidencia real y sin atribuir aprobación humana a hallazgos.

## Capabilities

### New Capabilities
- `ciclo-vida-noticias`: HU-19/20/21.
- `gestion-medios`: alcance original de HU-15 pendiente, no una nueva HU.

### Modified Capabilities
Ninguna capacidad histórica se reescribe. Se preservan contratos RSS, captura, sentimiento, diccionario y dashboards. Las nuevas operaciones administrativas tienen control P12.

## Impact

Base verificada P12 `45d6ca9d6ea94f08652fd792125006cb5999ae59`; main `f5ef214eac6610dcc9ceda195f7dc83f31fdb0de`. #49 sigue en revisión: rama aparte y PR dependiente con diff propio, sin fusionar #49 automáticamente. Tras fusión humana se integrará main sin force push y se cambiará la base. ADR-002/003/004/005 respetados, sin cambiar stack, versiones principales o esquema histórico. Una migración aditiva nueva. SonarQube ya pertenece al baseline y el usuario autoriza su preparación local; no se inventa cuenta cloud o token.
