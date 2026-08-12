# Política de contribución — HumWorld Equipo 5

## Flujo de trabajo Git

Todo integrante del Equipo 5 debe trabajar mediante ramas y Pull Requests.

1. No se deben realizar cambios directamente sobre `main`.
2. Todo cambio debe desarrollarse en una rama independiente.
3. Utilizar nombres de rama como:
   - `feature/<descripcion>`
   - `fix/<descripcion>`
   - `docs/<descripcion>`
   - `chore/<descripcion>`
4. Todo cambio debe integrarse mediante un Pull Request hacia `main`.
5. El Pull Request debe ser revisado por al menos otro integrante del equipo.
6. El autor no debe considerar suficiente su propia revisión.
7. GitHub Actions debe finalizar correctamente antes de realizar el merge.
8. Las observaciones de la revisión deben resolverse antes del merge.
9. Después del merge, la rama de trabajo debe eliminarse.
10. Esta política también se aplica a los Owners de la organización.

## Protección de main

Se intentó configurar protección automática de la rama `main`.

GitHub informó que Protected Branches / Rulesets no están disponibles
para este repositorio privado con el plan actual.

Por este motivo, mientras esta limitación exista, el cumplimiento del
flujo de Pull Requests será una política obligatoria del Equipo 5.

## Flujo esperado

branch -> Pull Request -> revisión de otro integrante ->
GitHub Actions correcto -> merge a main -> eliminación de rama
