# P11 — Pruebas automáticas aplicadas a HumWorld

Fuente: material docente «P11 - Pruebas automatizadas.pdf», 7 páginas, leído completo el 21-10-2026. Se adopta su flujo, no los comandos Python ni el dominio Persona de AGENDA. Se mantiene Jest/NestJS/PostgreSQL según ADR-002/005. La PR #45 de Sprint 4 sigue independiente.

## Propuesta y revisión técnica previa

Revisión por Codex en rol PO/arquitecto, antes de implementar: se contrastaron los ocho casos con OpenSpec y la suite de main `5e4d27c`. Se descartó copiar 422/IDs numéricos de AGENDA, duplicar los casos básicos ya existentes o presentar pruebas HTTP como unitarias. Se seleccionaron errores de colaboradores no cubiertos y regresiones entre historias. El usuario autorizó aplicar P11; no se atribuye una aprobación de estos casos a un integrante ni se simula haber usado Copilot. La revisión humana y validación docente de esta adaptación permanecen pendientes en la PR.

| ID nuevo | Escenario / requisito vigente | Preparación y entrada | Resultado esperado | Tipo y aislamiento |
| --- | --- | --- | --- | --- |
| P11-U01 | captura-automatica-rss: aislamiento de fallos por fuente | fetcher rechaza un Error no tipado | unexpected; no parse/output; libera guard | Unitaria: todos los colaboradores son dobles |
| P11-U02 | captura-automatica-rss: RSS inválido y aislamiento | parser rechaza un Error no tipado | unexpected; no output; libera guard | Unitaria: todos los colaboradores son dobles |
| P11-U03 | captura-automatica-rss: uso exclusivo de RSS | comentario XML inicial truncado | RssParseError; no acepta documento parcial | Unitaria: función pura, sin red/DB |
| P11-U04 | captura-automatica-rss: uso exclusivo de RSS | declaración XML inicial sin cierre | RssParseError | Unitaria: función pura, sin red/DB |
| P11-A01 | gestion-crud-rss: creación, unicidad y consulta | HTTPS con host mayúscula/puerto 443, segunda URL canónica | 201, recuperación correcta y duplicado 409 sin segunda fila | API + integración real PostgreSQL; accesibilidad remota sustituida |
| P11-A02 | gestion-crud-rss: listado completo/filtro | tres fuentes con fechas distintas y estado mixto | 200, orden por creación y filtro activo/inactivo exactos | API + PostgreSQL, fechas fijas por fixture |
| P11-A03 | gestion-crud-rss: actualización y noticias conservadas; HU-06/16 | PATCH URL de fuente con noticia analizada/IPTC | fuente cambia, noticia/metadatos/IPTC/sentimiento intactos | API + PostgreSQL; snapshot antes/después |
| P11-A04 | gestion-crud-rss: contrato de errores; repositorio | escritura Prisma lanza error inesperado | 500 genérico sin detalle interno ni fila nueva | API con fallo de escritura inyectado; no se llama unitaria |

Los ocho casos usan Arrange/Act/Assert. Son positivos (registro/listado/conservación), negativos (duplicado/fallos) y límites (XML truncado/orden fijo). No modifican requisitos ni producción.

## Correspondencia con la lista PA del ejemplo

PA-01/02 → alta RSS válida 201 / URL inválida 400; PA-03 → colección vacía 200; PA-04 → múltiples fuentes ordenadas; PA-05/06 → fuente existente 200/inexistente 404. PA-07 no se copia: los IDs de fuentes son strings y su contrato no exige números positivos. Estos casos básicos ya existen en test/sources/sources.e2e.spec.ts; los ocho nuevos no se presentan como todos los tests existentes.

## Dos zonas a analizar con cobertura

1. SourceCaptureService: salidas no tipadas de fetch y parse. La suite previa cubría errores tipados y fallo de output, pero no esas dos rutas. U01/U02 deben mejorar esas líneas y garantizar liberación del guard.
2. rss-only-parser: comentarios/declaración XML inicial sin cierre. U03/U04 deben cubrir esas defensas; no se inventan entradas imposibles para alcanzar 100 %.

El informe antes/después y la evidencia remota se añadirán después de ejecutar. Cobertura de líneas no equivale a requisitos satisfechos ni a aserciones correctas.

## Reproducción

Usar Node 24, npm, Docker y PostgreSQL 16 **exclusivo de pruebas**. Las suites heredadas limpian tablas; no utilizar una base del equipo. Desde raíz:

```sh
docker run --detach --rm --name humworld-p11-local -e POSTGRES_USER=humworld -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=humworld_p11_test -p 127.0.0.1:55441:5432 postgres:16-alpine
```

Definir `DATABASE_URL=postgresql://humworld@127.0.0.1:55441/humworld_p11_test?schema=public` en la terminal (PowerShell: `$env:DATABASE_URL='...'`; Bash: `export DATABASE_URL='...'`). Luego desde backend:

```sh
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run test:reporter
npm run test:ci
```

JUnit: backend/reports/junit.xml. Cobertura: backend/reports/coverage/cobertura-coverage.xml, coverage-summary.json y lcov-report/index.html. `reports/` se ignora en Git; Actions publica informes aunque falle la suite. Mantiene mínimo 80 % en statements/branches/functions/lines.

Los tests nuevos pueden repetirse con `npx jest --runInBand --testPathPattern=test/p11`. El pipeline ejecuta la suite completa; el filtro solo sirve para verificar aislamiento local. Detener únicamente el contenedor propio con `docker stop humworld-p11-local`.

## Demostración rojo → verde

Se documentarán Issue, PR draft, commit correcto inicial, commit con una única aserción incorrecta, run rojo, log esperado/obtenido y artefacto; después commit corregido y run verde sobre el SHA final. No se usa continue-on-error, test.skip ni cambios de cobertura para ocultar fallos. No fusionar la demostración ni cerrar manualmente la Issue.

En Actions: abrir la ejecución enlazada → backend-tests → Ejecutar pruebas → comprobar nombre del caso y Expected/Received; descargar «informes-pruebas-backend» en Artifacts y abrir JUnit/XML. Los artefactos caducan a los siete días; los enlaces a runs/logs y SHA quedan en la documentación.

## Revisión crítica de la asistencia

Codex propuso los casos; contrastó códigos HTTP, tipos y dependencias con el código y OpenSpec antes de implementarlos. Se descartaron falsas unitarias con HTTP y cambios del producto para que una expectativa inventada pasara. La aserción incorrecta será intencional y se conservará su evidencia. Si el docente exige una sesión específicamente con Copilot, el equipo debe realizarla y registrar su revisión: no se inventa esa participación.
