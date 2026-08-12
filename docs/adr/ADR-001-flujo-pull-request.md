# ADR-001 — Integración mediante Pull Requests

## Contexto

HumWorld utiliza GitHub como fábrica de software y requiere trazabilidad,
revisión de cambios e integración continua.

Se intentó proteger automáticamente la rama `main`, pero GitHub indicó
que esta funcionalidad no está disponible para este repositorio privado
con el plan actual.

## Decisión

El Equipo 5 adopta el siguiente flujo obligatorio:

rama -> Pull Request -> revisión de otro integrante ->
GitHub Actions correcto -> merge a main.

La política también se aplica a los Owners.

## Consecuencias

### Positivas

- Mayor trazabilidad.
- Revisión humana de los cambios.
- Integración con GitHub Actions.
- Menor riesgo de incorporar cambios defectuosos.

### Limitación

GitHub no puede impedir técnicamente un push directo a `main` con la
configuración actual, por lo que el cumplimiento depende de la disciplina
del equipo mientras no exista protección automática disponible.
