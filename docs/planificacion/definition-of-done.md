# Definition of Done (DoD)

Esta Definition of Done se redacta como acuerdo del Equipo 5 y debe ser validada por sus integrantes. Una historia de usuario solo puede considerarse **Done** cuando:

1. Sus criterios de aceptación están satisfechos.
2. Cuando corresponde, la propuesta, especificación, diseño y tareas de OpenSpec fueron revisados antes de la implementación.
3. La implementación respeta `docs/architecture.md` y los ADR vigentes.
4. Existen pruebas automáticas adecuadas al cambio.
5. La suite de tests está verde.
6. La cobertura global es igual o superior al 80 %.
7. El build está verde.
8. Las migraciones y Prisma fueron verificados cuando se modificó la persistencia.
9. La documentación de `/docs`, los ADR y OpenSpec están actualizados cuando corresponde.
10. No se introdujeron secretos en el repositorio.
11. No quedan vulnerabilidades críticas conocidas detectadas por los controles de calidad integrados.
12. Existe un Pull Request.
13. El Pull Request fue revisado por otra persona.
14. La integración continua está verde.
15. La integración a `main` mantiene `main` estable.

## SonarQube/SonarCloud

El cierre Sprint 5 incorpora una comprobación **local** reproducible de SonarQube con [evidencia y límites](../calidad/sonar-sprint5.md). Su gate pasó y se exige cobertura >=80% y ausencia de vulnerabilidades críticas en ese chequeo. No está conectado como gate automático de GitHub; esa integración permanente y el tratamiento humano de los avisos/deuda alta deben acordarse antes de afirmarlos como condiciones automáticas de CI. No se simulan aprobaciones ni se relajan reglas para marcar Done.
