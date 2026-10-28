# Tasks

## 1. Requisitos y base
- [x] 1.1 Confirmar SHA main/P11 integrado, Benjamín y alcance; releer Issue #48 y comentarios.
- [x] 1.2 Registrar propuesta, requisitos, diseño y matriz de pruebas revisada antes de implementar.
- [x] 1.3 Ejecutar baseline actual en PostgreSQL 16 aislado: 75 suites / 736 pruebas; build/Prisma y siete migraciones.

## 2. Implementación (CA1–6)
- [x] 2.1 Configuración central sin defaults y guard/decorador de permisos; proteger diez rutas existentes.
- [x] 2.2 Contrato Swagger/OpenAPI actualizado y exportación reproducible; preservar códigos funcionales.
- [x] 2.3 Configuración local/Compose con campos vacíos; cliente web con clave solo en memoria y errores 401/403.

## 3. Pruebas y secretos (CA7–8)
- [x] 3.1 Unitarias config/guard y matriz HTTP; PostgreSQL comprueba no efectos y contratos válidos.
- [x] 3.2 Suites heredadas autorizadas, builds, Prisma, cobertura >=80%, strict y diff.
- [x] 3.3 Crear secretos CI exclusivos cifrados sin mostrar valores; conservar evidencia de nombres.
- [ ] 3.4 Smoke HTTP/rotación, job con secrets explícitos y artefactos sin valores; verificar CI real y Swagger/UI.

## 4. Entrega (CA9)
- [x] 4.1 Documentar trazabilidad de criterios, resultados, límites, rotación y guía del profesor.
- [ ] 4.2 PR limpia contra main, solo BGallegos000 como revisor; verificar SHA/checks finales, sin fusionar/cerrar Issues manualmente.
