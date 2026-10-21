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

## Cobertura medida antes y después

Baseline: main `5e4d27c`, Node 24.19.0, PostgreSQL 16 en contenedor aislado, seis migraciones aplicadas sin modificarlas. Después de compilar el loader utilizado por HU-14: **70 suites / 690 pruebas aprobadas**, 42,052 s. Al principio se intentó ejecutar sin build y cuatro tests del loader fallaron por faltar dist; se corrigió la preparación y se repitió la suite completa. No se contabiliza ese intento como baseline válido.

Primera ejecución completa P11: **72 suites / 698 pruebas aprobadas**, 42,573 s; los ocho nuevos también pasaron dos ejecuciones dirigidas. Además, tres pruebas del reporter con node:test (se cuentan por separado). JUnit leído con un parser XML independiente: 698 casos, cero failures/errors/skipped; Cobertura XML válido.

| Métrica global | Antes | Con P11 | Mínimo |
| --- | ---: | ---: | ---: |
| Statements | 98,46 % | 98,71 % | 80 % |
| Branches | 93,31 % | 93,87 % | 80 % |
| Functions | 99,05 % | 99,05 % | 80 % |
| Lines | 98,41 % | 98,67 % | 80 % |

1. SourceCaptureService: el baseline muestra sin cubrir las líneas 68 (parse inesperado) y 74 (conservar un SourceCaptureError existente). U02 cubre 68; líneas 94,87 % → 97,43 %. La hipótesis preliminar de que fetch también estaba descubierto se corrigió al leer la medición: U01 agrega comprobaciones de corte y liberación, pero no aumenta esa línea ya cubierta. Propuesta futura: el colaborador entrega un SourceCaptureError y comprobar identidad exacta, sin doble envoltura.
2. rss-only-parser: baseline sin cubrir 22/34/38. U03/U04 cubren comentario y declaración truncados (22/38); líneas 93,33 % → 97,77 %. Queda 34: límite inválido de `<?xml...`; caso adicional propuesto `<?xmlfoo?><rss/>` debe rechazar la declaración.

A04 también cubre la propagación de errores desconocidos del repositorio: líneas 96,42 % → 100 %. Los dos casos adicionales anteriores se proponen para trabajo posterior; no se presentan como ejecutados. Cobertura de líneas no equivale a requisitos satisfechos ni a aserciones correctas.

Seguimiento técnico: [Issue #46](https://github.com/HumWorldProyecto/proyecto/issues/46). OpenSpec strict válido, Prisma validate/migrate status y build correctos. Sin cambios en src, contratos, esquema, migraciones o dependencias.

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

[PR #47](https://github.com/HumWorldProyecto/proyecto/pull/47), creada como draft para esta demostración; base main `5e4d27c3fe89eeb3fd2fca26b3fa0799b11bbb04`. El diff solo contiene práctica, pruebas, reporter y configuración de informes; no incluye Sprint 4/HU-17 duplicada ni cambios en src, Prisma o dependencias.

| Evidencia | Commit completo | Resultado / ejecución |
| --- | --- | --- |
| Propuesta y revisión antes de código | `81fa440fd49e9314c9740d368830d5164f92bcb7` | Matriz y decisiones registradas |
| Implementación correcta inicial | `970ebe22cc7351a1449854f88993171899e0d31f` | [CI verde, run 39617864337](https://github.com/HumWorldProyecto/proyecto/actions/runs/39617864337): 698 aprobadas, artefacto 12354186432 |
| Única aserción incorrecta, 200 → 404 | `81a26f30f119c55f3bceb35fa6c5d6e2eb98eac2` | [CI rojo, run 39618380936](https://github.com/HumWorldProyecto/proyecto/actions/runs/39618380936): 697 aprobadas / 1 fallida, artefacto 12353682667 |

Caso fallido: `P11-A02: ordena por fecha de creación y filtra ambos estados exactamente`, sources-regression.api.spec.ts:80. Tanto local (7/8, exit 1) como remoto (697/698, exit 1): **Expected: 404 / Received: 200**. En el run rojo, backend-tests falla en el paso de pruebas; el paso Publicar informes se ejecuta y termina success por `if: always()`. Se descargaron logs y ZIP de ambos runs y se validaron sus XML independientemente: JUnit rojo tiene exactamente un failure A02 y cero errors/skipped; JUnit inicial, 698 casos sin fallos. Cobertura XML presente y válido también en el fallo.

La corrección restaura 200; no cambia la API ni oculta pruebas. No se usa continue-on-error, test.skip ni reducción de cobertura. La restauración y su ejecución verde se registrarán tras verificarlas. No fusionar la demostración ni cerrar manualmente la Issue. La protección actual de main exige revisión, pero no enumera checks obligatorios: CI rojo demuestra detección, no una regla de bloqueo por checks.

En Actions: abrir la ejecución enlazada → backend-tests → Ejecutar pruebas → comprobar nombre del caso y Expected/Received; descargar «informes-pruebas-backend» en Artifacts y abrir JUnit/XML. Los artefactos caducan a los siete días; los enlaces a runs/logs y SHA quedan en la documentación.

## Revisión crítica de la asistencia

Codex propuso los casos; contrastó códigos HTTP, tipos y dependencias con el código y OpenSpec antes de implementarlos. Se descartaron falsas unitarias con HTTP y cambios del producto para que una expectativa inventada pasara. La aserción incorrecta fue intencional y se conserva su evidencia. Si el docente exige una sesión específicamente con Copilot, el equipo debe realizarla y registrar su revisión: no se inventa esa participación.
