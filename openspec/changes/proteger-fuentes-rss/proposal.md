# P12: acceso de aplicaciones colaboradoras a fuentes RSS

## Why

[Issue #48](https://github.com/HumWorldProyecto/proyecto/issues/48), creada y releída con sus nueve criterios y cero comentarios el 28-10-2026. Main verificado `f5ef214eac6610dcc9ceda195f7dc83f31fdb0de` integra Sprint 4 (#45) y P11 (#47). El usuario solicita aplicar P12 y confirma toda la familia de fuentes RSS; pide exclusivamente a Benjamín como revisor.

## What Changes

- Autenticación por cabecera y perfiles consulta/gestión en las diez operaciones existentes de fuentes, captura manual y geografía de fuentes. 401 por credencial ausente/inválida, 403 por permiso insuficiente antes de servicios y validaciones funcionales.
- Configuración validada al arrancar, sin credenciales predeterminadas, filtración ni persistencia en el cliente.
- OpenAPI/Swagger, cliente web, pruebas autorizadas anteriores y nuevas comprobaciones de acceso, arranque y rotación.
- Actions Secrets exclusivos de CI, job explícito de verificación sin imprimir valores, informes conservados; credenciales locales efímeras distintas.

Se evoluciona el contrato anónimo **durante Sprint 1** de gestion-crud-rss en una práctica posterior, sin reescribir sus artefactos históricos. No se cambian contratos de éxito, servicios, persistencia, migraciones, jobs automáticos ni las otras familias de API. No se crean usuarios, sesiones, login o nuevas historias de producto. El dashboard de humor permanece público y no se afirma protección global de la API.

## Capabilities

### New Capabilities

- `acceso-fuentes-rss`: configuración, autenticación/autorización y contrato de acceso de colaboradores.

### Modified Capabilities

Ninguna capacidad histórica se reescribe: la nueva política P12 se aplica al uso actual de las rutas de fuentes. Los códigos y datos funcionales autorizados se conservan.

## Impact

Guard/decorador y configuración compartidos en el límite HTTP; SourcesModule, CaptureModule y AnalyticsModule importan el componente de acceso. Cliente web solicita clave en memoria y solo en operaciones protegidas. Sin dependencias de producto nuevas. ADR-002/004/005 respetados; no se modifica una decisión arquitectónica aceptada ni se adopta una alternativa del ADR-006. Se mantienen monolito, capas y stack; los detalles son propios de design.md.

La petición y confirmación humanas autorizan el alcance; Codex registra revisión técnica previa y matriz antes de implementar. La revisión/aprobación de la PR por `BGallegos000` queda pendiente; no se atribuye uso de Copilot ni aprobación humana ficticios.
