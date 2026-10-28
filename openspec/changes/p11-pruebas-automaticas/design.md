# Design

## Context

Se revisaron arquitectura, instrucciones, ADR-005, escenarios OpenSpec y pruebas actuales antes de seleccionar los ocho casos de docs/practicas/P11-pruebas-automaticas.md. La práctica usa AGENDA como ejemplo. No se cambia el baseline aprobado ni se copia su modelo Persona o sus códigos HTTP. La revisión humana se conserva como condición de fusión.

## Goals / Non-Goals

Verificar mejor reglas existentes y demostrar que los tests detectan una regresión en GitHub. No cambiar producción, resolver deuda tecnológica ajena, integrar Sprint 4 ni ejecutar pruebas sobre datos del equipo.

## Decisions

- Cuatro unitarias puras: dos errores inesperados de colaboradores de SourceCaptureService, con todos sus puertos/guard sustituidos; dos límites del preámbulo XML usando la función pura de validación. Ninguna usa Nest HTTP, red ni PostgreSQL.
- Cuatro pruebas API con Nest, Supertest y servicio/repositorio reales: canonicalización/duplicado; listado ordenado y filtro; actualización de fuente conservando noticia/IPTC/sentimiento; fallo inesperado de persistencia sin filtración. La última sustituye solo la escritura Prisma para provocar el fallo; se identifica como API con fallo inyectado, no unitaria ni integración de escritura real.
- Fixtures nuevas por caso y restore de mocks después de cada prueba. El módulo SourcesModule evita scheduler y llamadas de captura. Solo se sustituye accesibilidad remota; la normalización real sigue funcionando. PostgreSQL 16 en contenedor propio, puerto 55441, base humworld_p11_test; CI crea su propio servicio. No limpiar bases compartidas.
- Zona A: salida inesperada de parse en SourceCaptureService (línea 68); baseline confirma que fetch ya se ejercitaba, U01 fortalece sus aserciones. Queda sin cubrir la conservación de un SourceCaptureError existente (74). Zona B: comentarios/declaración XML inicial truncados en rss-only-parser (22/38); queda límite XML inválido (34). Medición antes/después y dos casos futuros propuestos en la guía; no fabricar caminos inalcanzables para perseguir 100 %.
- Mantener la salida estándar de Jest y añadir un reporter local Node sin dependencias que use su API onRunComplete. Escribe JUnit con casos, tiempo, failures/errors/skipped y escape XML; incluye errores de carga de suite. Añadir tests del formato con node:test y validación XML independiente. Si no puede escribir el informe, el reporter hace fallar el run mediante getLastError. No absorbe el estado de fallo de las pruebas.
- Cobertura nativa de Jest/Istanbul: text, json, json-summary, lcov, cobertura y HTML bajo reports/coverage. Umbrales 80 en las cuatro métricas, sin reducir exclusiones. JUnit en reports/junit.xml. `test:ci` reproduce la ejecución que usa Actions. Glob relativo corrige descubrimiento en Windows dentro de directorios .codex sin omitir pruebas.
- Actions conserva pull_request/main y push/main; solo amplía backend-tests con reporter y upload-artifact if: always(). Artefactos con 7 días de retención, mínimos permisos contents:read. No se introducen acciones de aprobación o fusión.
- PR propia contra main, inicialmente draft. Primero verificar ejecución verde; luego cambiar una única expectativa de estado 200 a 404, comprobar fallo local y Actions failure con artefacto; corregir y volver a verde. No usar continue-on-error, skips, filtros para ocultar el fallo ni reducción de cobertura. Registrar SHA y run IDs antes de corregir.

## Risks / Trade-offs

- P11 requiere evidencia de fallo; afecta solo la rama draft, nunca main ni PR #45.
- Reporter propio pequeño -> tests de serialización y XML, captura de errores de suite e informe fallido descargable. Evita añadir stack/dependencias por el ejercicio.
- Fixtures globales heredadas -> maxWorkers:1 y base descartable exclusiva.
- No se dispone aquí de una sesión de Copilot ni de revisión humana previa de estos ocho casos -> documentar revisión técnica por Codex y autorización del usuario, y dejar validación humana de la adaptación docente en la PR. Nunca atribuir aprobación humana ficticia.

## Verification

Línea base completa, ocho casos dirigidos, regresión completa con cobertura, ejecución repetida dirigida para comprobar aislamiento, build/Prisma, strict OpenSpec, pruebas del reporter y lectura XML. Evidencia local y remota rojo/verde. Comprobar artifact JUnit/Cobertura y diff sin src, esquema/migraciones, frontend ni contenidos P10. Ninguna historia se marca Done por esta práctica técnica.
